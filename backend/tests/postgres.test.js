/**
 * Behaviour that MySQL gave for free (case-insensitive text comparison)
 * and that PostgreSQL needs explicitly. Same prerequisites as other tests.
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { startApp } from "./helpers.js";

const t = await startApp();
const { prisma, api } = t;

after(async () => {
  await prisma.newsletterSubscriber.deleteMany({ where: { email: "case.test@example.com" } });
  await prisma.service.deleteMany({ where: { slug: "test-case-search" } });
  await prisma.$disconnect();
  t.close();
});

test("sign-in ignores email capitalisation", async () => {
  const res = await api("POST", "/auth/login", { body: { email: "ADMIN@Example.COM", password: "ChangeMe123!" } });
  assert.equal(res.status, 200);
});

test("search is case-insensitive", async () => {
  const login = await api("POST", "/auth/login", { body: { email: "admin@example.com", password: "ChangeMe123!" } });
  await api("POST", "/services", { token: login.body.accessToken, body: { title: "Test Case Search Service", slug: "test-case-search", description: "x" } });
  const res = await api("GET", "/services?search=case%20SEARCH");
  assert.ok(res.body.items.some((s) => s.slug === "test-case-search"));
});

test("newsletter emails are stored once regardless of capitalisation", async () => {
  await api("POST", "/newsletter", { body: { email: "Case.Test@Example.com" } });
  await api("POST", "/newsletter", { body: { email: "case.test@EXAMPLE.com" } });
  const rows = await prisma.newsletterSubscriber.findMany({ where: { email: { equals: "case.test@example.com", mode: "insensitive" } } });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].email, "case.test@example.com");
});

test("newsletter sign-up validates the email", async () => {
  assert.equal((await api("POST", "/newsletter", { body: { email: "not-an-email" } })).status, 400);
});
