import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { getDashboardSummary, getPageViewSeries, recordPageView } from "../controllers/admin.controller.js";

const router = Router();

router.post("/track", recordPageView); // public — fired by the frontend on route change
router.get("/summary", requireAuth, requireRole("SUPER_ADMIN", "ADMIN", "EDITOR"), getDashboardSummary);
router.get("/page-views", requireAuth, requireRole("SUPER_ADMIN", "ADMIN", "EDITOR"), getPageViewSeries);

export default router;
