import { prisma } from "../config/prisma.js";

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
    res.json(setting);
  } catch (err) {
    next(err);
  }
}
