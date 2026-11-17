import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { testimonialModerateSchema, inviteSubmitSchema } from "../validation/schemas.js";
import { listTestimonials, listAllForAdmin, moderateTestimonial, deleteTestimonial } from "../controllers/testimonial.controller.js";
import { getInviteForClient, submitViaInvite, withdrawViaInvite } from "../controllers/testimonialInvite.controller.js";

/**
 * There is deliberately no open "submit a testimonial" endpoint: clients
 * respond through a private invite link (/testimonials/invite/:token).
 */
const router = Router();
const inviteLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, message: { error: "Too many requests. Wait a few minutes and try again." } });

router.get("/", listTestimonials);
router.get("/admin/all", requireAuth, requireRole("SUPER_ADMIN", "ADMIN", "EDITOR"), listAllForAdmin);
router.get("/invite/:token", inviteLimiter, getInviteForClient);
router.post("/invite/:token", inviteLimiter, validate(inviteSubmitSchema), submitViaInvite);
router.post("/invite/:token/withdraw", inviteLimiter, withdrawViaInvite);
router.patch("/:id", requireAuth, requireRole("SUPER_ADMIN", "ADMIN", "EDITOR"), validate(testimonialModerateSchema), moderateTestimonial);
router.delete("/:id", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), deleteTestimonial);

export default router;
