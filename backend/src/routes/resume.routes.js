import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";
import { getActiveResume, uploadResume } from "../controllers/resume.controller.js";

const router = Router();

router.get("/", getActiveResume);
router.post("/", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), upload.single("file"), uploadResume);

export default router;
