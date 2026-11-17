import { Router } from "express";
import { requireAuth, requireRole, STAFF_ROLES } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { loadBrandAccess, requireSuperAdmin } from "../services/brandAccess.service.js";
import {
  brandCreateSchema, brandUpdateSchema, organizationSchema, relationshipSchema, ventureSchema, ventureUpdateSchema,
  productSchema, productUpdateSchema, brandRolesSchema, leadQuerySchema, leadUpdateSchema, leadNoteSchema, convertMessageSchema,
} from "../validation/schemas.js";
import * as eco from "../controllers/ecosystem.controller.js";
import * as leads from "../controllers/enquiry.controller.js";

/**
 * Brand-scoped administration, mounted under /admin.
 * Each handler checks the caller's brand grants (services/brandAccess);
 * legal entities, relationships and role grants are super-admin only.
 */
const router = Router();
router.use(requireAuth, requireRole(...STAFF_ROLES), loadBrandAccess);

router.get("/brands", eco.adminListBrands);
router.post("/brands", requireSuperAdmin, validate(brandCreateSchema), eco.adminCreateBrand);
router.patch("/brands/:id", validate(brandUpdateSchema), eco.adminUpdateBrand);

router.get("/organizations", requireSuperAdmin, eco.adminListOrganizations);
router.post("/organizations", requireSuperAdmin, validate(organizationSchema), eco.adminSaveOrganization);
router.patch("/organizations/:id", requireSuperAdmin, validate(organizationSchema.partial()), eco.adminSaveOrganization);

router.get("/relationships", requireSuperAdmin, eco.adminListRelationships);
router.post("/relationships", requireSuperAdmin, validate(relationshipSchema), eco.adminSaveRelationship);
router.patch("/relationships/:id", requireSuperAdmin, validate(relationshipSchema.innerType().partial()), eco.adminSaveRelationship);
router.delete("/relationships/:id", requireSuperAdmin, eco.adminDeleteRelationship);

router.get("/ventures", eco.adminListVentures);
router.post("/ventures", validate(ventureSchema), eco.adminCreateVenture);
router.patch("/ventures/:id", validate(ventureUpdateSchema), eco.adminUpdateVenture);
router.delete("/ventures/:id", eco.adminDeleteVenture);

router.get("/products", eco.adminListProducts);
router.post("/products", validate(productSchema), eco.adminCreateProduct);
router.patch("/products/:id", validate(productUpdateSchema), eco.adminUpdateProduct);
router.delete("/products/:id", eco.adminDeleteProduct);

router.get("/leads", validate(leadQuerySchema, "query"), leads.listLeads);
router.get("/leads/:id", leads.getLead);
router.patch("/leads/:id", validate(leadUpdateSchema), leads.updateLead);
router.post("/leads/:id/notes", validate(leadNoteSchema), leads.addLeadNote);
router.post("/leads/from-message/:messageId", validate(convertMessageSchema), leads.convertContactMessage);

router.get("/users", requireSuperAdmin, eco.adminListUsers);
router.put("/users/:id/brand-roles", requireSuperAdmin, validate(brandRolesSchema), eco.adminSetBrandRoles);

export default router;
