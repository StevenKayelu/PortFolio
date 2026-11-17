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
 *   node scripts/offsite-backup.js create-bucket                 create the set's bucket if missing
 *
 * OFFSITE_SET picks whose backups these are:
 *   devegen (default)  DevGen database, R2_PRIVATE_BUCKET, backups/devegen/
 *   motogo             MotoGo database dumps and documents archives, in their own
 *                      private bucket (MOTOGO_BACKUP_BUCKET, default "motogo-backups")
 *
 * Retention, per kind of file: the 30 most recent, plus the last one of each of
 * the previous 12 months.
 */
import {
  S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand, GetObjectCommand, CreateBucketCommand, HeadBucketCommand,
} from "@aws-sdk/client-s3";

const KEEP_RECENT = 30;
const KEEP_MONTHS = 12;
const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;

const SETS = {
  devegen: {
    bucket: process.env.R2_PRIVATE_BUCKET,
    prefix: "backups/devegen/",
    // kind is the part that identifies the type of file; the date follows it
    pattern: /^(devegen)-(\d{8}T\d{6}Z)\.dump$/,
  },
  motogo: {
    bucket: process.env.MOTOGO_BACKUP_BUCKET || "motogo-backups",
    prefix: "motogo/",
    pattern: /^(motogo|motogo-documents)-(\d{8}T\d{4}Z)\.(?:dump|tar\.gz)$/,
  },
};
const SET = SETS[process.env.OFFSITE_SET || "devegen"];
if (!SET) throw new Error(`Unknown OFFSITE_SET: ${process.env.OFFSITE_SET}`);
const { bucket: BUCKET, prefix: PREFIX } = SET;

const client = () => {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !BUCKET) throw new Error("R2 private bucket settings are missing.");
  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
};

const safeName = (name) => {
  if (!SET.pattern.test(name || "")) throw new Error(`Unexpected backup name: ${name}`);
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
  return out
    .filter((o) => SET.pattern.test(o.Key.slice(PREFIX.length)))
    .sort((a, b) => SET.pattern.exec(b.Key.slice(PREFIX.length))[2].localeCompare(SET.pattern.exec(a.Key.slice(PREFIX.length))[2])); // newest first
}

const commands = {
  async upload(name) {
    const body = await readStdin();
    const isDump = name.endsWith(".dump");
    const looksRight = isDump ? body.subarray(0, 5).toString() === "PGDMP" : body[0] === 0x1f && body[1] === 0x8b;
    if (body.length < 512 || !looksRight) throw new Error(`Refusing to upload ${name}: not a ${isDump ? "PostgreSQL dump" : "gzip archive"}.`);
    await client().send(new PutObjectCommand({ Bucket: BUCKET, Key: PREFIX + safeName(name), Body: body, ContentType: "application/octet-stream" }));
    console.log(`offsite: stored ${name} (${Math.round(body.length / 1024)} KB)`);
  },

  async prune() {
    const s3 = client();
    const all = await listAll(s3);
    const keep = new Set();
    const byKind = new Map();
    for (const o of all) {
      const [, kind] = SET.pattern.exec(o.Key.slice(PREFIX.length));
      if (!byKind.has(kind)) byKind.set(kind, []);
      byKind.get(kind).push(o); // still newest first
    }
    for (const items of byKind.values()) {
      items.slice(0, KEEP_RECENT).forEach((o) => keep.add(o.Key));
      const monthly = new Map(); // newest backup per month
      for (const o of items) {
        const month = SET.pattern.exec(o.Key.slice(PREFIX.length))[2].slice(0, 6);
        if (!monthly.has(month)) monthly.set(month, o.Key);
      }
      [...monthly.values()].slice(0, KEEP_MONTHS + 1).forEach((k) => keep.add(k));
    }
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

  async "create-bucket"() {
    const s3 = client();
    try {
      await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
      console.log(`bucket ${BUCKET} already exists`);
    } catch {
      await s3.send(new CreateBucketCommand({ Bucket: BUCKET })); // R2 buckets are private unless public access is turned on
      console.log(`bucket ${BUCKET} created (private)`);
    }
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
  console.error("Usage: offsite-backup.js upload|prune|list|download|notify|create-bucket …");
  process.exit(2);
}
commands[cmd](...args).catch((err) => {
  console.error(`offsite ${cmd} failed: ${err.message}`);
  process.exit(1);
});
