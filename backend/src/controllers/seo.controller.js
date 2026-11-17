import { prisma } from "../config/prisma.js";
import { audit } from "../services/audit.service.js";
import { SCOPES, assertBrandScope, brandFilter } from "../services/brandAccess.service.js";

/**
 * Per-brand SEO overrides (report §03, §08 "SEO and settings").
 * The frontend has sensible defaults per brand; a SeoMeta row overrides
 * title/description/OG image/canonical/JSON-LD for one path on one brand.
 */

// Same rule as the frontend: /solutions/* on the Devegen site is DevGen Solutions.
export function brandKeyFor(site, path) {
  return site === "devegen" && (path === "/solutions" || path.startsWith("/solutions/")) ? "solutions" : site;
}

const normalize = (path) => (path.length > 1 ? path.replace(/\/+$/, "") : path);

export async function getSeoForPath(req, res, next) {
  try {
    const { site, path } = req.validQuery;
    const route = normalize(path);
    const meta = await prisma.seoMeta.findFirst({
      where: { route, brand: { key: brandKeyFor(site, route), status: "PUBLISHED" } },
      select: { title: true, description: true, keywords: true, ogImage: true, canonicalUrl: true, structuredData: true, noIndex: true },
    });
    res.set("Cache-Control", "public, max-age=300");
    if (!meta) return res.status(204).end();
    res.json(meta);
  } catch (err) {
    next(err);
  }
}

export async function adminListSeo(req, res, next) {
  try {
    const brandKey = typeof req.query.brand === "string" ? req.query.brand : null;
    const items = await prisma.seoMeta.findMany({
      where: { ...brandFilter(req.brandAccess, SCOPES.manage), ...(brandKey ? { brand: { key: brandKey } } : {}) },
      orderBy: [{ brandId: "asc" }, { route: "asc" }],
      include: { brand: { select: { id: true, key: true, name: true } } },
    });
    res.json({ items, total: items.length });
  } catch (err) {
    next(err);
  }
}

export async function adminSaveSeo(req, res, next) {
  try {
    const data = { ...req.body, ...(req.body.route ? { route: normalize(req.body.route) } : {}) };
    let existing = null;
    if (req.params.id) {
      existing = await prisma.seoMeta.findUnique({ where: { id: req.params.id } });
      if (!existing) return res.status(404).json({ error: "Not found." });
      assertBrandScope(req.brandAccess, existing.brandId, SCOPES.manage);
    }
    if (data.brandId) assertBrandScope(req.brandAccess, data.brandId, SCOPES.manage);
    const meta = existing
      ? await prisma.seoMeta.update({ where: { id: existing.id }, data })
      : await prisma.seoMeta.create({ data });
    await audit(req, existing ? "UPDATE" : "CREATE", "SeoMeta", meta.id, { route: meta.route });
    res.status(existing ? 200 : 201).json(meta);
  } catch (err) {
    next(err);
  }
}

export async function adminDeleteSeo(req, res, next) {
  try {
    const existing = await prisma.seoMeta.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Not found." });
    assertBrandScope(req.brandAccess, existing.brandId, SCOPES.manage);
    await prisma.seoMeta.delete({ where: { id: existing.id } });
    await audit(req, "DELETE", "SeoMeta", existing.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
