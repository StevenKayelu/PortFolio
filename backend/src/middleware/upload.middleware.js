import multer from "multer";

// Memory storage (not disk) — the buffer flows straight into sharp for
// optimization, then into storage.service.js. Nothing hits disk in an
// unoptimized, un-resized form, and the same code path works whether
// the storage driver ends up being local disk or R2.
const storage = multer.memoryStorage();

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
]);

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(new Error("Unsupported file type."));
  }
  cb(null, true);
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB — pre-optimization ceiling
});
