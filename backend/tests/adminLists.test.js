/**
 * Admin lists must show hidden items (inactive services, unpublished FAQs,
 * draft posts) so staff can switch them back on, while the public never
 * sees them. Same prerequisites as other tests.
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { startApp } from "./helpers.js";

const t = await startApp();
const { prisma, api } = t;
const token = (await api("POST", "/auth/login", { body: { email: "admin@example.com", password: "ChangeMe123!" } })).body.accessToken;

after(async () => {
  await prisma.service.deleteMany({ where: { slug: "test-hidden-service" } });
  await prisma.faq.deleteMany({ where: { question: "Test hidden FAQ?" } });
  await prisma.blogPost.deleteMany({ where: { slug: "test-hidden-draft" } });
  await prisma.$disconnect();
  t.close();
});

test("inactive services: hidden from the public, listed for staff, price kept in Kwacha", async () => {
  const created = await api("POST", "/services", { token, body: { title: "Test Hidden Service", slug: "test-hidden-service", description: "x", startingPrice: 2500.5, isActive: false } });
  assert.equal(created.status, 201);
  assert.equal(Number(created.body.startingPrice), 2500.5);

  const publicList = await api("GET", "/services?includeHidden=true");
  assert.ok(!publicList.body.items.some((s) => s.slug === "test-hidden-service"), "anonymous includeHidden must be ignored");

  const staffList = await api("GET", "/services?includeHidden=true", { token });
  assert.ok(staffList.body.items.some((s) => s.slug === "test-hidden-service"));

  const cleared = await api("PATCH", `/services/${created.body.id}`, { token, body: { startingPrice: null } });
  assert.equal(cleared.body.startingPrice, null, "an emptied price means custom pricing, not K 0");
});

test("unpublished FAQs are listed for staff only", async () => {
  await api("POST", "/faq", { token, body: { question: "Test hidden FAQ?", answer: "x", isPublished: false } });
  assert.ok(!(await api("GET", "/faq")).body.items.some((f) => f.question === "Test hidden FAQ?"));
  assert.ok((await api("GET", "/faq?includeHidden=true", { token })).body.items.some((f) => f.question === "Test hidden FAQ?"));
});

test("draft blog posts are listed for staff only", async () => {
  const author = await prisma.user.findFirst({ where: { email: "admin@example.com" } });
  await prisma.blogPost.create({ data: { title: "Test hidden draft", slug: "test-hidden-draft", excerpt: "x", content: "x", status: "DRAFT", authorId: author.id } });
  assert.ok(!(await api("GET", "/blog?includeHidden=true")).body.items.some((p) => p.slug === "test-hidden-draft"));
  assert.ok((await api("GET", "/blog?includeHidden=true&pageSize=100", { token })).body.items.some((p) => p.slug === "test-hidden-draft"));
});
