import { prisma } from "../config/prisma.js";
import { audit } from "../services/audit.service.js";
import crypto from "crypto";
import sharp from "sharp";
import { handleUpload } from "../services/upload.service.js";
import { saveFile } from "../services/storage.service.js";

// SiteSetting is a deliberate escape hatch: a key/value JSON store for
// content that doesn't warrant its own relational table (hero copy,
// About page bio/mission/values, homepage stats, the tech-stack list).
// Everything that DOES have real relational shape — projects, blog
// posts, services, etc. — uses its own model instead of this.

export async function getSetting(req, res, next) {
  try {
    const setting = await prisma.siteSetting.findUnique({ where: { key: req.params.key } });
    if (!setting) return res.status(404).json({ error: `No setting found for "${req.params.key}".` });
    res.json(setting.value);
  } catch (err) {
    next(err);
  }
}

// GET /site-settings?keys=identity,stats,technologies — fetches several
// keys in one round trip, since the landing page needs ~5 of these.
export async function getSettingsBulk(req, res, next) {
  try {
    const keys = (req.query.keys || "").split(",").filter(Boolean);
    const settings = await prisma.siteSetting.findMany({ where: { key: { in: keys } } });
    const result = {};
    for (const s of settings) result[s.key] = s.value;
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function upsertSetting(req, res, next) {
  try {
    const setting = await prisma.siteSetting.upsert({
      where: { key: req.params.key },
      update: { value: req.body.value },
      create: { key: req.params.key, value: req.body.value },
    });
    await audit(req, "UPDATE", "SiteSetting", req.params.key);
    res.json(setting);
  } catch (err) {
    next(err);
  }
}

const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Uploads Steven's portrait (re-encoded to WebP, EXIF stripped) and stores
 * its URL on the identity setting. Photos only: no SVG or PDF here.
 */
async function mergeSetting(key, patch) {
  const current = await prisma.siteSetting.findUnique({ where: { key } });
  const value = { ...(current?.value || {}), ...patch };
  await prisma.siteSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
  return value;
}

const pngName = (label) => `${label}-${Date.now()}-${crypto.randomBytes(6).toString("hex")}.png`;

/**
 * Umbrella logo for the site headers. PNG/WebP/JPEG only (no SVG: it can
 * carry scripts). Trimmed of empty margins and kept with transparency.
 */
export async function uploadBrandingLogo(req, res, next) {
  try {
    if (!req.file || !PHOTO_TYPES.has(req.file.mimetype)) {
      return res.status(400).json({ error: "Choose a PNG (ideally with a transparent background), WebP or JPEG image." });
    }
    const meta = await sharp(req.file.buffer).metadata();
    if ((meta.width || 0) < 128 || (meta.height || 0) < 128) {
      return res.status(400).json({ error: "The logo is too small. Use at least 512 × 512 pixels." });
    }
    const buffer = await sharp(req.file.buffer).trim({ threshold: 1 }).resize(512, 512, { fit: "inside", withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer();
    const saved = await saveFile({ buffer, mimetype: "image/png", filename: pngName("logo") });
    const value = await mergeSetting("branding", { logo: saved.url });
    await audit(req, "UPLOAD", "SiteSetting", "branding.logo");
    res.status(201).json(value);
  } catch (err) {
    next(err);
  }
}

/** Favicon: one square image becomes the browser, phone home-screen and app icon sizes. */
export async function uploadBrandingFavicon(req, res, next) {
  try {
    if (!req.file || !PHOTO_TYPES.has(req.file.mimetype)) {
      return res.status(400).json({ error: "Choose a square PNG, WebP or JPEG image." });
    }
    const meta = await sharp(req.file.buffer).metadata();
    const ratio = (meta.width || 1) / (meta.height || 1);
    if (ratio < 0.9 || ratio > 1.1) return res.status(400).json({ error: "The favicon must be square (for example 512 × 512 pixels)." });
    if ((meta.width || 0) < 180) return res.status(400).json({ error: "The favicon is too small. Use at least 512 × 512 pixels." });

    const patch = {};
    for (const size of [32, 180, 192, 512]) {
      const buffer = await sharp(req.file.buffer).resize(size, size, { fit: "cover" }).png({ compressionLevel: 9 }).toBuffer();
      patch[`favicon${size}`] = (await saveFile({ buffer, mimetype: "image/png", filename: pngName(`favicon-${size}`) })).url;
    }
    const value = await mergeSetting("branding", patch);
    await audit(req, "UPLOAD", "SiteSetting", "branding.favicon");
    res.status(201).json(value);
  } catch (err) {
    next(err);
  }
}

export async function uploadIdentityPhoto(req, res, next) {
  try {
    if (!req.file || !PHOTO_TYPES.has(req.file.mimetype)) {
      return res.status(400).json({ error: "Choose a JPEG, PNG or WebP photo." });
    }
    const saved = await handleUpload(req.file);
    const current = await prisma.siteSetting.findUnique({ where: { key: "identity" } });
    const value = { ...(current?.value || {}), photo: saved.url, ...(req.body?.photoAlt ? { photoAlt: String(req.body.photoAlt).slice(0, 200) } : {}) };
    await prisma.siteSetting.upsert({ where: { key: "identity" }, update: { value }, create: { key: "identity", value } });
    await audit(req, "UPLOAD", "SiteSetting", "identity.photo");
    res.status(201).json({ photo: saved.url });
  } catch (err) {
    next(err);
  }
}
