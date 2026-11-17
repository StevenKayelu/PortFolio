import crypto from "crypto";
import sharp from "sharp";
import { prisma } from "../config/prisma.js";
import { audit } from "../services/audit.service.js";
import { savePrivateFile, readPrivateFile, deletePrivateFile } from "../services/storage.service.js";

/**
 * Business registration & compliance (PACRA, ZICTA, data protection…).
 * Facts only are public: name, authority, number, dates and how to verify.
 * The documents themselves (which can list directors, shareholders, ID
 * numbers and addresses) are private, super-admin only.
 */

const isValid = (c, now = new Date()) => !c.expiresAt || c.expiresAt > now;

const PUBLIC_CREDENTIAL = {
  id: true, type: true, title: true, authority: true, referenceNumber: true, issuedAt: true, expiresAt: true,
  verificationUrl: true, verificationNote: true, displayOrder: true,
};

export async function getCompliance(req, res, next) {
  try {
    const now = new Date();
    const orgs = await prisma.organization.findMany({
      where: { credentials: { some: { isPublic: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } } },
      orderBy: { legalName: "asc" },
      select: {
        legalName: true, tradingName: true, registrationType: true,
        brands: { where: { status: "PUBLISHED" }, select: { key: true, name: true } },
        credentials: {
          where: { isPublic: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
          orderBy: [{ displayOrder: "asc" }, { issuedAt: "asc" }],
          select: PUBLIC_CREDENTIAL,
        },
      },
    });
    res.set("Cache-Control", "public, max-age=300");
    res.json({ organizations: orgs });
  } catch (err) {
    next(err);
  }
}

// ------------------------------------------------------- admin (super only)

function toAdmin({ originalKey, ...c }) {
  const now = new Date();
  const daysLeft = c.expiresAt ? Math.ceil((c.expiresAt - now) / 86400000) : null;
  return {
    ...c, hasOriginal: Boolean(originalKey), daysLeft,
    state: !isValid(c, now) ? "EXPIRED" : daysLeft !== null && daysLeft <= 60 ? "RENEW_SOON" : "VALID",
  };
}

export async function adminListOrganizationsWithCredentials(req, res, next) {
  try {
    const orgs = await prisma.organization.findMany({
      orderBy: { legalName: "asc" },
      include: {
        brands: { select: { id: true, key: true, name: true } },
        credentials: { orderBy: [{ displayOrder: "asc" }, { issuedAt: "asc" }] },
      },
    });
    res.json(orgs.map((o) => ({ ...o, credentials: o.credentials.map(toAdmin) })));
  } catch (err) {
    next(err);
  }
}

export async function adminCreateCredential(req, res, next) {
  try {
    const org = await prisma.organization.findUnique({ where: { id: req.params.orgId }, select: { id: true } });
    if (!org) return res.status(404).json({ error: "Organisation not found." });
    const credential = await prisma.organizationCredential.create({ data: { ...req.body, organizationId: org.id } });
    await audit(req, "CREATE", "OrganizationCredential", credential.id, { type: credential.type });
    res.status(201).json(toAdmin(credential));
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateCredential(req, res, next) {
  try {
    const existing = await prisma.organizationCredential.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Not found." });
    const data = { ...req.body };
    // A new expiry date (a renewal) restarts the reminder cycle.
    if (data.expiresAt !== undefined && String(data.expiresAt) !== String(existing.expiresAt)) {
      data.reminder60SentAt = null;
      data.reminder30SentAt = null;
    }
    const credential = await prisma.organizationCredential.update({ where: { id: existing.id }, data });
    await audit(req, "UPDATE", "OrganizationCredential", existing.id, { fields: Object.keys(req.body) });
    res.json(toAdmin(credential));
  } catch (err) {
    next(err);
  }
}

export async function adminDeleteCredential(req, res, next) {
  try {
    const existing = await prisma.organizationCredential.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Not found." });
    await prisma.organizationCredential.delete({ where: { id: existing.id } });
    await deletePrivateFile(existing.originalKey);
    await audit(req, "DELETE", "OrganizationCredential", existing.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

const bad = (message) => Object.assign(new Error(message), { status: 400, publicMessage: message });

/** Stores the document privately. There is no public preview: facts only. */
export async function adminUploadCredentialDocument(req, res, next) {
  try {
    const existing = await prisma.organizationCredential.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Not found." });
    const file = req.file;
    if (!file) throw bad("Choose the document to upload.");
    if (file.mimetype === "application/pdf") {
      if (file.buffer.subarray(0, 5).toString("latin1") !== "%PDF-") throw bad("That file isn't a valid PDF.");
    } else if (["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      const meta = await sharp(file.buffer).metadata().catch(() => null);
      if (!meta || !["jpeg", "png", "webp"].includes(meta.format)) throw bad("That image couldn't be read.");
    } else {
      throw bad("Upload a PDF, JPEG, PNG or WebP file.");
    }
    const ext = file.mimetype === "application/pdf" ? "pdf" : file.mimetype.split("/")[1].replace("jpeg", "jpg");
    const { key } = await savePrivateFile({ buffer: file.buffer, mimetype: file.mimetype, filename: `compliance-${existing.id}-${crypto.randomBytes(8).toString("hex")}.${ext}` });
    const updated = await prisma.organizationCredential.update({
      where: { id: existing.id },
      data: {
        originalKey: key, originalMime: file.mimetype, originalSize: file.size,
        originalName: (file.originalname || `document.${ext}`).replace(/[^\w.\- ]+/g, "_").slice(0, 150),
      },
    });
    if (existing.originalKey && existing.originalKey !== key) await deletePrivateFile(existing.originalKey);
    await audit(req, "UPLOAD", "OrganizationCredential", existing.id, { mime: file.mimetype, size: file.size });
    res.status(201).json(toAdmin(updated));
  } catch (err) {
    next(err);
  }
}

export async function adminDownloadCredentialDocument(req, res, next) {
  try {
    const existing = await prisma.organizationCredential.findUnique({ where: { id: req.params.id } });
    if (!existing?.originalKey) return res.status(404).json({ error: "No document is stored for this item." });
    const buffer = await readPrivateFile(existing.originalKey);
    await audit(req, "DOWNLOAD", "OrganizationCredential", existing.id);
    res.set({
      "Content-Type": existing.originalMime || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${(existing.originalName || "document").replace(/"/g, "")}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}
