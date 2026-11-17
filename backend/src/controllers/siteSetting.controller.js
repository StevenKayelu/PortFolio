import { prisma } from "../config/prisma.js";
import { audit } from "../services/audit.service.js";
import { handleUpload } from "../services/upload.service.js";

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
