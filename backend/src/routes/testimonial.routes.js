import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import {
  listTestimonials, submitTestimonial, listAllForAdmin, moderateTestimonial, deleteTestimonial,
} from "../controllers/testimonial.controller.js";

const router = Router();

router.get("/", listTestimonials);
router.post("/", submitTestimonial);
router.get("/admin/all", requireAuth, requireRole("SUPER_ADMIN", "ADMIN", "EDITOR"), listAllForAdmin);
router.patch("/:id", requireAuth, requireRole("SUPER_ADMIN", "ADMIN", "EDITOR"), moderateTestimonial);
router.delete("/:id", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), deleteTestimonial);

export default router;
