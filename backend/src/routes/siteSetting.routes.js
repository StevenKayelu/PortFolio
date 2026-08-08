import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { getSetting, getSettingsBulk, upsertSetting } from "../controllers/siteSetting.controller.js";

const router = Router();

router.get("/", getSettingsBulk); // ?keys=identity,stats,technologies
router.get("/:key", getSetting);
router.put("/:key", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), upsertSetting);

export default router;
