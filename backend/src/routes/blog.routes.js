import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";
import { handleUpload } from "../services/upload.service.js";
import {
  listPosts, getPostBySlug, getPostById, createPost, updatePost, deletePost,
  toggleLike, toggleBookmark, addComment, listCategories, listTags,
} from "../controllers/blog.controller.js";

const router = Router();
const canWrite = [requireAuth, requireRole("SUPER_ADMIN", "ADMIN", "EDITOR")];

router.get("/", listPosts);
router.get("/categories", listCategories);
router.get("/tags", listTags);
router.get("/id/:id", ...canWrite, getPostById); // admin editor loads drafts by id
router.get("/:slug", getPostBySlug);
router.post("/", ...canWrite, createPost);
router.patch("/:id", ...canWrite, updatePost);
router.delete("/:id", ...canWrite, deletePost);

router.post("/cover-image", ...canWrite, upload.single("image"), async (req, res, next) => {
  try {
    const saved = await handleUpload(req.file);
    res.status(201).json({ url: saved.url });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/like", toggleLike);
router.post("/:id/bookmark", toggleBookmark);
router.post("/:id/comments", addComment);

export default router;
