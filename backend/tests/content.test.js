/**
 * Integration tests for the site-content CMS, uploads, dashboard and
 * venture pages. Same prerequisites as the other test files.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
import { startApp } from "./helpers.js";

const t = await startApp();
const { prisma, api, login } = t;
const tok = {};
const saved = {};
const uploaded = [];

before(async () => {
  tok.super = (await login("admin@example.com", "ChangeMe123!")).token;
  // Snapshot content so the tests leave the database as they found it.
  for (const key of ["identity", "stats"]) saved[key] = (await prisma.siteSetting.findUnique({ where: { key } }))?.value;
});

after(async () => {
  for (const [key, value] of Object.entries(saved)) {
    if (value !== undefined) await prisma.siteSetting.update({ where: { key }, data: { value } });
  }
  for (const file of uploaded) await fs.unlink(file).catch(() => {});
  await prisma.venture.deleteMany({ where: { slug: "test-sitemap-venture" } });
  await prisma.$disconnect();
  t.close();
});

test("site settings are validated per section", async () => {
  const bad = await api("PUT", "/site-settings/stats", { token: tok.super, body: { value: [{ label: "", value: "x".repeat(50) }] } });
  assert.equal(bad.status, 400);
  assert.equal((await api("PUT", "/site-settings/anything", { token: tok.super, body: { value: {} } })).status, 400, "unknown keys rejected");
  const badUrl = await api("PUT", "/site-settings/identity", { token: tok.super, body: { value: { name: "A", role: "B", tagline: "C", github: "javascript:alert(1)" } } });
  assert.equal(badUrl.status, 400, "non-http URLs rejected");

  const ok = await api("PUT", "/site-settings/stats", { token: tok.super, body: { value: [{ label: "GitHub repositories", value: "14+", extra: "dropped" }] } });
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.body.value, [{ label: "GitHub repositories", value: "14+" }]);
  assert.equal((await api("PUT", "/site-settings/stats", { body: { value: [] } })).status, 401);
});

test("the profile photo upload accepts photos only and serves them cross-origin", async () => {
  const upload = (blob, name) => {
    const form = new FormData();
    form.append("photo", blob, name);
    return fetch(`${t.base}/api/v1/site-settings/identity/photo`, {
      method: "POST", body: form, headers: { authorization: `Bearer ${tok.super}`, "x-forwarded-for": "192.0.2.10" },
    });
  };

  const png = await sharp({ create: { width: 40, height: 50, channels: 3, background: "#2769B6" } }).png().toBuffer();
  const res = await upload(new Blob([png], { type: "image/png" }), "me.png");
  assert.equal(res.status, 201);
  const { photo } = await res.json();
  assert.match(photo, /\/uploads\/[\w-]+\.webp$/, "re-encoded to WebP");
  uploaded.push(path.join("src", "uploads", photo.split("/uploads/")[1]));

  const identity = await api("GET", "/site-settings/identity");
  assert.equal(identity.body.photo, photo, "stored on the identity setting");
  assert.ok(identity.body.name, "other identity fields are kept");

  const file = await fetch(t.base + photo.slice(photo.indexOf("/uploads/")));
  assert.equal(file.status, 200);
  assert.equal(file.headers.get("cross-origin-resource-policy"), "cross-origin");

  const svg = await upload(new Blob(['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'], { type: "image/svg+xml" }), "x.svg");
  assert.equal(svg.status, 400, "SVG is not accepted as a photo");
  const text = await upload(new Blob(["hello"], { type: "text/plain" }), "x.txt");
  assert.equal(text.status, 400, "unsupported types are a 400, not a 500");
});

test("dashboard counts leads and approvals for the caller's brands", async () => {
  const res = await api("GET", "/admin/summary", { token: tok.super });
  assert.equal(res.status, 200);
  for (const key of ["newLeadCount", "openLeadCount", "pendingApprovalCount"]) assert.equal(typeof res.body[key], "number", key);
});

test("published ventures get their own page and sitemap entry", async () => {
  const brand = await prisma.brand.findUnique({ where: { key: "devegen" } });
  await prisma.venture.create({ data: { name: "Test Sitemap Venture", slug: "test-sitemap-venture", summary: "x", status: "PUBLISHED", brandId: brand.id } });
  assert.equal((await api("GET", "/ventures/test-sitemap-venture")).status, 200);
  const sitemap = await api("GET", "/sitemap.xml?site=devegen", { raw: true });
  assert.ok(sitemap.body.includes("/ventures/test-sitemap-venture"));
  assert.ok(!sitemap.body.includes("/ventures/devgen-solutions"), "DevGen Solutions lives under /solutions");
});

test("re-running seed.js never overwrites edited site content", async () => {
  await api("PUT", "/site-settings/stats", { token: tok.super, body: { value: [{ label: "Real stat", value: "1" }] } });
  execFileSync(process.execPath, [path.join("prisma", "seed.js")], { env: process.env, stdio: "ignore" });
  const stats = await prisma.siteSetting.findUnique({ where: { key: "stats" } });
  assert.deepEqual(stats.value, [{ label: "Real stat", value: "1" }]);
});

