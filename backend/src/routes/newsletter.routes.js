import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { validate } from "../middleware/validate.middleware.js";
import { subscribeNewsletter } from "../controllers/contact.controller.js";

const router = Router();
const limiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, message: { error: "Too many sign-ups from this connection. Try again later." } });

router.post("/", limiter, validate(z.object({ email: z.string().trim().email("Enter a valid email address.").max(191) })), subscribeNewsletter);

export default router;
