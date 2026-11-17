// Storage adapter — controllers never know *where* a file physically
// lives. Both drivers take the same shape: { buffer, filename, mimetype }.
// Switching STORAGE_DRIVER=r2 in .env (with R2_* credentials filled in)
// is the only change needed to move from local disk to Cloudflare R2.

import fs from "fs/promises";
import path from "path";
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

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

// The frontend usually lives on another domain, so local URLs are made
// absolute with API_PUBLIC_URL (e.g. https://api.example.com) when set.
async function saveLocal({ buffer, filename }) {
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, filename), buffer);
  const base = (process.env.API_PUBLIC_URL || "").replace(/\/$/, "");
  return { url: `${base}/uploads/${filename}`, key: filename, driver: "local" };
}

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
    : keyOrUrl.replace(/^.*\/uploads\//, "");

  if (driver === "r2") {
    await getR2Client()
      .send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key }))
      .catch(() => {});
    return;
  }

  await fs.unlink(path.join(uploadDir, key)).catch(() => {});
}

// ---------------------------------------------------------------------------
// Private files (e.g. original certificate PDFs). Never publicly reachable:
//  - local: PRIVATE_UPLOAD_DIR, which is not served by express.static
//  - r2:    a separate bucket, R2_PRIVATE_BUCKET, with no public access.
//           (A public bucket exposes every object in it, so the public
//           bucket must not be reused.)
// ---------------------------------------------------------------------------

const privateDir = process.env.PRIVATE_UPLOAD_DIR || "./private_uploads";

export function privateStorageAvailable() {
  return driver !== "r2" || Boolean(process.env.R2_PRIVATE_BUCKET);
}

const safeKey = (key) => {
  if (!/^[\w.-]+$/.test(key)) throw new Error("Invalid private file key.");
  return key;
};

export async function savePrivateFile({ buffer, filename, mimetype }) {
  if (!privateStorageAvailable()) {
    throw Object.assign(new Error("Private storage not configured."), {
      status: 503,
      publicMessage: "Private file storage isn't set up on the server (R2_PRIVATE_BUCKET). The original wasn't saved.",
    });
  }
  const key = safeKey(filename);
  if (driver === "r2") {
    await getR2Client().send(new PutObjectCommand({ Bucket: process.env.R2_PRIVATE_BUCKET, Key: key, Body: buffer, ContentType: mimetype }));
  } else {
    await fs.mkdir(privateDir, { recursive: true });
    await fs.writeFile(path.join(privateDir, key), buffer);
  }
  return { key };
}

export async function readPrivateFile(key) {
  safeKey(key);
  if (driver === "r2") {
    const res = await getR2Client().send(new GetObjectCommand({ Bucket: process.env.R2_PRIVATE_BUCKET, Key: key }));
    return Buffer.from(await res.Body.transformToByteArray());
  }
  return fs.readFile(path.join(privateDir, key));
}

export async function deletePrivateFile(key) {
  if (!key) return;
  safeKey(key);
  if (driver === "r2") {
    await getR2Client().send(new DeleteObjectCommand({ Bucket: process.env.R2_PRIVATE_BUCKET, Key: key })).catch(() => {});
    return;
  }
  await fs.unlink(path.join(privateDir, key)).catch(() => {});
}
