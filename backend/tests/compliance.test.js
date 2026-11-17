/**
 * Business registration & compliance: facts public, documents private,
 * super-admin only, expiry reminders. Same prerequisites as other tests.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import { startApp } from "./helpers.js";

const t = await startApp({ mail: true });
const { prisma, api, login } = t;
const { getOutbox } = await import("../src/services/mail.service.js");
const { runComplianceReminders } = await import("../src/services/complianceReminders.service.js");

const EDITOR = "editor.compliance@example.com";
const PRIVATE_DIR = process.env.PRIVATE_UPLOAD_DIR || "./private_uploads";
const PDF = Buffer.from("%PDF-1.4\n%%EOF\n");
const tok = {};
const ids = {};
const DAY = 86400000;

before(async () => {
  await prisma.user.deleteMany({ where: { email: EDITOR } });
  const solutions = await prisma.brand.findUnique({ where: { key: "solutions" } });
  await prisma.user.create({
    data: { name: "Brand Admin", email: EDITOR, role: "ADMIN", passwordHash: await bcrypt.hash("Compliance-pass-1", 4), brandRoles: { create: { brandId: solutions.id, scope: "ADMIN" } } },
  });
  tok.super = (await login("admin@example.com", "ChangeMe123!")).token;
  tok.brandAdmin = (await login(EDITOR, "Compliance-pass-1")).token;
  const org = await api("POST", "/admin/organizations", { token: tok.super, body: { legalName: "Test Org Compliance LTD", registrationType: "Private limited company", registry: "PACRA" } });
  ids.org = org.body.id;
});

after(async () => {
  const creds = await prisma.organizationCredential.findMany({ where: { organizationId: ids.org } });
  for (const c of creds) if (c.originalKey) await fs.unlink(path.join(PRIVATE_DIR, c.originalKey)).catch(() => {});
  await prisma.organization.deleteMany({ where: { id: ids.org } });
  await prisma.user.deleteMany({ where: { email: EDITOR } });
  await prisma.$disconnect();
  t.close();
});

const credential = (overrides = {}) => ({
  type: "PACRA_REGISTRATION", title: "Certificate of Incorporation", authority: "Patents and Companies Registration Agency (PACRA)",
  referenceNumber: "TEST-0001", issuedAt: "2025-03-01", verificationNote: "Search the registered name on PACRA's online services.", ...overrides,
});

test("only super admins manage compliance records", async () => {
  assert.equal((await api("GET", "/admin/organizations", { token: tok.brandAdmin })).status, 403, "even a brand admin can't");
  assert.equal((await api("POST", `/admin/organizations/${ids.org}/credentials`, { token: tok.brandAdmin, body: credential() })).status, 403);
  const bad = await api("POST", `/admin/organizations/${ids.org}/credentials`, { token: tok.super, body: credential({ verificationUrl: "javascript:alert(1)" }) });
  assert.equal(bad.status, 400);
});

test("records are private until switched on, then only the facts are public", async () => {
  const pacra = await api("POST", `/admin/organizations/${ids.org}/credentials`, { token: tok.super, body: credential() });
  assert.equal(pacra.status, 201);
  ids.pacra = pacra.body.id;
  let pub = (await api("GET", "/compliance")).body.organizations.find((o) => o.legalName === "Test Org Compliance LTD");
  assert.equal(pub, undefined, "not public by default");

  await api("PATCH", `/admin/credentials/${ids.pacra}`, { token: tok.super, body: { isPublic: true } });
  pub = (await api("GET", "/compliance")).body.organizations.find((o) => o.legalName === "Test Org Compliance LTD");
  assert.ok(pub);
  const c = pub.credentials[0];
  assert.equal(c.referenceNumber, "TEST-0001");
  for (const hidden of ["originalKey", "originalName", "isPublic", "reminder60SentAt", "notes"]) assert.equal(c[hidden], undefined, hidden);
  assert.equal(pub.notes, undefined, "internal organisation notes stay private");
});

test("the document is stored privately; there is no public copy", async () => {
  const form = new FormData();
  form.append("original", new Blob([PDF], { type: "application/pdf" }), "incorporation.pdf");
  const res = await fetch(`${t.base}/api/v1/admin/credentials/${ids.pacra}/file`, { method: "POST", body: form, headers: { authorization: `Bearer ${tok.super}`, "x-forwarded-for": "192.0.2.80" } });
  assert.equal(res.status, 201);
  const row = await prisma.organizationCredential.findUnique({ where: { id: ids.pacra } });
  assert.deepEqual(await fs.readFile(path.join(PRIVATE_DIR, row.originalKey)), PDF);
  assert.ok(!JSON.stringify((await api("GET", "/compliance")).body).includes(row.originalKey));
  assert.equal((await api("GET", `/admin/credentials/${ids.pacra}/original`, { token: tok.brandAdmin })).status, 403);
  const dl = await fetch(`${t.base}/api/v1/admin/credentials/${ids.pacra}/original`, { headers: { authorization: `Bearer ${tok.super}` } });
  assert.equal(dl.status, 200);
});

test("expired records disappear from the website automatically", async () => {
  const zicta = await api("POST", `/admin/organizations/${ids.org}/credentials`, {
    token: tok.super, body: credential({ type: "ZICTA_LICENCE", title: "Test Licence", authority: "ZICTA", referenceNumber: "Z-1", issuedAt: "2024-01-01", expiresAt: new Date(Date.now() - DAY).toISOString(), isPublic: true }),
  });
  ids.zicta = zicta.body.id;
  assert.equal(zicta.body.state, "EXPIRED");
  const pub = (await api("GET", "/compliance")).body.organizations.find((o) => o.legalName === "Test Org Compliance LTD");
  assert.ok(!pub.credentials.some((c) => c.referenceNumber === "Z-1"));
});

test("renewal reminders go out at 60 and 30 days, once each, and reset on renewal", async () => {
  getOutbox().length = 0;
  await api("PATCH", `/admin/credentials/${ids.zicta}`, { token: tok.super, body: { expiresAt: new Date(Date.now() + 45 * DAY).toISOString() } });
  await runComplianceReminders();
  assert.equal(getOutbox().filter((m) => m.subject.includes("Test Licence")).length, 1, "60-day reminder");
  await runComplianceReminders();
  assert.equal(getOutbox().filter((m) => m.subject.includes("Test Licence")).length, 1, "not repeated");
  await runComplianceReminders(new Date(Date.now() + 20 * DAY));
  assert.equal(getOutbox().filter((m) => m.subject.includes("Test Licence")).length, 2, "30-day reminder");
  assert.ok(getOutbox()[0].to.includes("admin@example.com"));

  const renewed = await api("PATCH", `/admin/credentials/${ids.zicta}`, { token: tok.super, body: { expiresAt: new Date(Date.now() + 400 * DAY).toISOString() } });
  assert.equal(renewed.body.reminder60SentAt, null, "renewal resets reminders");
  assert.equal(renewed.body.state, "VALID");
});

test("the dashboard counts registrations that need renewal for super admins", async () => {
  await api("PATCH", `/admin/credentials/${ids.zicta}`, { token: tok.super, body: { expiresAt: new Date(Date.now() + 10 * DAY).toISOString() } });
  assert.ok((await api("GET", "/admin/summary", { token: tok.super })).body.expiringCredentialCount >= 1);
  assert.equal((await api("GET", "/admin/summary", { token: tok.brandAdmin })).body.expiringCredentialCount, 0);
});

test("the DevGen Ventures sitemap lists the compliance page", async () => {
  assert.ok((await api("GET", "/sitemap.xml?site=devegen", { raw: true })).body.includes("/compliance"));
});
