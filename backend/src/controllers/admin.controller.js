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

export async function recordPageView(req, res, next) {
  try {
    const { path, referrer } = req.body;
    await prisma.pageView.create({
      data: { path, referrer, device: req.headers["user-agent"]?.slice(0, 255) },
    });
    res.status(201).end();
  } catch (err) {
    next(err);
  }
}
