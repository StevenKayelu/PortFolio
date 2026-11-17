/**
 * Integration tests for users/passwords, approvals, notifications and SEO.
 * Same prerequisites as ecosystem.test.js (disposable, migrated, seeded DB).
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { startApp } from "./helpers.js";

const t = await startApp({ mail: true });
const { prisma, api, login } = t;
const { getOutbox } = await import("../src/services/mail.service.js");

const EMAILS = { editor: "editor.admin-test@example.com", leads: "leads.admin-test@example.com", created: "new.admin-test@example.com" };
const PASSWORD = "Admin-test-password-1";
const ids = {};
const tok = {};

before(async () => {
  ids.brands = Object.fromEntries((await prisma.brand.findMany()).map((b) => [b.key, b.id]));
  await prisma.user.deleteMany({ where: { email: { in: Object.values(EMAILS) } } });
  const passwordHash = await bcrypt.hash(PASSWORD, 4);
  ids.editor = (await prisma.user.create({
    data: { name: "Approvals Editor", email: EMAILS.editor, passwordHash, role: "EDITOR", brandRoles: { create: { brandId: ids.brands.solutions, scope: "EDITOR" } } },
  })).id;
  ids.leads = (await prisma.user.create({
    data: { name: "Partnership Desk", email: EMAILS.leads, passwordHash, role: "EDITOR", brandRoles: { create: { brandId: ids.brands.devegen, scope: "LEAD_MANAGER" } } },
  })).id;
  tok.super = (await login("admin@example.com", "ChangeMe123!")).token;
  tok.editor = (await login(EMAILS.editor, PASSWORD)).token;
  tok.leads = (await login(EMAILS.leads, PASSWORD)).token;

  const venture = await prisma.venture.create({
    data: { name: "Approval Test Venture", slug: "test-approval", summary: "Original summary", status: "PUBLISHED", brandId: ids.brands.solutions },
  });
  ids.venture = venture.id;
});

after(async () => {
  await prisma.contentRevision.deleteMany({ where: { entityId: ids.venture } });
  await prisma.venture.deleteMany({ where: { slug: { startsWith: "test-" } } });
  await prisma.seoMeta.deleteMany({ where: { route: { startsWith: "/test" } } });
  await prisma.seoMeta.deleteMany({ where: { title: { startsWith: "Test SEO" } } });
  await prisma.lead.deleteMany({ where: { email: { endsWith: "@example.com" } } });
  await prisma.user.deleteMany({ where: { email: { in: Object.values(EMAILS) } } });
  await prisma.$disconnect();
  t.close();
});

// ------------------------------------------------------------ approvals

test("an editor's change to published content waits for approval", async () => {
  const res = await api("PATCH", `/admin/ventures/${ids.venture}`, { token: tok.editor, body: { summary: "Editor's new summary" } });
  assert.equal(res.status, 202);
  assert.equal(res.body.revision.status, "PENDING");
  ids.pending = res.body.revision.id;
  const venture = await prisma.venture.findUnique({ where: { id: ids.venture } });
  assert.equal(venture.summary, "Original summary", "published content must not change before approval");
});

test("editors still cannot change publication status, even as a proposal", async () => {
  const res = await api("PATCH", `/admin/ventures/${ids.venture}`, { token: tok.editor, body: { status: "ARCHIVED" } });
  assert.equal(res.status, 403);
});

test("the approval queue is visible to brand admins only", async () => {
  const editorQueue = await api("GET", "/admin/revisions", { token: tok.editor });
  assert.equal(editorQueue.body.length, 0);
  const superQueue = await api("GET", "/admin/revisions", { token: tok.super });
  const item = superQueue.body.find((r) => r.id === ids.pending);
  assert.ok(item, "pending revision should be in the queue");
  assert.equal(item.entity.current.summary, "Original summary");
  assert.equal(item.changes.summary, "Editor's new summary");
  // A user with no rights on that brand can't see or act on it.
  assert.equal((await api("POST", `/admin/revisions/${ids.pending}/approve`, { token: tok.leads, body: {} })).status, 404);
  assert.equal((await api("POST", `/admin/revisions/${ids.pending}/approve`, { token: tok.editor, body: {} })).status, 404);
});

test("approving applies the change and records the previous value", async () => {
  const res = await api("POST", `/admin/revisions/${ids.pending}/approve`, { token: tok.super, body: { reviewNote: "Looks good" } });
  assert.equal(res.status, 200);
  assert.equal(res.body.entity.summary, "Editor's new summary");
  const rev = await prisma.contentRevision.findUnique({ where: { id: ids.pending } });
  assert.equal(rev.status, "APPLIED");
  assert.equal(rev.previous.summary, "Original summary");
  assert.equal((await api("POST", `/admin/revisions/${ids.pending}/approve`, { token: tok.super, body: {} })).status, 409);
});

test("history is visible to the record's editors and supports rollback", async () => {
  const history = await api("GET", `/admin/revisions?entityId=${ids.venture}`, { token: tok.editor });
  assert.equal(history.status, 200);
  assert.ok(history.body.some((r) => r.id === ids.pending));
  assert.equal((await api("POST", `/admin/revisions/${ids.pending}/restore`, { token: tok.editor })).status, 404, "editors can't roll back");
  const restore = await api("POST", `/admin/revisions/${ids.pending}/restore`, { token: tok.super });
  assert.equal(restore.status, 200);
  assert.equal(restore.body.entity.summary, "Original summary");
});

test("rejected proposals leave the record untouched", async () => {
  const proposed = await api("PATCH", `/admin/ventures/${ids.venture}`, { token: tok.editor, body: { summary: "Rejected text" } });
  const rej = await api("POST", `/admin/revisions/${proposed.body.revision.id}/reject`, { token: tok.super, body: { reviewNote: "Not accurate" } });
  assert.equal(rej.status, 200);
  assert.equal(rej.body.status, "REJECTED");
  assert.equal((await prisma.venture.findUnique({ where: { id: ids.venture } })).summary, "Original summary");
});

test("direct edits by brand admins are recorded in history too", async () => {
  await api("PATCH", `/admin/ventures/${ids.venture}`, { token: tok.super, body: { summary: "Admin edit" } });
  const history = await api("GET", `/admin/revisions?entityId=${ids.venture}&status=APPLIED`, { token: tok.super });
  assert.ok(history.body.some((r) => r.changes.summary === "Admin edit" && r.previous.summary === "Original summary"));
});

// ---------------------------------------------------------- admin brand filter

test("admin lists can be filtered to one brand", async () => {
  const res = await api("GET", "/admin/ventures?brand=solutions", { token: tok.super });
  assert.ok(res.body.items.length > 0);
  assert.ok(res.body.items.every((v) => v.brand?.key === "solutions"));
});

// ------------------------------------------------------------ notifications

test("new leads email the brand's lead handlers, with HTML escaped", async () => {
  getOutbox().length = 0;
  const res = await api("POST", "/enquiries", {
    body: { site: "devegen", type: "PARTNERSHIP", name: "Chanda <b>Mulenga</b>", email: "chanda@example.com", message: "<script>alert(1)</script> Let's discuss a partnership.", consent: true },
  });
  assert.equal(res.status, 201);
  for (let i = 0; i < 20 && !getOutbox().length; i += 1) await new Promise((r) => setTimeout(r, 50));
  const mail = getOutbox()[0];
  assert.ok(mail, "a notification should be sent");
  assert.ok(mail.to.includes("admin@example.com") && mail.to.includes(EMAILS.leads));
  assert.ok(!mail.to.includes(EMAILS.editor), "users without lead access must not be emailed");
  assert.ok(!mail.to.includes("chanda@example.com"), "visitors must never be emailed by the API");
  assert.equal(mail.replyTo, "chanda@example.com");
  assert.ok(!mail.html.includes("<script>") && mail.html.includes("&lt;script&gt;"));
  assert.match(mail.subject, /DV-[2-9A-Z]{6}/);
});

// ------------------------------------------------------------- users + passwords

test("only super admins manage users, with password rules enforced", async () => {
  assert.equal((await api("POST", "/admin/users", { token: tok.editor, body: { name: "X", email: EMAILS.created, password: PASSWORD } })).status, 403);
  const weak = await api("POST", "/admin/users", { token: tok.super, body: { name: "New", email: EMAILS.created, password: "short" } });
  assert.equal(weak.status, 400);
  assert.ok(weak.body.fields.password);
  const created = await api("POST", "/admin/users", { token: tok.super, body: { name: "New Person", email: EMAILS.created, role: "EDITOR", password: PASSWORD } });
  assert.equal(created.status, 201);
  assert.equal(created.body.passwordHash, undefined);
  ids.created = created.body.id;
  assert.equal((await api("POST", "/admin/users", { token: tok.super, body: { name: "Dup", email: EMAILS.created, password: PASSWORD } })).status, 409);
});

test("super admins can't lock themselves out", async () => {
  const me = await prisma.user.findUnique({ where: { email: "admin@example.com" } });
  assert.equal((await api("PATCH", `/admin/users/${me.id}`, { token: tok.super, body: { isActive: false } })).status, 400);
  assert.equal((await api("PATCH", `/admin/users/${me.id}`, { token: tok.super, body: { role: "EDITOR" } })).status, 400);
});

test("deactivating a user signs them out immediately", async () => {
  const session = await login(EMAILS.created, PASSWORD);
  const res = await api("PATCH", `/admin/users/${ids.created}`, { token: tok.super, body: { isActive: false } });
  assert.equal(res.status, 200);
  assert.equal((await api("GET", "/admin/leads", { token: session.token })).status, 401);
  assert.equal((await api("POST", "/auth/refresh", { cookie: session.cookie })).status, 401, "refresh token must be revoked");
  assert.equal((await api("POST", "/auth/login", { body: { email: EMAILS.created, password: PASSWORD } })).status, 401);
});

test("changing your own password checks the current one and signs out other sessions", async () => {
  const other = await login(EMAILS.leads, PASSWORD);
  const current = await login(EMAILS.leads, PASSWORD);
  const wrong = await api("POST", "/auth/change-password", { token: current.token, body: { currentPassword: "nope", newPassword: "A-brand-new-password-2" } });
  assert.equal(wrong.status, 400);
  const ok = await api("POST", "/auth/change-password", { token: current.token, body: { currentPassword: PASSWORD, newPassword: "A-brand-new-password-2" } });
  assert.equal(ok.status, 200);
  assert.equal((await api("POST", "/auth/refresh", { cookie: other.cookie })).status, 401, "other sessions are signed out");
  assert.equal((await api("POST", "/auth/refresh", { cookie: ok.headers.get("set-cookie").split(";")[0] })).status, 200, "this session continues");
  assert.equal((await api("POST", "/auth/login", { body: { email: EMAILS.leads, password: PASSWORD } })).status, 401);
  await login(EMAILS.leads, "A-brand-new-password-2");
});

// ---------------------------------------------------------------------- SEO

test("SEO overrides are per brand and per path", async () => {
  const create = await api("POST", "/admin/seo", {
    token: tok.super,
    body: { brandId: ids.brands.solutions, route: "/solutions/", title: "Test SEO Solutions", description: "Software for Zambian businesses." },
  });
  assert.equal(create.status, 201);
  assert.equal(create.body.route, "/solutions", "trailing slash is normalised");

  const hit = await api("GET", "/seo?site=devegen&path=/solutions");
  assert.equal(hit.status, 200);
  assert.equal(hit.body.title, "Test SEO Solutions");
  assert.equal((await api("GET", "/seo?site=steven&path=/solutions")).status, 204, "other brands don't inherit it");
  assert.equal((await api("GET", "/seo?site=devegen&path=bad path")).status, 400);
  assert.equal((await api("POST", "/admin/seo", { token: tok.editor, body: { brandId: ids.brands.solutions, route: "/test", title: "Test SEO x", description: "x" } })).status, 403);
});

test("each site gets its own sitemap and robots.txt", async () => {
  await api("POST", "/admin/seo", { token: tok.super, body: { brandId: ids.brands.devegen, route: "/ventures", title: "Test SEO hidden", description: "x", noIndex: true } });
  const devegen = await api("GET", "/sitemap.xml?site=devegen", { raw: true });
  assert.equal(devegen.status, 200);
  assert.ok(devegen.body.includes("https://devegenventures.com/solutions/work"));
  assert.ok(!devegen.body.includes("stevenkayelu.online"));
  assert.ok(!devegen.body.includes("devegenventures.com/ventures<"), "noIndex routes are left out");

  const steven = await api("GET", "/sitemap.xml?site=steven", { raw: true });
  assert.ok(steven.body.includes("https://stevenkayelu.online/projects"));

  const robots = await api("GET", "/robots.txt?site=devegen", { raw: true });
  assert.match(robots.body, /Disallow: \/admin/);
  assert.match(robots.body, /Sitemap: https:\/\/devegenventures\.com\/sitemap\.xml/);
});
