import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validate } from "../middleware/validate.middleware.js";
import { pageViewSchema } from "../validation/schemas.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { getDashboardSummary, getInboxCounts, getPageViewSeries, recordPageView } from "../controllers/admin.controller.js";
import { loadBrandAccess } from "../services/brandAccess.service.js";
import { upload } from "../middleware/upload.middleware.js";
import { handleUpload } from "../services/upload.service.js";

const router = Router();
const trackLimiter = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: false, message: { error: "Too many requests." } });

router.post("/track", trackLimiter, validate(pageViewSchema), recordPageView); // public — fired by the frontend on route change
router.get("/summary", requireAuth, requireRole("SUPER_ADMIN", "ADMIN", "EDITOR"), loadBrandAccess, getDashboardSummary);
// Thumbnails and cover images for projects, products and ventures (re-encoded to WebP).
router.post("/uploads/image", requireAuth, requireRole("SUPER_ADMIN", "ADMIN", "EDITOR"), upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file || !["image/jpeg", "image/png", "image/webp"].includes(req.file.mimetype)) {
      return res.status(400).json({ error: "Choose a JPEG, PNG or WebP image." });
    }
    const saved = await handleUpload(req.file);
    res.status(201).json({ url: saved.url });
  } catch (err) {
    next(err);
  }
});
router.get("/inbox-counts", requireAuth, requireRole("SUPER_ADMIN", "ADMIN", "EDITOR"), loadBrandAccess, getInboxCounts);
router.get("/page-views", requireAuth, requireRole("SUPER_ADMIN", "ADMIN", "EDITOR"), getPageViewSeries);

export default router;
