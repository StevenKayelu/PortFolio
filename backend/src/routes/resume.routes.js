import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";
import rateLimit from "express-rate-limit";
import { getActiveResume, getResumePdf, uploadResume } from "../controllers/resume.controller.js";

const router = Router();

router.get("/", getActiveResume);
// Generated from the live data; limited so it can't be used to load the server.
router.get("/pdf", rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: true, message: { error: "Too many downloads. Try again in a minute." } }), getResumePdf);
router.post("/", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), upload.single("file"), uploadResume);

export default router;
