import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import {
  submitContactMessage, listContactMessages, updateContactMessageStatus, deleteContactMessage,
} from "../controllers/contact.controller.js";

const router = Router();
const submitLimiter = rateLimit({ windowMs: 60 * 1000, limit: 5, message: { error: "Too many submissions — please wait a moment." } });

router.post("/", submitLimiter, submitContactMessage);
router.get("/", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), listContactMessages);
router.patch("/:id", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), updateContactMessageStatus);
router.delete("/:id", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), deleteContactMessage);

export default router;