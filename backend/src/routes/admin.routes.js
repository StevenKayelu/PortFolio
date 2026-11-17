import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validate } from "../middleware/validate.middleware.js";
import { pageViewSchema } from "../validation/schemas.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { getDashboardSummary, getPageViewSeries, recordPageView } from "../controllers/admin.controller.js";

const router = Router();
const trackLimiter = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: false, message: { error: "Too many requests." } });

router.post("/track", trackLimiter, validate(pageViewSchema), recordPageView); // public — fired by the frontend on route change
router.get("/summary", requireAuth, requireRole("SUPER_ADMIN", "ADMIN", "EDITOR"), getDashboardSummary);
router.get("/page-views", requireAuth, requireRole("SUPER_ADMIN", "ADMIN", "EDITOR"), getPageViewSeries);

export default router;
