import { prisma } from "../config/prisma.js";

const SITE_URL = process.env.CLIENT_URL || "https://example.com";

const STATIC_ROUTES = [
  { path: "/", priority: "1.0" },
  { path: "/about", priority: "0.8" },
  { path: "/projects", priority: "0.8" },
  { path: "/blog", priority: "0.8" },
  { path: "/services", priority: "0.7" },
  { path: "/resume", priority: "0.6" },
  { path: "/experience", priority: "0.6" },
  { path: "/certificates", priority: "0.5" },
  { path: "/gallery", priority: "0.5" },
  { path: "/testimonials", priority: "0.5" },
  { path: "/achievements", priority: "0.5" },
  { path: "/contact", priority: "0.6" },
  { path: "/faq", priority: "0.5" },
  { path: "/privacy-policy", priority: "0.3" },
];

function urlEntry(loc, priority, lastmod) {
  return `  <url>
    <loc>${loc}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}
    <priority>${priority}</priority>
  </url>`;
}

// Served at the bare /sitemap.xml (not under /api/v1) so it can be
// reached directly, or proxied to from the frontend domain via a
// platform rewrite (see frontend/vercel.json).
export async function getSitemap(req, res, next) {
  try {
    const [projects, posts] = await Promise.all([
      prisma.project.findMany({
        where: { deletedAt: null, status: { not: "DRAFT" } },
        select: { slug: true, updatedAt: true },
      }),
      prisma.blogPost.findMany({
        where: { deletedAt: null, status: "PUBLISHED" },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    const entries = [
      ...STATIC_ROUTES.map((r) => urlEntry(`${SITE_URL}${r.path}`, r.priority)),
      ...projects.map((p) => urlEntry(`${SITE_URL}/projects/${p.slug}`, "0.7", p.updatedAt.toISOString())),
      ...posts.map((p) => urlEntry(`${SITE_URL}/blog/${p.slug}`, "0.7", p.updatedAt.toISOString())),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;

    res.set("Content-Type", "application/xml");
    res.send(xml);
  } catch (err) {
    next(err);
  }
}
