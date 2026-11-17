import { prisma } from "../config/prisma.js";
import { audit } from "../services/audit.service.js";

/**
 * Testimonials. New ones arrive only through private invite links
 * (testimonialInvite.controller.js). The public list shows a testimonial
 * only if it is approved, has recorded consent to publish, and has not
 * been withdrawn — so legacy rows without consent are never shown.
 */

const PUBLIC_WHERE = { isApproved: true, withdrawnAt: null, consentPublishAt: { not: null } };

export async function listTestimonials(req, res, next) {
  try {
    const { featuredOnly, brand } = req.query;
    const testimonials = await prisma.testimonial.findMany({
      where: {
        ...PUBLIC_WHERE,
        ...(featuredOnly === "true" ? { isFeatured: true } : {}),
        ...(typeof brand === "string" && brand ? { brand: { key: brand } } : {}),
      },
      orderBy: { createdAt: "desc" },
      // Email, consent records and invite links are never public.
      select: {
        id: true, clientName: true, clientRole: true, clientCompany: true, clientAvatar: true, content: true, rating: true,
        relationship: true, verified: true, createdAt: true,
        brand: { select: { key: true, name: true } },
        project: { select: { title: true, slug: true, visibility: true, status: true, deletedAt: true } },
      },
    });
    // Only link to a project the public can see.
    res.json(testimonials.map(({ project, ...t }) => ({
      ...t,
      project: project && project.visibility === "PUBLIC" && project.status !== "DRAFT" && !project.deletedAt ? { title: project.title, slug: project.slug } : null,
    })));
  } catch (err) {
    next(err);
  }
}

export async function listAllForAdmin(req, res, next) {
  try {
    const testimonials = await prisma.testimonial.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        brand: { select: { key: true, name: true } },
        project: { select: { title: true } },
        invite: { select: { clientEmail: true, createdAt: true } },
      },
    });
    res.json(testimonials);
  } catch (err) {
    next(err);
  }
}

/** Approve/feature only. A client's words are never edited after they consent. */
export async function moderateTestimonial(req, res, next) {
  try {
    const existing = await prisma.testimonial.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Testimonial not found." });
    if (req.body.isApproved && (!existing.consentPublishAt || existing.withdrawnAt)) {
      return res.status(400).json({ error: "This testimonial has no recorded consent to publish, so it can't be approved." });
    }
    const data = { ...req.body, ...(req.body.isApproved === false ? { isFeatured: false } : {}) };
    if (data.isFeatured && !(data.isApproved ?? existing.isApproved)) {
      return res.status(400).json({ error: "Approve the testimonial before featuring it." });
    }
    const testimonial = await prisma.testimonial.update({ where: { id: existing.id }, data });
    await audit(req, "MODERATE", "Testimonial", existing.id, req.body);
    res.json(testimonial);
  } catch (err) {
    next(err);
  }
}

export async function deleteTestimonial(req, res, next) {
  try {
    await prisma.testimonial.delete({ where: { id: req.params.id } });
    await audit(req, "DELETE", "Testimonial", req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
