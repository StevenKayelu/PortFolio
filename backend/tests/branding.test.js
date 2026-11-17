/**
 * Logo, favicon and thumbnail uploads. Same prerequisites as other tests.
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { startApp } from "./helpers.js";

const t = await startApp();
const { prisma, base, login } = t;
const { token } = await login("admin@example.com", "ChangeMe123!");
const before = await prisma.siteSetting.findUnique({ where: { key: "branding" } });

after(async () => {
  if (before) await prisma.siteSetting.update({ where: { key: "branding" }, data: { value: before.value } });
  else await prisma.siteSetting.deleteMany({ where: { key: "branding" } });
  await prisma.product.deleteMany({ where: { slug: "test-thumbnail-product" } });
  await prisma.$disconnect();
  t.close();
});

const png = (width, height) => sharp({ create: { width, height, channels: 4, background: { r: 20, g: 36, b: 61, alpha: 1 } } }).png().toBuffer();

async function upload(path, buffer, { field = "image", type = "image/png", auth = true } = {}) {
  const form = new FormData();
  form.append(field, new Blob([buffer], { type }), "file");
  const res = await fetch(`${base}/api/v1${path}`, { method: "POST", body: form, headers: auth ? { authorization: `Bearer ${token}` } : {} });
  return { status: res.status, body: await res.json() };
}

test("a square favicon becomes every icon size; other shapes are refused", async () => {
  const res = await upload("/site-settings/branding/favicon", await png(600, 600));
  assert.equal(res.status, 201);
  for (const size of [32, 180, 192, 512]) {
    // Local storage links point at the default port; fetch the same path from the test server.
    const file = await fetch(base + new URL(res.body[`favicon${size}`]).pathname);
    assert.equal(file.status, 200, `favicon${size} is served`);
    const meta = await sharp(Buffer.from(await file.arrayBuffer())).metadata();
    assert.equal(meta.width, size);
    assert.equal(meta.height, size);
  }
  assert.equal((await upload("/site-settings/branding/favicon", await png(800, 400))).status, 400);
});

test("logo uploads are trimmed PNGs, and need a signed-in admin", async () => {
  assert.equal((await upload("/site-settings/branding/logo", await png(600, 600), { auth: false })).status, 401);
  const res = await upload("/site-settings/branding/logo", await png(900, 600));
  assert.equal(res.status, 201);
  assert.match(res.body.logo, /\.png$/);
  assert.ok(res.body.favicon32, "the earlier favicon is kept");
  const publicBranding = await (await fetch(`${base}/api/v1/site-settings/branding`)).json();
  assert.equal(publicBranding.logo, res.body.logo);
});

test("thumbnails upload for staff, and products keep their image", async () => {
  assert.equal((await upload("/admin/uploads/image", await png(1600, 1000), { auth: false })).status, 401);
  assert.equal((await upload("/admin/uploads/image", Buffer.from("%PDF-1.4"), { type: "application/pdf" })).status, 400);
  const img = await upload("/admin/uploads/image", await png(1600, 1000));
  assert.equal(img.status, 201);

  const res = await fetch(`${base}/api/v1/admin/products`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: "Test Thumbnail Product", slug: "test-thumbnail-product", imageUrl: img.body.url }),
  });
  assert.equal(res.status, 201);
  assert.equal((await res.json()).imageUrl, img.body.url);
});
