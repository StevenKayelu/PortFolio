import { prisma } from "../config/prisma.js";

export async function getDashboardSummary(req, res, next) {
  try {
    const [
      projectCount, publishedPostCount, draftPostCount, newMessageCount,
      subscriberCount, pendingTestimonialCount, totalViews,
    ] = await Promise.all([
      prisma.project.count({ where: { deletedAt: null } }),
      prisma.blogPost.count({ where: { status: "PUBLISHED", deletedAt: null } }),
      prisma.blogPost.count({ where: { status: "DRAFT", deletedAt: null } }),
      prisma.contactMessage.count({ where: { status: "NEW", deletedAt: null } }),
      prisma.newsletterSubscriber.count({ where: { unsubscribedAt: null } }),
      prisma.testimonial.count({ where: { isApproved: false } }),
      prisma.pageView.count(),
    ]);

    res.json({
      projectCount, publishedPostCount, draftPostCount, newMessageCount,
      subscriberCount, pendingTestimonialCount, totalViews,
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
