import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { login, refresh, logout, me } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { changePasswordSchema } from "../validation/schemas.js";
import { changeOwnPassword } from "../controllers/users.controller.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { error: "Too many login attempts. Try again later." },
});

router.post("/login", loginLimiter, validate(z.object({ email: z.string().trim().max(191), password: z.string().max(128) })), login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", requireAuth, me);
router.post("/change-password", requireAuth, loginLimiter, validate(changePasswordSchema), changeOwnPassword);

export default router;
