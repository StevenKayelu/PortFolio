import crypto from "crypto";
import { prisma } from "../config/prisma.js";
import { audit } from "../services/audit.service.js";
import { notifyNewLead, notifyAssignment } from "../services/mail.service.js";
import { SCOPES, assertBrandScope, brandFilter, forbidden } from "../services/brandAccess.service.js";

/**
 * Enquiries become structured Leads routed to a brand (report §05).
 * The brand is decided here from the enquiry type and the site it came
 * from — never taken from the client — so a visitor cannot drop leads
 * into an arbitrary brand's queue.
 */
const ROUTING = {
  steven: { CAREER: "steven", COLLABORATION: "steven", GENERAL: "steven", QUOTE: "solutions", PARTNERSHIP: "devegen" },
  devegen: { QUOTE: "solutions", PARTNERSHIP: "devegen", GENERAL: "devegen", CAREER: "steven", COLLABORATION: "devegen" },
};

const SOURCE = { steven: "stevenkayelu.online", devegen: "devegenventures.com" };

function hashIp(ip) {
  const salt = process.env.LEAD_IP_SALT || process.env.JWT_ACCESS_SECRET || "";
  return ip ? crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32) : null;
}

function newReference() {
  // e.g. DV-7K3QX9 — short enough to quote on the phone, no ambiguous characters
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = crypto.randomBytes(6);
  return `DV-${[...bytes].map((b) => alphabet[b % alphabet.length]).join("")}`;
}

export async function submitEnquiry(req, res, next) {
  try {
    const { site, type, website, consent, service, timeline, budget, ...contact } = req.body;

    // Honeypot filled: answer like a success so bots learn nothing, store nothing.
    if (website) return res.status(201).json({ message: "Enquiry received.", reference: newReference() });

    const brand = await prisma.brand.findUnique({ where: { key: ROUTING[site][type] } });
    if (!brand) {
      const err = new Error("Enquiry routing is not configured.");
      err.status = 503;
      err.publicMessage = "Enquiries are temporarily unavailable. Please email us instead.";
      throw err;
    }

    const details = Object.fromEntries(Object.entries({ service, timeline, budget }).filter(([, v]) => v));
    const lead = await prisma.lead.create({
      data: {
        reference: newReference(),
        type,
        ...contact,
        details: Object.keys(details).length ? details : undefined,
        source: SOURCE[site],
        consentAt: new Date(),
        ipHash: hashIp(req.ip),
        brandId: brand.id,
        activities: { create: { kind: "CREATED", body: `Received via ${SOURCE[site]}` } },
      },
      select: { reference: true, type: true, name: true, email: true, organization: true, details: true, message: true },
    });

    notifyNewLead(lead, brand);
    res.status(201).json({ message: "Enquiry received.", reference: lead.reference });
  } catch (err) {
    next(err);
  }
}

// ------------------------------------------------------------------- admin

const leadListSelect = {
  id: true, reference: true, type: true, status: true, name: true, email: true, organization: true,
  source: true, createdAt: true, updatedAt: true,
  brand: { select: { id: true, key: true, name: true } },
  assignedTo: { select: { id: true, name: true } },
};

export async function listLeads(req, res, next) {
  try {
    const { status, type, brand, search, page, pageSize } = req.validQuery;
    const where = {
      deletedAt: null,
      ...brandFilter(req.brandAccess, SCOPES.leads),
      ...(status ? { status } : { status: { notIn: ["SPAM", "ARCHIVED"] } }),
      ...(type ? { type } : {}),
      ...(brand ? { brand: { key: brand } } : {}),
      ...(search ? { OR: [{ name: { contains: search } }, { email: { contains: search } }, { reference: { contains: search } }, { organization: { contains: search } }] } : {}),
    };
    const [items, total, counts] = await Promise.all([
      prisma.lead.findMany({ where, select: leadListSelect, orderBy: { createdAt: "desc" }, take: pageSize, skip: (page - 1) * pageSize }),
      prisma.lead.count({ where }),
      prisma.lead.groupBy({ by: ["status"], where: { deletedAt: null, ...brandFilter(req.brandAccess, SCOPES.leads) }, _count: true }),
    ]);
    res.json({ items, total, page, pageSize, statusCounts: Object.fromEntries(counts.map((c) => [c.status, c._count])) });
  } catch (err) {
    next(err);
  }
}

async function findScopedLead(req) {
  const lead = await prisma.lead.findUnique({
    where: { id: req.params.id },
    include: {
      brand: { select: { id: true, key: true, name: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      activities: { orderBy: { createdAt: "asc" }, include: { user: { select: { id: true, name: true } } } },
    },
  });
  // Respond 404 rather than 403 for out-of-scope leads, so IDs can't be probed.
  if (!lead || lead.deletedAt) {
    const err = new Error("Lead not found.");
    err.status = 404;
    err.publicMessage = "Lead not found.";
    throw err;
  }
  try {
    assertBrandScope(req.brandAccess, lead.brandId, SCOPES.leads);
  } catch {
    const err = new Error("Lead not found.");
    err.status = 404;
    err.publicMessage = "Lead not found.";
    throw err;
  }
  return lead;
}

export async function getLead(req, res, next) {
  try {
    const { ipHash, ...lead } = await findScopedLead(req);
    res.json(lead);
  } catch (err) {
    next(err);
  }
}

export async function updateLead(req, res, next) {
  try {
    const lead = await findScopedLead(req);
    const { status, assignedToId } = req.body;
    const activities = [];

    if (assignedToId) {
      // The assignee must be able to see this brand's leads.
      const assignee = await prisma.user.findUnique({
        where: { id: assignedToId },
        select: { id: true, name: true, email: true, role: true, isActive: true, brandRoles: { where: { brandId: lead.brandId } } },
      });
      const allowed = assignee?.isActive && (assignee.role === "SUPER_ADMIN" || SCOPES.leads.includes(assignee.brandRoles[0]?.scope));
      if (!allowed) throw Object.assign(forbidden("That person can't be assigned leads for this brand."), { status: 400 });
      activities.push({ kind: "ASSIGNMENT", userId: req.user.sub, body: `Assigned to ${assignee.name}` });
      if (assignee.id !== lead.assignedToId) notifyAssignment(lead, assignee, req.user.sub);
    } else if (assignedToId === null && lead.assignedToId) {
      activities.push({ kind: "ASSIGNMENT", userId: req.user.sub, body: "Unassigned" });
    }
    if (status && status !== lead.status) {
      activities.push({ kind: "STATUS_CHANGE", userId: req.user.sub, fromStatus: lead.status, toStatus: status });
    }

    const updated = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        ...(status ? { status } : {}),
        ...(assignedToId !== undefined ? { assignedToId } : {}),
        activities: { create: activities },
      },
      select: leadListSelect,
    });
    await audit(req, "UPDATE", "Lead", lead.id, { status, assignedToId });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function addLeadNote(req, res, next) {
  try {
    const lead = await findScopedLead(req);
    const activity = await prisma.leadActivity.create({
      data: { leadId: lead.id, userId: req.user.sub, kind: "NOTE", body: req.body.body },
      include: { user: { select: { id: true, name: true } } },
    });
    res.status(201).json(activity);
  } catch (err) {
    next(err);
  }
}

/** Converts a legacy ContactMessage into a Lead (report §07). Idempotent. */
export async function convertContactMessage(req, res, next) {
  try {
    const message = await prisma.contactMessage.findUnique({ where: { id: req.params.messageId } });
    if (!message || message.deletedAt) return res.status(404).json({ error: "Message not found." });

    const existing = await prisma.lead.findUnique({ where: { contactMessageId: message.id }, select: { id: true, reference: true } });
    if (existing) return res.json(existing);

    const brand = await prisma.brand.findUnique({ where: { key: req.body.brandKey } });
    if (!brand) return res.status(400).json({ error: "Unknown brand." });
    assertBrandScope(req.brandAccess, brand.id, SCOPES.leads);

    const lead = await prisma.lead.create({
      data: {
        reference: newReference(),
        type: req.body.type,
        name: message.name,
        email: message.email,
        message: [message.subject, message.message].filter(Boolean).join("\n\n"),
        source: "legacy contact form",
        consentAt: null, // the legacy form had no consent checkbox
        brandId: brand.id,
        contactMessageId: message.id,
        activities: { create: { kind: "CREATED", userId: req.user.sub, body: "Converted from a contact form message" } },
      },
      select: { id: true, reference: true },
    });
    await audit(req, "CONVERT", "ContactMessage", message.id, { leadId: lead.id });
    res.status(201).json(lead);
  } catch (err) {
    next(err);
  }
}
