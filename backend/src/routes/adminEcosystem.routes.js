import { Router } from "express";
import { requireAuth, requireRole, STAFF_ROLES } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { loadBrandAccess, requireSuperAdmin } from "../services/brandAccess.service.js";
import {
  brandCreateSchema, brandUpdateSchema, organizationSchema, relationshipSchema, ventureSchema, ventureUpdateSchema,
  productSchema, productUpdateSchema, brandRolesSchema, leadQuerySchema, leadUpdateSchema, leadNoteSchema, convertMessageSchema,
  userCreateSchema, userUpdateSchema, passwordResetSchema, revisionQuerySchema, reviewSchema, seoSchema, seoUpdateSchema,
  inviteCreateSchema,
} from "../validation/schemas.js";
import * as users from "../controllers/users.controller.js";
import * as revisions from "../controllers/revision.controller.js";
import * as seo from "../controllers/seo.controller.js";
import * as invites from "../controllers/testimonialInvite.controller.js";
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
router.post("/users", requireSuperAdmin, validate(userCreateSchema), users.adminCreateUser);
router.patch("/users/:id", requireSuperAdmin, validate(userUpdateSchema), users.adminUpdateUser);
router.post("/users/:id/password", requireSuperAdmin, validate(passwordResetSchema), users.adminResetPassword);
router.put("/users/:id/brand-roles", requireSuperAdmin, validate(brandRolesSchema), eco.adminSetBrandRoles);

router.get("/revisions", validate(revisionQuerySchema, "query"), revisions.listRevisions);
router.post("/revisions/:id/approve", validate(reviewSchema), revisions.approveRevision);
router.post("/revisions/:id/reject", validate(reviewSchema), revisions.rejectRevision);
router.post("/revisions/:id/restore", revisions.restoreRevision);

router.get("/testimonial-invites", invites.listInvites);
router.post("/testimonial-invites", validate(inviteCreateSchema), invites.createInvite);
router.post("/testimonial-invites/:id/revoke", invites.revokeInvite);

router.get("/seo", seo.adminListSeo);
router.post("/seo", validate(seoSchema), seo.adminSaveSeo);
router.patch("/seo/:id", validate(seoUpdateSchema), seo.adminSaveSeo);
router.delete("/seo/:id", seo.adminDeleteSeo);

export default router;
