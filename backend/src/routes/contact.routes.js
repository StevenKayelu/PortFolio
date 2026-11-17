import { z } from "zod";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { contactSchema } from "../validation/schemas.js";
import {
  submitContactMessage, listContactMessages, updateContactMessageStatus, deleteContactMessage,
} from "../controllers/contact.controller.js";

const router = Router();
const submitLimiter = rateLimit({ windowMs: 60 * 1000, limit: 5, message: { error: "Too many submissions — please wait a moment." } });

router.post("/", submitLimiter, validate(contactSchema), submitContactMessage);
router.get("/", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), listContactMessages);
router.patch("/:id", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), validate(z.object({ status: z.enum(["NEW", "READ", "REPLIED", "ARCHIVED", "SPAM"]) })), updateContactMessageStatus);
router.delete("/:id", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), deleteContactMessage);

export default router;