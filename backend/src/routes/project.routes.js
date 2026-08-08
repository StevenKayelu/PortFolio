import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";
import { handleUpload } from "../services/upload.service.js";
import { prisma } from "../config/prisma.js";
import {
  listProjects, getProjectBySlug, createProject, updateProject, deleteProject, listProjectCategories,
} from "../controllers/project.controller.js";

const router = Router();
const canWrite = [requireAuth, requireRole("SUPER_ADMIN", "ADMIN", "EDITOR")];

router.get("/", listProjects);
router.get("/categories", listProjectCategories);
router.get("/:slug", getProjectBySlug);
router.post("/", ...canWrite, createProject);
router.patch("/:id", ...canWrite, updateProject);
router.delete("/:id", ...canWrite, deleteProject);

router.post("/:id/images", ...canWrite, upload.single("image"), async (req, res, next) => {
  try {
    const saved = await handleUpload(req.file, { withThumbnail: true });
    const image = await prisma.projectImage.create({
      data: { projectId: req.params.id, url: saved.url, altText: req.body.altText || null },
    });
    res.status(201).json({ ...image, thumbnailUrl: saved.thumbnailUrl });
  } catch (err) {
    next(err);
  }
});

export default router;
