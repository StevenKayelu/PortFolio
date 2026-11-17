/**
 * Integration tests for the ecosystem, enquiry and authorization rules.
 *
 * Needs a disposable, migrated + seeded database — never production:
 *   DATABASE_URL=mysql://…/devegen_test npx prisma migrate deploy
 *   node prisma/seed.js && node prisma/seed-ecosystem.js
 *   DATABASE_URL=… npm run test:integration
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";

process.env.JWT_ACCESS_SECRET ||= "test-access-secret";
process.env.JWT_REFRESH_SECRET ||= "test-refresh-secret";
process.env.TRUST_PROXY = "1"; // lets each test request present its own client IP
process.env.NODE_ENV = "test";

if (/onrender|tidb|amazonaws|planetscale/i.test(process.env.DATABASE_URL || "")) {
  throw new Error("Refusing to run integration tests against what looks like a hosted database.");
}

const { default: app } = await import("../src/app.js");
const { prisma } = await import("../src/config/prisma.js");

let server, base;
let ipCounter = 0;
const nextIp = () => `203.0.113.${++ipCounter}`;

async function api(method, path, { body, token, ip = nextIp() } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function login(email, password) {
  const res = await api("POST", "/auth/login", { body: { email, password } });
  assert.equal(res.status, 200, `login failed for ${email}`);
  return res.body.accessToken;
}

const enquiry = (overrides = {}) => ({
  site: "steven", type: "QUOTE", name: "Test Client", email: "client@example.com",
  message: "We need a stock management system for three shops.", consent: true, ...overrides,
});

const tokens = {};
const ids = {};
const TEST_EMAILS = ["editor.test@example.com", "leads.test@example.com"];

before(async () => {
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}/api/v1`;

  const brands = Object.fromEntries((await prisma.brand.findMany()).map((b) => [b.key, b.id]));
  assert.ok(brands.solutions && brands.devegen, "run prisma/seed-ecosystem.js first");
  ids.brands = brands;

  await prisma.user.deleteMany({ where: { email: { in: TEST_EMAILS } } });
  const passwordHash = await bcrypt.hash("Test-password-1", 4);
  const editor = await prisma.user.create({
    data: { name: "Solutions Editor", email: TEST_EMAILS[0], passwordHash, role: "EDITOR", brandRoles: { create: { brandId: brands.solutions, scope: "EDITOR" } } },
  });
  const leadManager = await prisma.user.create({
    data: { name: "Devegen Leads", email: TEST_EMAILS[1], passwordHash, role: "EDITOR", brandRoles: { create: { brandId: brands.devegen, scope: "LEAD_MANAGER" } } },
  });
  ids.editor = editor.id;
  ids.leadManager = leadManager.id;

  // Own fixture instead of the seeded products, which an admin may have edited.
  const solutionsVenture = await prisma.venture.findUnique({ where: { slug: "devgen-solutions" } });
  await prisma.product.deleteMany({ where: { slug: "test-draft-product" } });
  ids.product = (await prisma.product.create({
    data: { name: "Test Draft Product", slug: "test-draft-product", status: "DRAFT", ventureId: solutionsVenture.id },
  })).id;

  tokens.super = await login("admin@example.com", "ChangeMe123!");
  tokens.editor = await login(TEST_EMAILS[0], "Test-password-1");
  tokens.leads = await login(TEST_EMAILS[1], "Test-password-1");
});

after(async () => {
  await prisma.lead.deleteMany({ where: { email: { endsWith: "@example.com" } } });
  const testVentures = await prisma.venture.findMany({ where: { slug: { startsWith: "test-" } }, select: { id: true } });
  await prisma.contentRevision.deleteMany({ where: { entityId: { in: testVentures.map((v) => v.id) } } });
  await prisma.venture.deleteMany({ where: { slug: { startsWith: "test-" } } });
  await prisma.project.deleteMany({ where: { slug: { startsWith: "test-" } } });
  await prisma.service.deleteMany({ where: { slug: { startsWith: "test-" } } });
  await prisma.product.deleteMany({ where: { slug: "test-draft-product" } });
  await prisma.user.deleteMany({ where: { email: { in: TEST_EMAILS } } });
  await prisma.$disconnect();
  server.close();
});

// ------------------------------------------------------------------ public

test("public ecosystem exposes published records only, without internal notes", async () => {
  const { status, body } = await api("GET", "/ecosystem");
  assert.equal(status, 200);
  assert.deepEqual(body.brands.map((b) => b.key).sort(), ["devegen", "solutions", "steven"]);
  assert.equal(body.relationships.length, 2);
  assert.ok(body.ventures.some((v) => v.slug === "devgen-solutions"));
  // Draft products (the default until ownership is confirmed) are never public.
  assert.ok(!body.ventures.flatMap((v) => v.products).some((p) => p.slug === "test-draft-product"));
  const raw = JSON.stringify(body);
  assert.ok(!raw.includes("internalNote") && !raw.includes("PACRA before"), "internal notes leaked");
});

// ---------------------------------------------------------------- enquiries

test("enquiry validation rejects missing consent and bad email with field errors", async () => {
  const res = await api("POST", "/enquiries", { body: enquiry({ consent: false, email: "nope" }) });
  assert.equal(res.status, 400);
  assert.ok(res.body.fields.consent && res.body.fields.email);
});

test("enquiries are routed to a brand by type and site, not by the client", async () => {
  const quote = await api("POST", "/enquiries", { body: { ...enquiry(), brandId: ids.brands.devegen } });
  assert.equal(quote.status, 201);
  assert.match(quote.body.reference, /^DV-[2-9A-Z]{6}$/);
  const lead = await prisma.lead.findUnique({ where: { reference: quote.body.reference } });
  assert.equal(lead.brandId, ids.brands.solutions, "QUOTE must land with DevGen Solutions");
  assert.ok(lead.consentAt && lead.ipHash && !lead.ipHash.includes("203.0.113"));
  ids.quoteLead = lead.id;

  const partnership = await api("POST", "/enquiries", { body: enquiry({ site: "devegen", type: "PARTNERSHIP", email: "partner@example.com" }) });
  assert.equal(partnership.status, 201);
  const pLead = await prisma.lead.findUnique({ where: { reference: partnership.body.reference } });
  assert.equal(pLead.brandId, ids.brands.devegen);
  ids.partnershipLead = pLead.id;
});

test("honeypot submissions get a normal response but are not stored", async () => {
  const before = await prisma.lead.count();
  const res = await api("POST", "/enquiries", { body: enquiry({ website: "http://spam.example" }) });
  assert.equal(res.status, 201);
  assert.equal(await prisma.lead.count(), before);
});

test("enquiries are rate limited per client IP", async () => {
  const ip = nextIp();
  const statuses = [];
  for (let i = 0; i < 4; i += 1) statuses.push((await api("POST", "/enquiries", { body: enquiry({ consent: false }), ip })).status);
  assert.deepEqual(statuses, [400, 400, 400, 429]);
});

// ----------------------------------------------------- brand-scoped access

test("lead lists are limited to the caller's brands", async () => {
  const sup = await api("GET", "/admin/leads", { token: tokens.super });
  const ids_ = sup.body.items.map((l) => l.id);
  assert.ok(ids_.includes(ids.quoteLead) && ids_.includes(ids.partnershipLead));

  const lm = await api("GET", "/admin/leads", { token: tokens.leads });
  assert.deepEqual(lm.body.items.map((l) => l.brand.key), lm.body.items.map(() => "devegen"));
  assert.ok(lm.body.items.some((l) => l.id === ids.partnershipLead));

  const editor = await api("GET", "/admin/leads", { token: tokens.editor });
  assert.equal(editor.body.items.length, 0, "EDITOR scope must not see leads");
});

test("out-of-scope leads return 404, not 403", async () => {
  const res = await api("GET", `/admin/leads/${ids.quoteLead}`, { token: tokens.leads });
  assert.equal(res.status, 404);
});

test("lead status changes and notes are recorded as activity", async () => {
  const upd = await api("PATCH", `/admin/leads/${ids.partnershipLead}`, { token: tokens.leads, body: { status: "QUALIFIED" } });
  assert.equal(upd.status, 200);
  assert.equal(upd.body.status, "QUALIFIED");
  const note = await api("POST", `/admin/leads/${ids.partnershipLead}/notes`, { token: tokens.leads, body: { body: "Called, follow up Friday." } });
  assert.equal(note.status, 201);
  const lead = await api("GET", `/admin/leads/${ids.partnershipLead}`, { token: tokens.leads });
  assert.deepEqual(lead.body.activities.map((a) => a.kind), ["CREATED", "STATUS_CHANGE", "NOTE"]);
  assert.equal(lead.body.ipHash, undefined, "ipHash must not be returned");
});

test("leads cannot be assigned to someone without lead access to that brand", async () => {
  const res = await api("PATCH", `/admin/leads/${ids.partnershipLead}`, { token: tokens.super, body: { assignedToId: ids.editor } });
  assert.equal(res.status, 400);
  const ok = await api("PATCH", `/admin/leads/${ids.partnershipLead}`, { token: tokens.super, body: { assignedToId: ids.leadManager } });
  assert.equal(ok.status, 200);
});

test("editors can draft ventures for their brand but cannot publish or cross brands", async () => {
  const draft = await api("POST", "/admin/ventures", { token: tokens.editor, body: { name: "Test Draft Venture", slug: "test-draft", summary: "Draft", brandId: ids.brands.solutions } });
  assert.equal(draft.status, 201);
  assert.equal(draft.body.status, "DRAFT");

  const publish = await api("PATCH", `/admin/ventures/${draft.body.id}`, { token: tokens.editor, body: { status: "PUBLISHED" } });
  assert.equal(publish.status, 403);

  const other = await api("POST", "/admin/ventures", { token: tokens.editor, body: { name: "Test Other", slug: "test-other", summary: "x", brandId: ids.brands.devegen } });
  assert.equal(other.status, 403);

  const verify = await api("PATCH", `/admin/ventures/${draft.body.id}`, { token: tokens.editor, body: { verificationStatus: "VERIFIED" } });
  assert.equal(verify.status, 403);

  // Resending unchanged guarded fields (as admin forms do) is fine.
  const resave = await api("PATCH", `/admin/ventures/${draft.body.id}`, { token: tokens.editor, body: { summary: "Edited", status: "DRAFT", verificationStatus: "UNVERIFIED", organizationId: null } });
  assert.equal(resave.status, 200);

  const pub = await api("GET", "/ventures");
  assert.ok(!pub.body.items.some((v) => v.slug === "test-draft"), "draft venture must not be public");

  // Once a brand admin (here the super admin) publishes it, editor changes wait for approval.
  assert.equal((await api("PATCH", `/admin/ventures/${draft.body.id}`, { token: tokens.super, body: { status: "PUBLISHED" } })).status, 200);
  const proposal = await api("PATCH", `/admin/ventures/${draft.body.id}`, { token: tokens.editor, body: { summary: "Edit after publishing" } });
  assert.equal(proposal.status, 202);
  assert.equal((await prisma.venture.findUnique({ where: { id: draft.body.id } })).summary, "Edited");
});

test("only a super admin can confirm product ownership or manage relationships", async () => {
  const products = await api("GET", "/admin/products", { token: tokens.editor });
  assert.equal(products.status, 200);
  assert.ok(products.body.items.some((p) => p.id === ids.product), "editor on solutions should see solutions products");
  const confirm = await api("PATCH", `/admin/products/${ids.product}`, { token: tokens.editor, body: { ownershipStatus: "CONFIRMED" } });
  assert.equal(confirm.status, 403);

  assert.equal((await api("GET", "/admin/relationships", { token: tokens.editor })).status, 403);
  assert.equal((await api("GET", "/admin/relationships", { token: tokens.super })).status, 200);
});

test("revoking a user takes effect immediately, not at token expiry", async () => {
  await prisma.user.update({ where: { id: ids.leadManager }, data: { isActive: false } });
  const res = await api("GET", "/admin/leads", { token: tokens.leads });
  assert.equal(res.status, 401);
  await prisma.user.update({ where: { id: ids.leadManager }, data: { isActive: true } });
});

test("unauthenticated admin requests are rejected", async () => {
  assert.equal((await api("GET", "/admin/leads")).status, 401);
  assert.equal((await api("GET", "/admin/brands")).status, 401);
});

// ------------------------------------------------- projects + mass assignment

test("draft and private projects are hidden from the public", async () => {
  const draft = await api("POST", "/projects", {
    token: tokens.super,
    body: { title: "Test Hidden Project", slug: "test-hidden", summary: "s", description: "d", status: "DRAFT", viewCount: 999, id: "forged-id" },
  });
  assert.equal(draft.status, 201);
  assert.notEqual(draft.body.id, "forged-id", "id must not be client-assignable");
  assert.equal(draft.body.viewCount, 0, "viewCount must not be client-assignable");
  assert.equal(draft.body.ownershipStatus, "NEEDS_REVIEW");

  const list = await api("GET", "/projects?pageSize=50");
  assert.ok(!list.body.items.some((p) => p.slug === "test-hidden"));
  assert.ok(list.body.items.every((p) => p.publicationPermission === undefined), "internal field leaked");
  assert.equal((await api("GET", "/projects/test-hidden")).status, 404);
  assert.equal((await api("GET", "/projects?status=DRAFT")).body.items.length, 0);

  const staff = await api("GET", "/projects?includeHidden=true&pageSize=50", { token: tokens.super });
  assert.ok(staff.body.items.some((p) => p.slug === "test-hidden"));
  assert.equal((await api("GET", "/projects/test-hidden", { token: tokens.super })).status, 200);
});

test("project contributors are saved and replaced wholesale", async () => {
  const project = await prisma.project.findUnique({ where: { slug: "test-hidden" } });
  const res = await api("PATCH", `/projects/${project.id}`, {
    token: tokens.super,
    body: { contributors: [{ name: "Steven Kayelu", role: "Lead developer" }, { name: "Client Co", role: "Client" }], ownershipStatus: "NOT_OWNED" },
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.contributors.length, 2);
  const bad = await api("PATCH", `/projects/${project.id}`, { token: tokens.super, body: { visibility: "SECRET" } });
  assert.equal(bad.status, 400);
  const script = await api("PATCH", `/projects/${project.id}`, { token: tokens.super, body: { liveDemoUrl: "javascript:alert(document.cookie)" } });
  assert.equal(script.status, 400, "script URLs rejected on project links");
});

test("generic CRUD endpoints ignore id and timestamp fields", async () => {
  const res = await api("POST", "/services", {
    token: tokens.super,
    body: { title: "Test Service", slug: "test-service", description: "d", id: "forged", createdAt: "2000-01-01T00:00:00Z" },
  });
  assert.equal(res.status, 201);
  assert.notEqual(res.body.id, "forged");
  assert.notEqual(res.body.createdAt.slice(0, 4), "2000");
});

test("legacy endpoints validate input", async () => {
  assert.equal((await api("POST", "/contact", { body: { name: "A", email: "bad", message: "hi" } })).status, 400);
  assert.equal((await api("POST", "/admin/track", { body: { path: "x".repeat(500) } })).status, 400);
  assert.equal((await api("POST", "/testimonials", { body: { clientName: "", content: "short" } })).status, 400);
});

test("unique-constraint conflicts return 409 instead of 500", async () => {
  const res = await api("POST", "/admin/ventures", { token: tokens.super, body: { name: "Dup", slug: "devgen-solutions", summary: "x", brandId: ids.brands.solutions } });
  assert.equal(res.status, 409);
});
