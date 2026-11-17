/**
 * Page visit tracking and the Analytics report. Same prerequisites as other tests.
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { startApp } from "./helpers.js";

const t = await startApp();
const { prisma, base, login, api } = t;
const { token } = await login("admin@example.com", "ChangeMe123!");
const PATH = "/test-analytics-page";
const PHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148";

after(async () => {
  await prisma.pageView.deleteMany({ where: { path: { startsWith: PATH } } });
  await prisma.pageView.deleteMany({ where: { path: "/admin/leads" } });
  await prisma.$disconnect();
  t.close();
});

const track = (body, { ua = PHONE, ip = "198.51.100.77" } = {}) => fetch(`${base}/api/v1/admin/track`, {
  method: "POST",
  headers: { "content-type": "application/json", "user-agent": ua, "x-forwarded-for": ip },
  body: JSON.stringify(body),
});

test("a visit stores the site, device type and referring site only", async () => {
  assert.equal((await track({ path: PATH, site: "devegen", referrer: "https://www.google.com/search?q=devgen+zambia" })).status, 201);
  const row = await prisma.pageView.findFirst({ where: { path: PATH }, orderBy: { createdAt: "desc" } });
  assert.equal(row.site, "devegen");
  assert.equal(row.device, "mobile");
  assert.equal(row.referrer, "google.com", "no search terms or full links are kept");
  assert.match(row.visitorHash, /^[0-9a-f]{32}$/);
  assert.ok(!JSON.stringify(row).includes("198.51.100.77"), "the IP address is not stored");
});

test("the same visitor on the same day counts once; links between our own sites are not sources", async () => {
  await track({ path: `${PATH}-2`, site: "devegen", referrer: "https://stevenkayelu.online/" });
  const rows = await prisma.pageView.findMany({ where: { path: { startsWith: PATH } } });
  assert.equal(new Set(rows.map((r) => r.visitorHash)).size, 1);
  assert.equal(rows.find((r) => r.path === `${PATH}-2`).referrer, null);
});

test("bots and admin pages are not counted", async () => {
  assert.equal((await track({ path: `${PATH}-bot`, site: "steven" }, { ua: "Mozilla/5.0 (compatible; Googlebot/2.1)" })).status, 204);
  assert.equal((await track({ path: "/admin/leads", site: "steven" })).status, 204);
  assert.equal(await prisma.pageView.count({ where: { path: { in: [`${PATH}-bot`, "/admin/leads"] } } }), 0);
});

test("the report needs an admin and adds up per site", async () => {
  assert.equal((await api("GET", "/admin/analytics?days=7")).status, 401);
  assert.equal((await api("GET", "/admin/analytics?days=12", { token })).status, 400);
  const res = await api("GET", "/admin/analytics?days=7&site=devegen", { token });
  assert.equal(res.status, 200);
  assert.ok(res.body.current.views >= 2);
  assert.ok(res.body.pages.some((p) => p.path === PATH && p.site === "devegen"));
  assert.ok(res.body.referrers.some((r) => r.host === "google.com"));
  assert.ok(res.body.devices.some((d) => d.device === "mobile"));
  assert.ok(res.body.daily.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.day)));
});
