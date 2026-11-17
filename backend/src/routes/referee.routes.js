import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { refereeSchema, refereeUpdateSchema } from "../validation/schemas.js";
import { listReferees, createReferee, updateReferee, deleteReferee } from "../controllers/referee.controller.js";

// Admin-only, every route: referees' contact details are never public.
const router = Router();
router.use(requireAuth, requireRole("SUPER_ADMIN", "ADMIN"));
router.get("/", listReferees);
router.post("/", validate(refereeSchema), createReferee);
router.patch("/:id", validate(refereeUpdateSchema), updateReferee);
router.delete("/:id", deleteReferee);

export default router;
