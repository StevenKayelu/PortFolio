import crypto from "crypto";
import sharp from "sharp";
import { prisma } from "../config/prisma.js";
import { audit } from "../services/audit.service.js";
import { saveFile, deleteFile, savePrivateFile, readPrivateFile, deletePrivateFile } from "../services/storage.service.js";
import { makeCertificatePreview } from "../services/certificatePreview.service.js";

/**
 * Certificates: a watermarked preview is public; the original PDF/image is
 * private (admin download only). Each certificate links to the issuer's
 * own verification page where one exists, which is the real proof.
 */

// Issuer verification sites. LinkedIn only shows what the member typed, so it
// is recognised but never labelled as verification.
const VERIFIERS = [
  [/(^|\.)credly\.com$/, "Credly"],
  [/(^|\.)coursera\.org$/, "Coursera"],
  [/^learn\.microsoft\.com$/, "Microsoft Learn"],
  [/(^|\.)freecodecamp\.org$/, "freeCodeCamp"],
  [/(^|\.)netacad\.com$/, "Cisco Networking Academy"],
  [/(^|\.)udemy\.com$|^ude\.my$/, "Udemy"],
  [/(^|\.)edx\.org$/, "edX"],
  [/(^|\.)datacamp\.com$/, "DataCamp"],
  [/(^|\.)hackerrank\.com$/, "HackerRank"],
  [/^grow\.google$|(^|\.)skillshop\.(withgoogle|exceedlms)\.com$/, "Google"],
];

export function describeVerification(url) {
  if (!url) return null;
  let host;
  try { host = new URL(url).hostname.toLowerCase(); } catch { return null; }
  if (/(^|\.)linkedin\.com$/.test(host)) {
    return { provider: "LinkedIn", isIssuer: false, label: "View on LinkedIn", note: "LinkedIn shows what the member entered; it doesn't verify certificates." };
  }
  const match = VERIFIERS.find(([re]) => re.test(host));
  return match
    ? { provider: match[1], isIssuer: true, label: `Verify with ${match[1]}` }
    : { provider: host, isIssuer: true, label: "View issuer's record" };
}

function toPublic(c) {
  return {
    id: c.id, title: c.title, institution: c.institution, category: c.category, type: c.type,
    issueDate: c.issueDate, expiresAt: c.expiresAt, expired: Boolean(c.expiresAt && c.expiresAt < new Date()),
    credentialId: c.showCredentialId ? c.credentialId : null,
    credentialUrl: c.credentialUrl, verification: describeVerification(c.credentialUrl),
    previewUrl: c.imageUrl,
  };
}

const PUBLIC_WHERE = { deletedAt: null, isPublished: true };
const ORDER = [{ displayOrder: "asc" }, { issueDate: "desc" }];

export async function listPublicCertificates(req, res, next) {
  try {
    const items = await prisma.certificate.findMany({ where: PUBLIC_WHERE, orderBy: ORDER });
    res.json({ items: items.map(toPublic), total: items.length });
  } catch (err) {
    next(err);
  }
}

export async function getPublicCertificate(req, res, next) {
  try {
    const cert = await prisma.certificate.findFirst({ where: { id: req.params.id, ...PUBLIC_WHERE } });
    if (!cert) return res.status(404).json({ error: "Certificate not found." });
    res.json(toPublic(cert));
  } catch (err) {
    next(err);
  }
}

// ------------------------------------------------------------------- admin

function toAdmin({ originalKey, fileUrl, ...c }) {
  return { ...c, hasOriginal: Boolean(originalKey), legacyPublicFile: Boolean(fileUrl), previewUrl: c.imageUrl, verification: describeVerification(c.credentialUrl) };
}

export async function adminListCertificates(req, res, next) {
  try {
    const items = await prisma.certificate.findMany({ where: { deletedAt: null }, orderBy: ORDER });
    res.json({ items: items.map(toAdmin), total: items.length });
  } catch (err) {
    next(err);
  }
}

export async function adminSaveCertificate(req, res, next) {
  try {
    const cert = req.params.id
      ? await prisma.certificate.update({ where: { id: req.params.id }, data: req.body })
      : await prisma.certificate.create({ data: req.body });
    await audit(req, req.params.id ? "UPDATE" : "CREATE", "Certificate", cert.id);
    res.status(req.params.id ? 200 : 201).json(toAdmin(cert));
  } catch (err) {
    next(err);
  }
}

export async function adminDeleteCertificate(req, res, next) {
  try {
    const cert = await prisma.certificate.findUnique({ where: { id: req.params.id } });
    if (!cert || cert.deletedAt) return res.status(404).json({ error: "Certificate not found." });
    await prisma.certificate.update({ where: { id: cert.id }, data: { deletedAt: new Date(), isPublished: false } });
    // Remove the files too: a deleted certificate shouldn't leave copies behind.
    await deletePrivateFile(cert.originalKey);
    if (cert.imageUrl) await deleteFile(cert.imageUrl).catch(() => {});
    await audit(req, "DELETE", "Certificate", cert.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const bad = (message) => Object.assign(new Error(message), { status: 400, publicMessage: message });
const isPdf = (buf) => buf.subarray(0, 5).toString("latin1") === "%PDF-";

async function assertImage(buf, label) {
  try {
    const meta = await sharp(buf).metadata();
    if (!["jpeg", "png", "webp"].includes(meta.format)) throw new Error();
  } catch {
    throw bad(`${label} isn't a valid JPEG, PNG or WebP image.`);
  }
}

/**
 * multipart: original (PDF/JPEG/PNG/WebP, required) and, for PDFs, preview
 * (an image of page 1, rendered in the admin's browser).
 */
export async function adminUploadCertificateFile(req, res, next) {
  try {
    const cert = await prisma.certificate.findUnique({ where: { id: req.params.id } });
    if (!cert || cert.deletedAt) return res.status(404).json({ error: "Certificate not found." });
    const original = req.files?.original?.[0];
    const preview = req.files?.preview?.[0];
    if (!original) throw bad("Choose the certificate file to upload.");

    let previewSource;
    if (original.mimetype === "application/pdf") {
      if (!isPdf(original.buffer)) throw bad("That file isn't a valid PDF.");
      if (!preview || !IMAGE_TYPES.has(preview.mimetype)) throw bad("A preview image of the PDF's first page is required.");
      await assertImage(preview.buffer, "The preview");
      previewSource = preview.buffer;
    } else if (IMAGE_TYPES.has(original.mimetype)) {
      await assertImage(original.buffer, "The certificate");
      previewSource = original.buffer;
    } else {
      throw bad("Upload a PDF, JPEG, PNG or WebP file.");
    }

    const ext = original.mimetype === "application/pdf" ? "pdf" : original.mimetype.split("/")[1].replace("jpeg", "jpg");
    const { key } = await savePrivateFile({
      buffer: original.buffer, mimetype: original.mimetype,
      filename: `cert-${cert.id}-${crypto.randomBytes(8).toString("hex")}.${ext}`,
    });
    const { buffer } = await makeCertificatePreview(previewSource);
    const saved = await saveFile({ buffer, mimetype: "image/webp", filename: `cert-preview-${crypto.randomBytes(12).toString("hex")}.webp` });

    const updated = await prisma.certificate.update({
      where: { id: cert.id },
      data: {
        originalKey: key, originalMime: original.mimetype, originalSize: original.size,
        originalName: (original.originalname || `certificate.${ext}`).replace(/[^\w.\- ]+/g, "_").slice(0, 150),
        imageUrl: saved.url,
        fileUrl: null, // retire any legacy public download link
      },
    });
    // Replace, don't accumulate: remove the previous files.
    if (cert.originalKey && cert.originalKey !== key) await deletePrivateFile(cert.originalKey);
    if (cert.imageUrl) await deleteFile(cert.imageUrl).catch(() => {});

    await audit(req, "UPLOAD", "Certificate", cert.id, { mime: original.mimetype, size: original.size });
    res.status(201).json(toAdmin(updated));
  } catch (err) {
    next(err);
  }
}

export async function adminDownloadOriginal(req, res, next) {
  try {
    const cert = await prisma.certificate.findUnique({ where: { id: req.params.id } });
    if (!cert?.originalKey) return res.status(404).json({ error: "No original file is stored for this certificate." });
    const buffer = await readPrivateFile(cert.originalKey);
    await audit(req, "DOWNLOAD", "Certificate", cert.id);
    res.set({
      "Content-Type": cert.originalMime || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${(cert.originalName || "certificate").replace(/"/g, "")}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}
