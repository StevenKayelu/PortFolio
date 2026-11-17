import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { SCOPES, brandFilter } from "../services/brandAccess.service.js";

export async function getDashboardSummary(req, res, next) {
  try {
    const [
      projectCount, publishedPostCount, draftPostCount, newMessageCount,
      subscriberCount, pendingTestimonialCount, totalViews, leadsByStatus, pendingApprovalCount,
    ] = await Promise.all([
      prisma.project.count({ where: { deletedAt: null } }),
      prisma.blogPost.count({ where: { status: "PUBLISHED", deletedAt: null } }),
      prisma.blogPost.count({ where: { status: "DRAFT", deletedAt: null } }),
      prisma.contactMessage.count({ where: { status: "NEW", deletedAt: null } }),
      prisma.newsletterSubscriber.count({ where: { unsubscribedAt: null } }),
      prisma.testimonial.count({ where: { isApproved: false } }),
      prisma.pageView.count(),
      // Leads and approvals only count brands this user can work on.
      prisma.lead.groupBy({ by: ["status"], where: { deletedAt: null, ...brandFilter(req.brandAccess, SCOPES.leads) }, _count: true }),
      prisma.contentRevision.count({ where: { status: "PENDING", ...brandFilter(req.brandAccess, SCOPES.manage) } }),
    ]);
    const leadCounts = Object.fromEntries(leadsByStatus.map((l) => [l.status, l._count]));
    // Registrations/licences expiring within 60 days or already expired (super admins only).
    const expiringCredentialCount = req.brandAccess.all
      ? await prisma.organizationCredential.count({ where: { expiresAt: { not: null, lte: new Date(Date.now() + 60 * 86400000) } } })
      : 0;

    res.json({
      projectCount, publishedPostCount, draftPostCount, newMessageCount,
      subscriberCount, pendingTestimonialCount, totalViews,
      newLeadCount: leadCounts.NEW || 0,
      openLeadCount: ["NEW", "QUALIFIED", "CONTACTED", "PROPOSAL"].reduce((n, s) => n + (leadCounts[s] || 0), 0),
      pendingApprovalCount,
      expiringCredentialCount,
    });
  } catch (err) {
    next(err);
  }
}

/** Badge counts for the admin menu. */
export async function getInboxCounts(req, res, next) {
  try {
    const canReadMessages = ["SUPER_ADMIN", "ADMIN"].includes(req.user.role);
    const [leads, messages, approvals, testimonials] = await Promise.all([
      prisma.lead.count({ where: { status: "NEW", deletedAt: null, ...brandFilter(req.brandAccess, SCOPES.leads) } }),
      canReadMessages ? prisma.contactMessage.count({ where: { status: "NEW", deletedAt: null } }) : 0,
      prisma.contentRevision.count({ where: { status: "PENDING", ...brandFilter(req.brandAccess, SCOPES.manage) } }),
      prisma.testimonial.count({ where: { isApproved: false, withdrawnAt: null, consentPublishAt: { not: null }, ...brandFilter(req.brandAccess, SCOPES.manage) } }),
    ]);
    res.set("Cache-Control", "no-store");
    res.json({ leads, messages, approvals, testimonials });
  } catch (err) {
    next(err);
  }
}

export async function getPageViewSeries(req, res, next) {
  try {
    // Simple day-bucketed count over the last 30 days. Swappable for a
    // raw SQL date_trunc query if the dataset grows large.
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const views = await prisma.pageView.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    });

    const buckets = {};
    for (const v of views) {
      const day = v.createdAt.toISOString().slice(0, 10);
      buckets[day] = (buckets[day] || 0) + 1;
    }

    res.json(Object.entries(buckets).map(([date, count]) => ({ date, count })));
  } catch (err) {
    next(err);
  }
}

const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python|node-fetch|axios/i;
const OWN_HOSTS = /(^|\.)(stevenkayelu\.online|devgenventures\.com)$/i;

export function deviceType(ua = "") {
  if (/ipad|tablet/i.test(ua)) return "tablet";
  if (/mobi|android|iphone/i.test(ua)) return "mobile";
  return "desktop";
}

/** "https://www.google.com/search?q=…" → "google.com"; our own sites and junk → null. */
export function referrerHost(referrer) {
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "").toLowerCase();
    return host && !OWN_HOSTS.test(host) ? host.slice(0, 120) : null;
  } catch {
    return null;
  }
}

/** Lusaka calendar day, so the visitor code rotates at local midnight. */
const lusakaDay = () => new Date(Date.now() + 2 * 3600000).toISOString().slice(0, 10);

export async function recordPageView(req, res, next) {
  try {
    const ua = req.headers["user-agent"] || "";
    if (BOT_UA.test(ua) || req.body.path.startsWith("/admin")) return res.status(204).end();
    const { path, referrer, site } = req.body;
    const salt = process.env.LEAD_IP_SALT || process.env.JWT_ACCESS_SECRET || "";
    const visitorHash = crypto.createHash("sha256").update(`${salt}|${lusakaDay()}|${req.ip}|${ua}`).digest("hex").slice(0, 32);
    await prisma.pageView.create({
      data: { site: site || null, path, referrer: referrerHost(referrer), device: deviceType(ua), visitorHash },
    });
    // Keep about 13 months; pruned now and then rather than on a schedule.
    if (Math.random() < 0.01) {
      prisma.pageView.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 400 * 86400000) } } }).catch(() => {});
    }
    res.status(201).end();
  } catch (err) {
    next(err);
  }
}

/**
 * Visits report for the admin Analytics page: totals with the previous
 * period for comparison, daily counts per site (Lusaka days), top pages,
 * referring sites and device types.
 */
export async function getAnalytics(req, res, next) {
  try {
    const { days, site } = req.validQuery;
    const now = new Date();
    const since = new Date(now.getTime() - days * 86400000);
    const before = new Date(since.getTime() - days * 86400000);
    const siteSql = site === "all" ? Prisma.empty : Prisma.sql`AND "site" = ${site}`;

    const totals = (from, to) => prisma.$queryRaw`
      SELECT COUNT(*)::int AS views, COUNT(DISTINCT "visitorHash")::int AS visitors
      FROM "page_views" WHERE "createdAt" >= ${from} AND "createdAt" < ${to} ${siteSql}`;

    const [[current], [previous], daily, pages, referrers, devices] = await Promise.all([
      totals(since, now),
      totals(before, since),
      prisma.$queryRaw`
        SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Africa/Lusaka', 'YYYY-MM-DD') AS day,
               COALESCE("site", 'unknown') AS site, COUNT(*)::int AS views, COUNT(DISTINCT "visitorHash")::int AS visitors
        FROM "page_views" WHERE "createdAt" >= ${since} ${siteSql}
        GROUP BY 1, 2 ORDER BY 1`,
      prisma.$queryRaw`
        SELECT COALESCE("site", 'unknown') AS site, "path", COUNT(*)::int AS views, COUNT(DISTINCT "visitorHash")::int AS visitors
        FROM "page_views" WHERE "createdAt" >= ${since} ${siteSql}
        GROUP BY 1, 2 ORDER BY views DESC LIMIT 15`,
      prisma.$queryRaw`
        SELECT "referrer" AS host, COUNT(*)::int AS views
        FROM "page_views" WHERE "createdAt" >= ${since} AND "referrer" IS NOT NULL ${siteSql}
        GROUP BY 1 ORDER BY views DESC LIMIT 10`,
      prisma.$queryRaw`
        SELECT COALESCE("device", 'unknown') AS device, COUNT(*)::int AS views
        FROM "page_views" WHERE "createdAt" >= ${since} ${siteSql}
        GROUP BY 1 ORDER BY views DESC`,
    ]);

    res.set("Cache-Control", "no-store");
    res.json({ days, site, current, previous, daily, pages, referrers, devices });
  } catch (err) {
    next(err);
  }
}
