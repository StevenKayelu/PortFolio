import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validate } from "../middleware/validate.middleware.js";
import { testimonialSubmitSchema, testimonialModerateSchema } from "../validation/schemas.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import {
  listTestimonials, submitTestimonial, listAllForAdmin, moderateTestimonial, deleteTestimonial,
} from "../controllers/testimonial.controller.js";

const router = Router();
const submitLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, message: { error: "Too many submissions. Try again later." } });

router.get("/", listTestimonials);
router.post("/", submitLimiter, validate(testimonialSubmitSchema), submitTestimonial);
router.get("/admin/all", requireAuth, requireRole("SUPER_ADMIN", "ADMIN", "EDITOR"), listAllForAdmin);
router.patch("/:id", requireAuth, requireRole("SUPER_ADMIN", "ADMIN", "EDITOR"), validate(testimonialModerateSchema), moderateTestimonial);
router.delete("/:id", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), deleteTestimonial);

export default router;
