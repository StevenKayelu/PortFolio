/**
 * One-time copy of the live data from the old MySQL database (TiDB Cloud)
 * into the new PostgreSQL database.
 *
 *   SOURCE_DATABASE_URL  mysql://user:pass@host:4000/portfolio   (read only)
 *   DATABASE_URL         postgresql://…  (migrated with `prisma migrate deploy`, still empty)
 *
 *   node scripts/copy-mysql-to-postgres.js            # copy, then verify row counts
 *   node scripts/copy-mysql-to-postgres.js --dry-run  # report what would be copied
 *
 * Run it BEFORE `node prisma/seed-ecosystem.js` (the seed only fills gaps).
 * It refuses to write into a database that already has data.
 *
 * What it deliberately does not copy:
 *  - refresh_tokens: sessions are not carried over; everyone signs in again
 *  - the two template placeholder certificates (AWS-000000, PSM-000000),
 *    matching the MySQL migration that deletes them
 *  - the template's sample gallery items and achievements (a conference
 *    talk and a hackathon win that never happened), matched by exact title
 * Tables that exist only in the new schema start empty; new columns take
 * their defaults (e.g. projects start as ownership NEEDS_REVIEW).
 */
import { Prisma, PrismaClient } from "@prisma/client";
import mysql from "mysql2/promise";

const DRY_RUN = process.argv.includes("--dry-run");
const BATCH = 500;
const SKIP_TABLES = new Set(["refresh_tokens"]);
// Template sample content, skipped by exact title only: anything the owner
// added or renamed is copied normally.
const TEMPLATE_TITLES = {
  gallery_items: ["Conference talk, 2025", "Hackathon win, 2023", "Workstation setup"],
  achievements: ["Speaker, Regional Dev Conference", "Hackathon Winner"],
};
const PLACEHOLDER_CERTS = [
  { title: "AWS Certified Solutions Architect", credentialId: "AWS-000000" },
  { title: "Professional Scrum Master I", credentialId: "PSM-000000" },
];

const prisma = new PrismaClient();
let source; // closed in finally, so an early refusal can't leave the process hanging

function sourceConfig(urlString) {
  const url = new URL(urlString);
  if (url.protocol !== "mysql:") throw new Error("SOURCE_DATABASE_URL must start with mysql://");
  const needsTls = /tidbcloud\.com$/.test(url.hostname) || url.searchParams.get("ssl") === "true" || url.searchParams.has("sslaccept");
  return {
    host: url.hostname,
    port: Number(url.port) || 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    ssl: needsTls ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined,
    charset: "utf8mb4", // full Unicode (emoji, accents) regardless of server defaults
    timezone: "Z",
    dateStrings: false,
    supportBigNumbers: true,
    bigNumberStrings: true,
  };
}

/** Models ordered so every foreign key's target is copied first. */
function modelsInDependencyOrder() {
  const models = Prisma.dmmf.datamodel.models;
  const deps = new Map(models.map((m) => [m.name, new Set(
    m.fields.filter((f) => f.kind === "object" && f.relationFromFields?.length && f.type !== m.name).map((f) => f.type)
  )]));
  const ordered = [];
  const visit = (name, seen = new Set()) => {
    if (ordered.includes(name)) return;
    if (seen.has(name)) throw new Error(`Circular relation at ${name}`);
    seen.add(name);
    for (const d of deps.get(name)) visit(d, seen);
    ordered.push(name);
  };
  models.forEach((m) => visit(m.name));
  return ordered.map((name) => models.find((m) => m.name === name));
}

function convert(field, value) {
  if (value === null || value === undefined) return value;
  switch (field.type) {
    case "Boolean": return value === true || value === 1 || value === "1";
    case "Json": return typeof value === "string" ? JSON.parse(value) : value;
    case "Int": return typeof value === "string" ? Number(value) : value;
    case "Decimal": return String(value);
    case "DateTime": return value instanceof Date ? value : new Date(value);
    default: return Buffer.isBuffer(value) ? value.toString("utf8") : value;
  }
}

const delegate = (model) => prisma[model.name.charAt(0).toLowerCase() + model.name.slice(1)];

async function main() {
  if (!process.env.SOURCE_DATABASE_URL) throw new Error("Set SOURCE_DATABASE_URL to the old MySQL database.");
  if (!/^postgres(ql)?:\/\//.test(process.env.DATABASE_URL || "")) throw new Error("DATABASE_URL must be the new PostgreSQL database.");

  source = await mysql.createConnection(sourceConfig(process.env.SOURCE_DATABASE_URL));
  const [tableRows] = await source.query("SHOW TABLES");
  const sourceTables = new Set(tableRows.map((r) => Object.values(r)[0]));
  const models = modelsInDependencyOrder();

  // Never merge into a database that already has content.
  if (!DRY_RUN) {
    for (const model of models) {
      if (await delegate(model).count()) {
        throw new Error(`Target table ${model.dbName || model.name} already has rows. Use a fresh, migrated, unseeded database.`);
      }
    }
  }

  const report = [];
  for (const model of models) {
    const table = model.dbName || model.name;
    const scalars = model.fields.filter((f) => f.kind === "scalar" || f.kind === "enum");
    if (SKIP_TABLES.has(table)) { report.push({ table, source: "-", copied: 0, note: "not copied (sessions)" }); continue; }
    if (!sourceTables.has(table)) { report.push({ table, source: "-", copied: 0, note: "new table" }); continue; }

    const [columnRows] = await source.query(`SHOW COLUMNS FROM \`${table}\``);
    const sourceColumns = new Set(columnRows.map((c) => c.Field));
    const shared = scalars.filter((f) => sourceColumns.has(f.dbName || f.name));
    const selfRef = model.fields.find((f) => f.kind === "object" && f.type === model.name && f.relationFromFields?.length);
    const order = selfRef ? ` ORDER BY \`${selfRef.relationFromFields[0]}\` IS NOT NULL, \`${selfRef.relationFromFields[0]}\`` : "";

    let [rows] = await source.query(`SELECT ${shared.map((f) => `\`${f.dbName || f.name}\``).join(", ")} FROM \`${table}\`${order}`);
    const sourceCount = rows.length;
    let note = "";
    if (table === "certificates") {
      rows = rows.filter((r) => !PLACEHOLDER_CERTS.some((p) => p.title === r.title && p.credentialId === r.credentialId));
      if (rows.length !== sourceCount) note = `skipped ${sourceCount - rows.length} placeholder certificate(s)`;
    }

    if (TEMPLATE_TITLES[table]) {
      const before = rows.length;
      rows = rows.filter((r) => !TEMPLATE_TITLES[table].includes(r.title));
      if (rows.length !== before) note = `skipped ${before - rows.length} template item(s)`;
    }

    const data = rows.map((r) => Object.fromEntries(shared.map((f) => [f.name, convert(f, r[f.dbName || f.name])])));
    if (!DRY_RUN) {
      for (let i = 0; i < data.length; i += BATCH) await delegate(model).createMany({ data: data.slice(i, i + BATCH) });
    }
    const missing = scalars.filter((f) => !sourceColumns.has(f.dbName || f.name)).map((f) => f.name);
    report.push({ table, source: sourceCount, copied: DRY_RUN ? `(${data.length})` : await delegate(model).count(), note: [note, missing.length ? `new columns use defaults: ${missing.join(", ")}` : ""].filter(Boolean).join("; ") });
  }
  console.table(report);
  const mismatched = report.filter((r) => typeof r.source === "number" && !DRY_RUN && r.copied !== r.source && !/placeholder|template/.test(r.note));
  if (mismatched.length) {
    console.error("Row counts differ for:", mismatched.map((r) => r.table).join(", "));
    process.exitCode = 1;
  } else {
    console.log(DRY_RUN ? "Dry run complete. Nothing was written." : "Copy complete. Row counts match. Next: node prisma/seed-ecosystem.js");
  }
}

main()
  .catch((err) => { console.error(err.message); process.exitCode = 1; })
  .finally(async () => {
    await source?.end().catch(() => {});
    await prisma.$disconnect();
  });
