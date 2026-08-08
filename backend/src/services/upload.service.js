import crypto from "crypto";
import { optimizeImage, generateThumbnail } from "./image.service.js";
import { saveFile } from "./storage.service.js";

function randomFilename(ext) {
  return `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${ext}`;
}

/**
 * The single entry point controllers should use for any upload — runs
 * the file through sharp (when applicable) before it's ever written to
 * disk or R2, and optionally produces a thumbnail alongside it.
 *
 * @param {{ buffer: Buffer, mimetype: string }} file - from multer memoryStorage
 * @param {{ withThumbnail?: boolean }} options
 */
export async function handleUpload(file, { withThumbnail = false } = {}) {
  const optimized = await optimizeImage(file.buffer, file.mimetype);
  const saved = await saveFile({
    buffer: optimized.buffer,
    mimetype: optimized.mimetype,
    filename: randomFilename(optimized.ext),
  });

  let thumbnail = null;
  if (withThumbnail) {
    const thumbBuffer = await generateThumbnail(file.buffer, file.mimetype);
    if (thumbBuffer) {
      thumbnail = await saveFile({
        buffer: thumbBuffer,
        mimetype: "image/webp",
        filename: randomFilename("webp"),
      });
    }
  }

  return { ...saved, thumbnailUrl: thumbnail?.url ?? null };
}
