/**
 * Invite-only, consented testimonials. Same prerequisites as the other
 * test files (disposable, migrated, seeded database).
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { startApp } from "./helpers.js";

const t = await startApp({ mail: true });
const { prisma, api, login } = t;
const { getOutbox } = await import("../src/services/mail.service.js");

const EDITOR = "editor.testimonials@example.com";
const CLIENT = "client.testimonials@example.com";
const ids = {};
const tok = {};
const tokenFrom = (link) => new URL(link).pathname.split("/").pop();

before(async () => {
  ids.brands = Object.fromEntries((await prisma.brand.findMany()).map((b) => [b.key, b.id]));
  await prisma.user.deleteMany({ where: { email: EDITOR } });
  await prisma.user.create({
    data: {
      name: "Solutions Editor", email: EDITOR, role: "EDITOR", passwordHash: await bcrypt.hash("Testimonial-pass-1", 4),
      brandRoles: { create: { brandId: ids.brands.solutions, scope: "EDITOR" } },
    },
  });
  tok.super = (await login("admin@example.com", "ChangeMe123!")).token;
  tok.editor = (await login(EDITOR, "Testimonial-pass-1")).token;
  ids.project = (await prisma.project.findFirst({ where: { visibility: "PUBLIC", deletedAt: null, status: { not: "DRAFT" } } }))?.id;
});

after(async () => {
  await prisma.testimonial.deleteMany({ where: { OR: [{ invite: { clientEmail: CLIENT } }, { clientName: "Legacy Unconsented" }] } });
  await prisma.testimonialInvite.deleteMany({ where: { clientEmail: CLIENT } });
  await prisma.user.deleteMany({ where: { email: EDITOR } });
  await prisma.$disconnect();
  t.close();
});

const invite = (token, body) => api("POST", "/admin/testimonial-invites", { token, body: { clientName: "Mutale Chanda", clientEmail: CLIENT, brandId: ids.brands.solutions, ...body } });
const submission = (overrides = {}) => ({
  clientRole: "Operations Manager", clientCompany: "Copperbelt Supplies", relationship: "Client",
  content: "The stock system DevGen built cut our month-end count from three days to one.", rating: 5,
  consentPublish: true, consentContact: false, ...overrides,
});

test("staff create invites only for brands they can edit", async () => {
  assert.equal((await invite(tok.editor, { brandId: ids.brands.devegen })).status, 403);
  const res = await invite(tok.super, { projectId: ids.project, sendEmail: true });
  assert.equal(res.status, 201);
  assert.match(res.body.link, /\/testimonial\/[\w-]{32}\?site=devegen$/, "DevGen Solutions links live on the Devegen site");
  ids.token = tokenFrom(res.body.link);
  ids.invite = res.body.id;
  const stored = await prisma.testimonialInvite.findUnique({ where: { id: ids.invite } });
  assert.notEqual(stored.tokenHash, ids.token, "only a hash of the token is stored");
  assert.ok(getOutbox().some((m) => m.to === CLIENT && m.text.includes(ids.token)), "invite emailed when asked");
});

test("the client sees who the invite is for and the exact consent wording, but no email", async () => {
  const res = await api("GET", `/testimonials/invite/${ids.token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.clientName, "Mutale Chanda");
  assert.equal(res.body.brand.key, "solutions");
  assert.match(res.body.consent.publish, /DevGen Solutions LTD may publish/);
  assert.equal(res.body.submission, null);
  assert.ok(!JSON.stringify(res.body).includes(CLIENT));
  assert.equal((await api("GET", "/testimonials/invite/not-a-real-token-at-all-xxxxxxxx")).status, 404);
});

test("submission requires consent to publish and records exactly what was agreed", async () => {
  const noConsent = await api("POST", `/testimonials/invite/${ids.token}`, { body: submission({ consentPublish: false }) });
  assert.equal(noConsent.status, 400);
  assert.ok(noConsent.body.fields.consentPublish);

  const res = await api("POST", `/testimonials/invite/${ids.token}`, { body: submission({ clientName: "Someone Else", verified: false }) });
  assert.equal(res.status, 201);
  const row = await prisma.testimonial.findUnique({ where: { inviteId: ids.invite } });
  assert.equal(row.clientName, "Mutale Chanda", "name comes from the invite, not the form");
  assert.equal(row.verified, true);
  assert.equal(row.clientEmail, null, "email kept only with contact consent");
  assert.match(row.consentText, /\[x\] I agree that DevGen Solutions LTD may publish/);
  assert.match(row.consentText, /\[ \] I agree that DevGen Solutions LTD may keep my email/);
  assert.equal(row.isApproved, false);
  ids.testimonial = row.id;
});

test("nothing is public until approved; public data has no email or consent record", async () => {
  let list = await api("GET", "/testimonials?brand=solutions");
  assert.ok(!list.body.some((x) => x.id === ids.testimonial));

  assert.equal((await api("PATCH", `/testimonials/${ids.testimonial}`, { token: tok.super, body: { isApproved: true } })).status, 200);
  list = await api("GET", "/testimonials?brand=solutions");
  const item = list.body.find((x) => x.id === ids.testimonial);
  assert.ok(item);
  assert.equal(item.verified, true);
  assert.equal(item.brand.key, "solutions");
  assert.equal(item.relationship, "Client");
  for (const hidden of ["clientEmail", "consentText", "consentPublishAt", "inviteId"]) assert.equal(item[hidden], undefined, hidden);
  assert.ok(!(await api("GET", "/testimonials?brand=steven")).body.some((x) => x.id === ids.testimonial), "brand filter");
});

test("admins can approve but cannot rewrite a client's words", async () => {
  const res = await api("PATCH", `/testimonials/${ids.testimonial}`, { token: tok.super, body: { content: "Rewritten by admin" } });
  assert.equal(res.status, 400);
  assert.match((await prisma.testimonial.findUnique({ where: { id: ids.testimonial } })).content, /month-end count/);
});

test("a client's edit needs fresh approval", async () => {
  const res = await api("POST", `/testimonials/invite/${ids.token}`, { body: submission({ content: "Updated: the stock system cut our month-end count from three days to one.", consentContact: true }) });
  assert.equal(res.status, 200);
  const row = await prisma.testimonial.findUnique({ where: { id: ids.testimonial } });
  assert.equal(row.isApproved, false);
  assert.equal(row.clientEmail, CLIENT, "email kept now that contact consent was given");
  const view = await api("GET", `/testimonials/invite/${ids.token}`);
  assert.equal(view.body.submission.status, "AWAITING_APPROVAL");
  assert.equal((await api("POST", `/admin/testimonial-invites/${ids.invite}/revoke`, { token: tok.super })).status, 409, "answered links stay valid for withdrawal");
});

test("withdrawal unpublishes, erases the words and blocks re-approval", async () => {
  await api("PATCH", `/testimonials/${ids.testimonial}`, { token: tok.super, body: { isApproved: true } });
  const res = await api("POST", `/testimonials/invite/${ids.token}/withdraw`);
  assert.equal(res.status, 200);
  const row = await prisma.testimonial.findUnique({ where: { id: ids.testimonial } });
  assert.equal(row.content, "");
  assert.equal(row.clientEmail, null);
  assert.ok(row.withdrawnAt);
  assert.match(row.consentText, /Withdrawn/);
  assert.ok(!(await api("GET", "/testimonials")).body.some((x) => x.id === ids.testimonial));
  assert.equal((await api("PATCH", `/testimonials/${ids.testimonial}`, { token: tok.super, body: { isApproved: true } })).status, 400);
});

test("expired and revoked links stop working", async () => {
  const fresh = await invite(tok.super, {});
  const token = tokenFrom(fresh.body.link);
  await prisma.testimonialInvite.update({ where: { id: fresh.body.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
  assert.equal((await api("GET", `/testimonials/invite/${token}`)).body.expired, true);
  assert.equal((await api("POST", `/testimonials/invite/${token}`, { body: submission() })).status, 410);

  const other = await invite(tok.editor, {});
  assert.equal(other.status, 201, "brand editors can invite");
  assert.equal((await api("POST", `/admin/testimonial-invites/${other.body.id}/revoke`, { token: tok.editor })).status, 200);
  assert.equal((await api("GET", `/testimonials/invite/${tokenFrom(other.body.link)}`)).status, 404);
});

test("testimonials without recorded consent are never public", async () => {
  const legacy = await prisma.testimonial.create({ data: { clientName: "Legacy Unconsented", content: "Seeded quote", isApproved: true, isFeatured: true } });
  assert.ok(!(await api("GET", "/testimonials")).body.some((x) => x.id === legacy.id), "approved but unconsented stays hidden");
  assert.equal((await api("PATCH", `/testimonials/${legacy.id}`, { token: tok.super, body: { isApproved: true } })).status, 400);
});

test("invite lists are scoped to the caller's brands", async () => {
  const editorList = await api("GET", "/admin/testimonial-invites", { token: tok.editor });
  assert.ok(editorList.body.length > 0);
  assert.ok(editorList.body.every((i) => i.brand.key === "solutions"));
  assert.ok(editorList.body.every((i) => i.tokenHash === undefined));
});
