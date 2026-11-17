import { Router } from "express";
import { listPublicCertificates, getPublicCertificate } from "../controllers/certificate.controller.js";

/** Public, read-only. Admin routes live in adminEcosystem.routes.js (/admin/certificates). */
const router = Router();
router.get("/", listPublicCertificates);
router.get("/:id", getPublicCertificate);
export default router;
