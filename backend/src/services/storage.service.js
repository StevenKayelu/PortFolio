// Storage adapter — controllers never know *where* a file physically
// lives. Both drivers take the same shape: { buffer, filename, mimetype }.
// Switching STORAGE_DRIVER=r2 in .env (with R2_* credentials filled in)
// is the only change needed to move from local disk to Cloudflare R2.

import fs from "fs/promises";
import path from "path";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const driver = process.env.STORAGE_DRIVER || "local";
const uploadDir = process.env.UPLOAD_DIR || "./src/uploads";

let r2Client = null;
function getR2Client() {
  if (r2Client) return r2Client;
  r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
  return r2Client;
}

// async function saveLocal({ buffer, filename }) {
//   await fs.mkdir(uploadDir, { recursive: true });
//   await fs.writeFile(path.join(uploadDir, filename), buffer);
//   return { url: `/uploads/${filename}`, key: filename, driver: "local" };
// }

async function saveR2({ buffer, filename, mimetype }) {
  if (!process.env.R2_BUCKET || !process.env.R2_ACCOUNT_ID) {
    throw new Error(
      "STORAGE_DRIVER=r2 but R2_ACCOUNT_ID / R2_BUCKET are not set. Fill in the R2_* variables in .env."
    );
  }

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: filename,
      Body: buffer,
      ContentType: mimetype,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return { url: `${process.env.R2_PUBLIC_URL}/${filename}`, key: filename, driver: "r2" };
}

/**
 * @param {{ buffer: Buffer, filename: string, mimetype: string }} file
 */
export async function saveFile(file) {
  return driver === "r2" ? saveR2(file) : saveLocal(file);
}

/**
 * @param {string} keyOrUrl - either the stored key, or the full URL
 *   returned by saveFile (local `/uploads/x.webp` or the R2 public URL).
 */
export async function deleteFile(keyOrUrl) {
  const key = keyOrUrl.startsWith(process.env.R2_PUBLIC_URL || "\0")
    ? keyOrUrl.replace(`${process.env.R2_PUBLIC_URL}/`, "")
    : keyOrUrl.replace(/^\/uploads\//, "");

  if (driver === "r2") {
    await getR2Client()
      .send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key }))
      .catch(() => {});
    return;
  }

  await fs.unlink(path.join(uploadDir, key)).catch(() => {});
}
