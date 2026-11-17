import { prisma } from "../config/prisma.js";
import { brandKeyFor } from "./seo.controller.js";

/**
 * Per-site sitemap.xml and robots.txt. Served at the bare paths (not
 * under /api/v1) so the frontend host can proxy them (frontend/vercel.json).
 * The site comes from ?site=, or from the Host header when a reverse
 * proxy forwards the public hostname (report §09).
 */

const DEFAULT_URLS = { steven: "https://stevenkayelu.online", devegen: "https://devegenventures.com" };
const HOSTS = {
  "stevenkayelu.online": "steven", "www.stevenkayelu.online": "steven",
  "devegenventures.com": "devegen", "www.devegenventures.com": "devegen",
};

const ROUTES = {
  steven: [
    ["/", "1.0"], ["/about", "0.8"], ["/projects", "0.8"], ["/blog", "0.8"], ["/experience", "0.6"],
    ["/resume", "0.6"], ["/certificates", "0.5"], ["/achievements", "0.5"], ["/testimonials", "0.4"],
    ["/gallery", "0.4"], ["/services", "0.5"], ["/contact", "0.6"], ["/faq", "0.4"], ["/privacy-policy", "0.3"],
  ],
  devegen: [
    ["/", "1.0"], ["/ventures", "0.8"], ["/solutions", "0.9"], ["/solutions/services", "0.8"],
    ["/solutions/work", "0.7"], ["/compliance", "0.5"], ["/contact", "0.6"], ["/faq", "0.4"], ["/privacy-policy", "0.3"],
  ],
};

export function resolveSite(req) {
  if (req.query.site === "steven" || req.query.site === "devegen") return req.query.site;
  return HOSTS[req.hostname?.toLowerCase()] || "steven";
}

async function siteUrl(site) {
  // Prefer the first domain configured on the brand, so the admin can change it.
  const brand = await prisma.brand.findUnique({ where: { key: site }, select: { domains: true } });
  const domain = Array.isArray(brand?.domains) ? brand.domains.find((d) => !d.startsWith("www.")) : null;
  return domain ? `https://${domain}` : DEFAULT_URLS[site];
}

const escapeXml = (v) => String(v).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]));

function urlEntry(loc, priority, lastmod) {
  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}
    <priority>${priority}</priority>
  </url>`;
}

export async function getSitemap(req, res, next) {
  try {
    const site = resolveSite(req);
    const base = await siteUrl(site);
    const publicProject = { deletedAt: null, status: { not: "DRAFT" }, visibility: "PUBLIC" };

    const [projects, posts, hidden, ventures] = await Promise.all([
      prisma.project.findMany({ where: publicProject, select: { slug: true, updatedAt: true } }),
      site === "steven"
        ? prisma.blogPost.findMany({ where: { deletedAt: null, status: "PUBLISHED" }, select: { slug: true, updatedAt: true } })
        : [],
      prisma.seoMeta.findMany({ where: { noIndex: true }, select: { route: true, brand: { select: { key: true } } } }),
      site === "devegen"
        ? prisma.venture.findMany({ where: { status: "PUBLISHED", deletedAt: null, slug: { not: "devgen-solutions" } }, select: { slug: true, updatedAt: true } })
        : [],
    ]);
    const noIndex = new Set(hidden.map((h) => `${h.brand?.key}:${h.route}`));
    const indexable = (path) => !noIndex.has(`${brandKeyFor(site, path)}:${path}`);
    const projectBase = site === "steven" ? "/projects" : "/solutions/work";

    const entries = [
      ...ROUTES[site].filter(([path]) => indexable(path)).map(([path, priority]) => urlEntry(`${base}${path}`, priority)),
      ...projects.map((p) => urlEntry(`${base}${projectBase}/${p.slug}`, "0.7", p.updatedAt.toISOString())),
      ...posts.map((p) => urlEntry(`${base}/blog/${p.slug}`, "0.7", p.updatedAt.toISOString())),
      ...ventures.filter((v) => indexable(`/ventures/${v.slug}`)).map((v) => urlEntry(`${base}/ventures/${v.slug}`, "0.7", v.updatedAt.toISOString())),
    ];

    res.set("Content-Type", "application/xml");
    res.set("Cache-Control", "public, max-age=3600");
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`);
  } catch (err) {
    next(err);
  }
}

export async function getRobots(req, res, next) {
  try {
    const site = resolveSite(req);
    const base = await siteUrl(site);
    res.type("text/plain").set("Cache-Control", "public, max-age=3600").send(
      `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${base}/sitemap.xml\n`
    );
  } catch (err) {
    next(err);
  }
}
