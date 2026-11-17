/**
 * One-time copy of the live data from the old MySQL database (TiDB Cloud)
 * into the new PostgreSQL database.
 *
 *   SOURCE_DATABASE_URL  mysql://user:pass@host:4000/portfolio   (read only)
 *   DATABASE_URL         postgresql://…  (migrated with `prisma migrate deploy`, still empty)
 *
 *   node scripts/copy-mysql-to-postgres.js            # check, copy, verify row counts
 *   node scripts/copy-mysql-to-postgres.js --dry-run  # check and report; writes nothing
 *   node scripts/copy-mysql-to-postgres.js --reset    # empty the target first, then copy
 *
 * Every row is checked against the new schema BEFORE anything is written
 * (also in --dry-run): values the new database would reject are listed by
 * table, row id and field, and nothing is copied until they're fixed.
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
const RESET = process.argv.includes("--reset");
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

  const enumValues = Object.fromEntries(Prisma.dmmf.datamodel.enums.map((e) => [e.name, new Set(e.values.map((v) => v.name))]));
  const plan = [];
  const problems = [];

  // Pass 1: read and check everything; write nothing.
  for (const model of models) {
    const table = model.dbName || model.name;
    const scalars = model.fields.filter((f) => f.kind === "scalar" || f.kind === "enum");
    if (SKIP_TABLES.has(table)) { plan.push({ model, table, data: [], report: { table, source: "-", copied: 0, note: "not copied (sessions)" } }); continue; }
    if (!sourceTables.has(table)) { plan.push({ model, table, data: [], report: { table, source: "-", copied: 0, note: "new table" } }); continue; }

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
    for (const row of data) {
      for (const f of shared) {
        const v = row[f.name];
        const where = { table, row: String(row.id ?? JSON.stringify(Object.values(row).slice(0, 2))).slice(0, 40), field: f.name };
        if (v === null || v === undefined) {
          if (f.isRequired && !f.hasDefaultValue) problems.push({ ...where, value: "(empty)", reason: "required in the new schema" });
          continue;
        }
        if (f.kind === "enum" && !enumValues[f.type].has(v)) {
          problems.push({ ...where, value: String(v).slice(0, 40), reason: `not one of: ${[...enumValues[f.type]].join(", ")}` });
        } else if (f.type === "Int" && !Number.isInteger(v)) {
          problems.push({ ...where, value: String(v).slice(0, 40), reason: "not a whole number" });
        } else if (f.type === "DateTime" && Number.isNaN(v.getTime())) {
          problems.push({ ...where, value: "(invalid date)", reason: "not a valid date" });
        }
      }
    }
    const missing = scalars.filter((f) => !sourceColumns.has(f.dbName || f.name)).map((f) => f.name);
    plan.push({ model, table, data, report: { table, source: sourceCount, copied: `(${data.length})`, note: [note, missing.length ? `new columns use defaults: ${missing.join(", ")}` : ""].filter(Boolean).join("; ") } });
  }

  if (problems.length) {
    console.error(`\n${problems.length} value(s) the new database would reject. Nothing was written.`);
    console.table(problems.slice(0, 50));
    process.exitCode = 1;
    return;
  }

  if (DRY_RUN) {
    console.table(plan.map((p) => p.report));
    console.log("All rows passed the checks. Dry run complete. Nothing was written.");
    return;
  }

  // Pass 2: write.
  if (RESET) {
    const dbName = new URL(process.env.DATABASE_URL).pathname.slice(1);
    if (dbName === "motolink") throw new Error("Refusing to reset MotoGo's database.");
    const tables = Prisma.dmmf.datamodel.models.map((m) => `"${m.dbName || m.name}"`).join(", ");
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE`);
    console.log(`Emptied every table in "${dbName}" before copying.`);
  } else {
    for (const { model, table } of plan) {
      if (await delegate(model).count()) {
        throw new Error(`Target table ${table} already has rows. Run again with --reset to empty the target first.`);
      }
    }
  }

  const report = [];
  for (const { model, table, data, report: r } of plan) {
    try {
      for (let i = 0; i < data.length; i += BATCH) await delegate(model).createMany({ data: data.slice(i, i + BATCH) });
    } catch (err) {
      // Find the first row that fails, to name it precisely.
      for (const row of data) {
        try { await delegate(model).create({ data: row }); } catch (rowErr) {
          const reason = String(rowErr.message).split("\n").map((l) => l.trim()).filter(Boolean).slice(-3).join(" ");
          throw new Error(`Copying ${table} failed at row ${row.id ?? "?"}: ${reason.slice(0, 400)}`);
        }
      }
      throw new Error(`Copying ${table} failed: ${String(err.message).split("\n").filter(Boolean).slice(-2).join(" ").slice(0, 400)}`);
    }
    report.push({ ...r, copied: await delegate(model).count() });
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
