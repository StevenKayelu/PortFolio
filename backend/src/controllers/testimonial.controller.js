import { prisma } from "../config/prisma.js";

export async function listTestimonials(req, res, next) {
  try {
    const { featuredOnly } = req.query;
    const where = { isApproved: true, ...(featuredOnly === "true" ? { isFeatured: true } : {}) };
    const testimonials = await prisma.testimonial.findMany({ where, orderBy: { createdAt: "desc" } });
    res.json(testimonials);
  } catch (err) {
    next(err);
  }
}

// Public submission — always lands unapproved until an admin reviews it,
// so the site never displays a quote nobody signed off on.
export async function submitTestimonial(req, res, next) {
  try {
    const { clientName, clientRole, clientCompany, content, rating } = req.body;
    const testimonial = await prisma.testimonial.create({
      data: { clientName, clientRole, clientCompany, content, rating: rating ?? 5, isApproved: false },
    });
    res.status(201).json({ message: "Thanks — your testimonial is awaiting review.", id: testimonial.id });
  } catch (err) {
    next(err);
  }
}

export async function listAllForAdmin(req, res, next) {
  try {
    const testimonials = await prisma.testimonial.findMany({ orderBy: { createdAt: "desc" } });
    res.json(testimonials);
  } catch (err) {
    next(err);
  }
}

export async function moderateTestimonial(req, res, next) {
  try {
    const testimonial = await prisma.testimonial.update({ where: { id: req.params.id }, data: req.body });
    res.json(testimonial);
  } catch (err) {
    next(err);
  }
}

export async function deleteTestimonial(req, res, next) {
  try {
    await prisma.testimonial.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
