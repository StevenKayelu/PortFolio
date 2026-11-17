import crypto from "crypto";
import { prisma } from "../config/prisma.js";
import { audit } from "../services/audit.service.js";
import { sendMail } from "../services/mail.service.js";
import { notifyStaff } from "../services/realtime.service.js";
import { SCOPES, assertBrandScope, brandFilter } from "../services/brandAccess.service.js";

/**
 * Invite-only testimonials. Staff create a private link for one client;
 * only that link can submit, edit or withdraw a testimonial, so every
 * published quote comes from someone the business actually worked with.
 *
 * The link token is 192 random bits and only its SHA-256 hash is stored.
 * The consent wording is defined here (versioned) and stored verbatim
 * with each submission, so the record shows exactly what was agreed.
 */

export const CONSENT_VERSION = "2026-11-v1";
const consentWording = (brandName) => ({
  publish: `I agree that ${brandName} may publish this testimonial on its websites together with my name, role and organisation. I can withdraw this at any time using this link.`,
  contact: `I agree that ${brandName} may keep my email address and contact me about this testimonial.`,
});

const SITE_FOR_BRAND = { steven: "steven", devegen: "devegen", solutions: "devegen" };
const DOMAIN = { steven: "https://stevenkayelu.online", devegen: "https://devgenventures.com" };

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
const err = (status, message) => Object.assign(new Error(message), { status, publicMessage: message });

/** Public link on the brand's own site; on non-production, the admin's origin with ?site=. */
function linkFor(brandKey, token, req) {
  const site = SITE_FOR_BRAND[brandKey] || "steven";
  if (process.env.NODE_ENV === "production") return `${DOMAIN[site]}/testimonial/${token}`;
  const origin = req.headers.origin || process.env.CLIENT_URL || "http://localhost:5173";
  return `${origin}/testimonial/${token}?site=${site}`;
}

function inviteStatus(invite) {
  if (invite.revokedAt) return "REVOKED";
  const t = invite.testimonial;
  if (t?.withdrawnAt) return "WITHDRAWN";
  if (t?.isApproved) return "PUBLISHED";
  if (invite.submittedAt) return "AWAITING_APPROVAL";
  if (invite.expiresAt < new Date()) return "EXPIRED";
  return "SENT";
}

async function staffToNotify(brandId) {
  const users = await prisma.user.findMany({
    where: { isActive: true, deletedAt: null, OR: [{ role: "SUPER_ADMIN" }, { brandRoles: { some: { brandId, scope: "ADMIN" } } }] },
    select: { email: true },
  });
  return users.map((u) => u.email);
}

// ------------------------------------------------------------------- admin

export async function createInvite(req, res, next) {
  try {
    const { clientName, clientEmail, brandId, projectId, expiresInDays, sendEmail } = req.body;
    assertBrandScope(req.brandAccess, brandId, SCOPES.edit);
    const brand = await prisma.brand.findUnique({ where: { id: brandId } });
    if (!brand) throw err(400, "Unknown brand.");

    const token = crypto.randomBytes(24).toString("base64url");
    const invite = await prisma.testimonialInvite.create({
      data: {
        tokenHash: hashToken(token), clientName, clientEmail, brandId, projectId: projectId || null,
        expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000), createdById: req.user.sub,
      },
      include: { project: { select: { title: true } } },
    });
    const link = linkFor(brand.key, token, req);

    // Staff-initiated, to an address staff entered: not an open relay.
    let emailed = false;
    if (sendEmail) {
      const inviter = await prisma.user.findUnique({ where: { id: req.user.sub }, select: { name: true, email: true } });
      emailed = await sendMail({
        to: clientEmail,
        replyTo: inviter?.email,
        subject: `${brand.name}: would you share a few words about working together?`,
        text: [
          `Hello ${clientName},`,
          "",
          `${inviter?.name || brand.name} would be grateful for a short testimonial about ${invite.project ? `"${invite.project.title}"` : `working with ${brand.name}`}.`,
          "",
          `Use this private link (valid until ${invite.expiresAt.toDateString()}):`,
          link,
          "",
          "You choose what to say, and nothing is published unless you agree. You can change or withdraw it later with the same link.",
        ].join("\n"),
      }).catch((e) => {
        console.error("Invite email failed:", e.message);
        return false;
      });
    }

    await audit(req, "CREATE", "TestimonialInvite", invite.id, { brandId, emailed });
    res.status(201).json({ id: invite.id, link, expiresAt: invite.expiresAt, emailed });
  } catch (e) {
    next(e);
  }
}

export async function listInvites(req, res, next) {
  try {
    const brandKey = typeof req.query.brand === "string" ? req.query.brand : null;
    const invites = await prisma.testimonialInvite.findMany({
      where: { ...brandFilter(req.brandAccess, SCOPES.edit), ...(brandKey ? { brand: { key: brandKey } } : {}) },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        brand: { select: { key: true, name: true } },
        project: { select: { title: true } },
        createdBy: { select: { name: true } },
        testimonial: { select: { id: true, isApproved: true, withdrawnAt: true } },
      },
    });
    res.json(invites.map(({ tokenHash, ...i }) => ({ ...i, status: inviteStatus(i) })));
  } catch (e) {
    next(e);
  }
}

export async function revokeInvite(req, res, next) {
  try {
    const invite = await prisma.testimonialInvite.findUnique({ where: { id: req.params.id } });
    if (!invite) throw err(404, "Invite not found.");
    assertBrandScope(req.brandAccess, invite.brandId, SCOPES.edit);
    // After submission the link is the client's way to edit or withdraw; keep it.
    if (invite.submittedAt) throw err(409, "The client has already responded, so their link stays active for changes or withdrawal. Unpublish the testimonial instead.");
    await prisma.testimonialInvite.update({ where: { id: invite.id }, data: { revokedAt: new Date() } });
    await audit(req, "REVOKE", "TestimonialInvite", invite.id);
    res.json({ message: "Link revoked." });
  } catch (e) {
    next(e);
  }
}

// ------------------------------------------------------------------ public

async function loadInvite(token, { forSubmission = false } = {}) {
  if (typeof token !== "string" || token.length < 20 || token.length > 64) throw err(404, "This link isn't valid.");
  const invite = await prisma.testimonialInvite.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { brand: true, project: { select: { title: true, slug: true } }, testimonial: true },
  });
  if (!invite || invite.revokedAt) throw err(404, "This link isn't valid. Ask the person who sent it for a new one.");
  if (forSubmission && !invite.submittedAt && invite.expiresAt < new Date()) {
    throw err(410, "This link has expired. Ask the person who sent it for a new one.");
  }
  return invite;
}

export async function getInviteForClient(req, res, next) {
  try {
    const invite = await loadInvite(req.params.token);
    const expired = !invite.submittedAt && invite.expiresAt < new Date();
    const t = invite.testimonial;
    res.set("Cache-Control", "no-store");
    res.set("X-Robots-Tag", "noindex");
    res.json({
      clientName: invite.clientName,
      brand: { key: invite.brand.key, name: invite.brand.name },
      project: invite.project,
      expiresAt: invite.expiresAt,
      expired,
      consent: { version: CONSENT_VERSION, ...consentWording(invite.brand.name) },
      submission: t
        ? {
            status: t.withdrawnAt ? "WITHDRAWN" : t.isApproved ? "PUBLISHED" : "AWAITING_APPROVAL",
            clientRole: t.clientRole, clientCompany: t.clientCompany, relationship: t.relationship,
            content: t.content, rating: t.rating, consentContact: Boolean(t.consentContactAt), updatedAt: t.updatedAt,
          }
        : null,
    });
  } catch (e) {
    next(e);
  }
}

export async function submitViaInvite(req, res, next) {
  try {
    const invite = await loadInvite(req.params.token, { forSubmission: true });
    const { clientRole, clientCompany, relationship, content, rating, consentContact } = req.body;
    const now = new Date();
    const wording = consentWording(invite.brand.name);
    const consentText = [
      `Consent ${CONSENT_VERSION}, given ${now.toISOString()}:`,
      `[x] ${wording.publish}`,
      `[${consentContact ? "x" : " "}] ${wording.contact}`,
    ].join("\n");

    const data = {
      clientName: invite.clientName, clientRole, clientCompany, relationship, content, rating,
      clientEmail: consentContact ? invite.clientEmail : null,
      consentPublishAt: now, consentContactAt: consentContact ? now : null, consentText,
      verified: true, brandId: invite.brandId, projectId: invite.projectId,
      // Any change needs a fresh approval; a resubmission after withdrawal re-grants consent.
      isApproved: false, isFeatured: false, withdrawnAt: null,
    };
    const firstTime = !invite.testimonial;
    await prisma.$transaction([
      invite.testimonial
        ? prisma.testimonial.update({ where: { id: invite.testimonial.id }, data })
        : prisma.testimonial.create({ data: { ...data, inviteId: invite.id } }),
      prisma.testimonialInvite.update({ where: { id: invite.id }, data: { submittedAt: invite.submittedAt ?? now } }),
    ]);

    staffToNotify(invite.brandId).then((to) => to.length && sendMail({
      to,
      subject: `${firstTime ? "New" : "Updated"} testimonial from ${invite.clientName} (${invite.brand.name})`,
      text: `${invite.clientName}${clientCompany ? `, ${clientCompany}` : ""} ${firstTime ? "left" : "updated"} a testimonial:\n\n"${content}"\n\nIt is waiting for approval in Admin → Testimonials.`,
    })).catch((e) => console.error("Testimonial notification failed:", e.message));

    notifyStaff({
      kind: "testimonial", brandId: invite.brandId, scopes: SCOPES.manage,
      title: `${firstTime ? "New" : "Updated"} testimonial · ${invite.brand.name}`, body: `${invite.clientName}: ${content}`, link: "/admin/testimonials",
    });
    res.status(firstTime ? 201 : 200).json({ status: "AWAITING_APPROVAL" });
  } catch (e) {
    next(e);
  }
}

/** Withdrawal unpublishes the quote and erases the client's words and details. */
export async function withdrawViaInvite(req, res, next) {
  try {
    const invite = await loadInvite(req.params.token);
    if (!invite.testimonial) throw err(404, "There's nothing to withdraw yet.");
    await prisma.testimonial.update({
      where: { id: invite.testimonial.id },
      data: {
        withdrawnAt: new Date(), isApproved: false, isFeatured: false,
        content: "", clientRole: null, clientCompany: null, relationship: null, clientEmail: null,
        consentPublishAt: null, consentContactAt: null,
        consentText: `${invite.testimonial.consentText || ""}\nWithdrawn ${new Date().toISOString()}.`,
      },
    });
    staffToNotify(invite.brandId).then((to) => to.length && sendMail({
      to,
      subject: `Testimonial withdrawn by ${invite.clientName} (${invite.brand.name})`,
      text: `${invite.clientName} withdrew their consent. The testimonial has been unpublished and its text deleted.`,
    })).catch((e) => console.error("Withdrawal notification failed:", e.message));
    res.json({ status: "WITHDRAWN" });
  } catch (e) {
    next(e);
  }
}
