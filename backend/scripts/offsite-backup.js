/**
 * Off-server copies of the nightly database backup, in the private R2 bucket
 * (R2_PRIVATE_BUCKET, never public). Run inside the devegen-api container,
 * which already has the R2 credentials; the backup arrives on stdin.
 *
 *   node scripts/offsite-backup.js upload <file-name>   < dump   store a backup
 *   node scripts/offsite-backup.js prune                         apply retention
 *   node scripts/offsite-backup.js list                          show stored backups
 *   node scripts/offsite-backup.js download <file-name>  > dump   fetch one (restores)
 *   node scripts/offsite-backup.js notify "<subject>" "<text>"   email the super admins
 *
 * Retention: the 30 most recent backups, plus the last backup of each of the
 * previous 12 months.
 */
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand, GetObjectCommand } from "@aws-sdk/client-s3";

const PREFIX = "backups/devegen/";
const KEEP_RECENT = 30;
const KEEP_MONTHS = 12;
const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PRIVATE_BUCKET: BUCKET } = process.env;

const client = () => {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !BUCKET) throw new Error("R2 private bucket settings are missing.");
  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
};

const safeName = (name) => {
  if (!/^devegen-\d{8}T\d{6}Z\.dump$/.test(name || "")) throw new Error(`Unexpected backup name: ${name}`);
  return name;
};

async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks);
}

async function listAll(s3) {
  const out = [];
  let token;
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: PREFIX, ContinuationToken: token }));
    out.push(...(page.Contents || []));
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return out.filter((o) => /devegen-\d{8}T\d{6}Z\.dump$/.test(o.Key)).sort((a, b) => b.Key.localeCompare(a.Key)); // newest first
}

const commands = {
  async upload(name) {
    const body = await readStdin();
    if (body.length < 1024 || body.subarray(0, 5).toString() !== "PGDMP") throw new Error("Refusing to upload: not a PostgreSQL custom-format dump.");
    await client().send(new PutObjectCommand({ Bucket: BUCKET, Key: PREFIX + safeName(name), Body: body, ContentType: "application/octet-stream" }));
    console.log(`offsite: stored ${name} (${Math.round(body.length / 1024)} KB)`);
  },

  async prune() {
    const s3 = client();
    const all = await listAll(s3);
    const keep = new Set(all.slice(0, KEEP_RECENT).map((o) => o.Key));
    const monthly = new Map(); // newest backup per month
    for (const o of all) {
      const month = o.Key.match(/devegen-(\d{6})/)[1];
      if (!monthly.has(month)) monthly.set(month, o.Key);
    }
    [...monthly.values()].slice(0, KEEP_MONTHS + 1).forEach((k) => keep.add(k));
    const remove = all.filter((o) => !keep.has(o.Key));
    if (remove.length) await s3.send(new DeleteObjectsCommand({ Bucket: BUCKET, Delete: { Objects: remove.map((o) => ({ Key: o.Key })) } }));
    console.log(`offsite: ${all.length - remove.length} kept, ${remove.length} removed`);
  },

  async list() {
    for (const o of await listAll(client())) console.log(`${o.Key.slice(PREFIX.length)}  ${Math.round(o.Size / 1024)} KB`);
  },

  async download(name) {
    const res = await client().send(new GetObjectCommand({ Bucket: BUCKET, Key: PREFIX + safeName(name) }));
    for await (const chunk of res.Body) process.stdout.write(chunk);
  },

  async notify(subject, text) {
    const { sendMail } = await import("../src/services/mail.service.js");
    const { prisma } = await import("../src/config/prisma.js");
    const admins = await prisma.user.findMany({ where: { role: "SUPER_ADMIN", isActive: true, deletedAt: null }, select: { email: true } });
    if (admins.length) await sendMail({ to: admins.map((a) => a.email), subject, text });
    await prisma.$disconnect();
    console.log(`notify: sent to ${admins.length} super admin(s)`);
  },
};

const [cmd, ...args] = process.argv.slice(2);
if (!commands[cmd]) {
  console.error("Usage: offsite-backup.js upload|prune|list|download|notify …");
  process.exit(2);
}
commands[cmd](...args).catch((err) => {
  console.error(`offsite ${cmd} failed: ${err.message}`);
  process.exit(1);
});
