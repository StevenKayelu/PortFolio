import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";
import { getSetting, getSettingsBulk, upsertSetting, uploadIdentityPhoto, uploadBrandingLogo, uploadBrandingFavicon } from "../controllers/siteSetting.controller.js";
import { siteSettingSchemas } from "../validation/schemas.js";

const router = Router();
const canEdit = [requireAuth, requireRole("SUPER_ADMIN", "ADMIN")];

/** Validates { value } against the schema for :key; unknown keys are rejected. */
function validateSetting(req, res, next) {
  const schema = siteSettingSchemas[req.params.key];
  if (!schema) return res.status(400).json({ error: `Unknown setting "${req.params.key}".` });
  const result = schema.safeParse(req.body?.value);
  if (!result.success) {
    return res.status(400).json({ error: "Some fields need attention.", fields: result.error.flatten().fieldErrors, issues: result.error.issues.map((i) => ({ path: i.path, message: i.message })) });
  }
  req.body = { value: result.data };
  return next();
}

router.get("/", getSettingsBulk); // ?keys=identity,stats,technologies
router.post("/identity/photo", ...canEdit, upload.single("photo"), uploadIdentityPhoto);
router.post("/branding/logo", ...canEdit, upload.single("image"), uploadBrandingLogo);
router.post("/branding/favicon", ...canEdit, upload.single("image"), uploadBrandingFavicon);
router.get("/:key", getSetting);
router.put("/:key", ...canEdit, validateSetting, upsertSetting);

export default router;
