import { Router } from "express";
import { createCrudController } from "../utils/crudFactory.js";
import { requireAuth, requireRole, optionalAuth } from "../middleware/auth.middleware.js";

/**
 * GET /            → public list
 * GET /:id         → public getOne
 * POST /           → admin/editor only
 * PATCH /:id       → admin/editor only
 * DELETE /:id      → admin/editor only
 */
export function createCrudRouter(modelName, options = {}) {
  const controller = createCrudController(modelName, options);
  const router = Router();

  router.get("/", optionalAuth, controller.list);
  router.get("/:id", controller.getOne);
  router.post("/", requireAuth, requireRole("SUPER_ADMIN", "ADMIN", "EDITOR"), controller.create);
  router.patch("/:id", requireAuth, requireRole("SUPER_ADMIN", "ADMIN", "EDITOR"), controller.update);
  router.delete("/:id", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), controller.remove);

  return router;
}
