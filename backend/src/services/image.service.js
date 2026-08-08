import sharp from "sharp";

const MAX_WIDTH = 1920;
const WEBP_QUALITY = 82;

// PDFs and SVGs pass through untouched — sharp can't meaningfully
// "optimize" a vector or a document, and rasterizing an SVG would
// throw away the thing that makes it useful.
const PASSTHROUGH_MIME = new Set(["application/pdf", "image/svg+xml"]);

/**
 * Resizes (never upscales) to a sane max width and re-encodes as WebP.
 * Returns a new buffer + the mimetype/extension the caller should
 * actually store, since it may differ from what was uploaded.
 */
export async function optimizeImage(buffer, mimetype) {
  if (PASSTHROUGH_MIME.has(mimetype)) {
    return { buffer, mimetype, ext: mimetype === "application/pdf" ? "pdf" : "svg" };
  }

  const optimized = await sharp(buffer)
    .rotate() // auto-orient from EXIF before stripping it
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  return { buffer: optimized, mimetype: "image/webp", ext: "webp" };
}

/**
 * A second, smaller derivative for thumbnails/avatars/list-view cards,
 * so the browser never downloads a full 1920px image just to show it
 * at 200px in a grid.
 */
export async function generateThumbnail(buffer, mimetype, width = 400) {
  if (PASSTHROUGH_MIME.has(mimetype)) return null;

  return sharp(buffer)
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 75 })
    .toBuffer();
}
