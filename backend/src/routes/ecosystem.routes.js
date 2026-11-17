import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validate } from "../middleware/validate.middleware.js";
import { enquirySchema } from "../validation/schemas.js";
import { submitEnquiry } from "../controllers/enquiry.controller.js";
import { listPublicBrands, getEcosystem, listPublicVentures, getPublicVenture } from "../controllers/ecosystem.controller.js";

/**
 * Public ecosystem API (report §08):
 *   GET  /brands/public     published brand profiles
 *   GET  /ecosystem         brands + relationships + ventures + products
 *   GET  /ventures[/:slug]  public venture directory
 *   POST /enquiries         career / quote / partnership enquiries
 */
const router = Router();

const enquiryBurst = rateLimit({ windowMs: 60 * 1000, limit: 3, message: { error: "Too many enquiries. Wait a minute and try again." } });
const enquiryDaily = rateLimit({ windowMs: 24 * 60 * 60 * 1000, limit: 20, message: { error: "Too many enquiries from this connection today." } });

router.get("/brands/public", listPublicBrands);
router.get("/ecosystem", getEcosystem);
router.get("/ventures", listPublicVentures);
router.get("/ventures/:slug", getPublicVenture);
router.post("/enquiries", enquiryBurst, enquiryDaily, validate(enquirySchema), submitEnquiry);

export default router;
