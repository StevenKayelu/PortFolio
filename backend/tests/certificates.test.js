/**
 * Certificates: public watermarked previews, private originals, issuer
 * verification links. Same prerequisites as the other test files.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { startApp } from "./helpers.js";

const t = await startApp();
const { prisma, api, login } = t;
const tok = {};
const ids = {};
const PRIVATE_DIR = process.env.PRIVATE_UPLOAD_DIR || "./private_uploads";
// A tiny but well-formed PDF (contents don't matter: the preview comes from the browser render).
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");
const png = (w, h) => sharp({ create: { width: w, height: h, channels: 3, background: "#FFFFFF" } }).png().toBuffer();

function upload(id, files, token = tok.super) {
  const form = new FormData();
  for (const [field, buf, type, name] of files) form.append(field, new Blob([buf], { type }), name);
  return fetch(`${t.base}/api/v1/admin/certificates/${id}/file`, {
    method: "POST", body: form, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), "x-forwarded-for": "192.0.2.50" },
  });
}

before(async () => {
  tok.super = (await login("admin@example.com", "ChangeMe123!")).token;
});

after(async () => {
  const certs = await prisma.certificate.findMany({ where: { title: { startsWith: "Test Cert" } } });
  for (const c of certs) {
    if (c.originalKey) await fs.unlink(path.join(PRIVATE_DIR, c.originalKey)).catch(() => {});
    if (c.imageUrl) await fs.unlink(path.join("src", "uploads", c.imageUrl.split("/uploads/")[1])).catch(() => {});
  }
  await prisma.certificate.deleteMany({ where: { title: { startsWith: "Test Cert" } } });
  await prisma.$disconnect();
  t.close();
});

test("the template placeholder certificates are gone", async () => {
  assert.equal(await prisma.certificate.count({ where: { credentialId: { in: ["AWS-000000", "PSM-000000"] } } }), 0);
});

test("certificate details are validated", async () => {
  const base = { title: "Test Cert A", institution: "Coursera", type: "COURSE", issueDate: "2026-03-01" };
  assert.equal((await api("POST", "/admin/certificates", { token: tok.super, body: { ...base, credentialUrl: "javascript:alert(1)" } })).status, 400);
  assert.equal((await api("POST", "/admin/certificates", { token: tok.super, body: { ...base, expiresAt: "2025-01-01" } })).status, 400);
  assert.equal((await api("POST", "/admin/certificates", { body: base })).status, 401);
  assert.equal((await api("POST", "/certificates", { token: tok.super, body: base })).status, 404, "no write routes on the public path");

  const res = await api("POST", "/admin/certificates", {
    token: tok.super,
    body: { ...base, credentialId: "ABC123", showCredentialId: false, credentialUrl: "https://www.coursera.org/verify/ABC123", expiresAt: "" },
  });
  assert.equal(res.status, 201);
  ids.cert = res.body.id;
});

test("public data shows the issuer link, hides private fields and respects the credential ID switch", async () => {
  const list = await api("GET", "/certificates");
  const c = list.body.items.find((x) => x.id === ids.cert);
  assert.ok(c);
  assert.deepEqual(c.verification, { provider: "Coursera", isIssuer: true, label: "Verify with Coursera" });
  assert.equal(c.credentialId, null);
  for (const hidden of ["originalKey", "originalName", "fileUrl", "isPublished"]) assert.equal(c[hidden], undefined, hidden);

  await api("PATCH", `/admin/certificates/${ids.cert}`, { token: tok.super, body: { credentialUrl: "https://www.linkedin.com/in/someone/details/certifications/" } });
  const again = (await api("GET", `/certificates/${ids.cert}`)).body;
  assert.equal(again.verification.isIssuer, false, "LinkedIn is not labelled as verification");
});

test("unpublished certificates are not public", async () => {
  await api("PATCH", `/admin/certificates/${ids.cert}`, { token: tok.super, body: { isPublished: false } });
  assert.equal((await api("GET", `/certificates/${ids.cert}`)).status, 404);
  assert.ok(!(await api("GET", "/certificates")).body.items.some((x) => x.id === ids.cert));
  await api("PATCH", `/admin/certificates/${ids.cert}`, { token: tok.super, body: { isPublished: true } });
});

test("uploads reject bad files", async () => {
  assert.equal((await upload(ids.cert, [["original", PDF, "application/pdf", "c.pdf"]])).status, 400, "PDF needs a rendered preview");
  assert.equal((await upload(ids.cert, [["original", Buffer.from("not a pdf"), "application/pdf", "c.pdf"], ["preview", await png(100, 70), "image/png", "p.png"]])).status, 400);
  assert.equal((await upload(ids.cert, [["original", Buffer.from("<svg/>"), "image/svg+xml", "c.svg"]])).status, 400);
  assert.equal((await upload(ids.cert, [["original", Buffer.from("hello"), "image/png", "c.png"]])).status, 400, "content is checked, not just the type");
  assert.equal((await upload(ids.cert, [["original", PDF, "application/pdf", "c.pdf"]], null)).status, 401);
});

test("a PDF is stored privately and a watermarked, reduced preview is public", async () => {
  const res = await upload(ids.cert, [["original", PDF, "application/pdf", "My Certificate.pdf"], ["preview", await png(2400, 1700), "image/png", "page1.png"]]);
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.hasOriginal, true);
  assert.equal(body.originalKey, undefined, "storage key never sent to the browser");

  const row = await prisma.certificate.findUnique({ where: { id: ids.cert } });
  ids.firstKey = row.originalKey;
  assert.deepEqual(await fs.readFile(path.join(PRIVATE_DIR, row.originalKey)), PDF, "original kept byte-for-byte, privately");
  assert.equal((await fetch(`${t.base}/uploads/${row.originalKey}`)).status, 404, "original is not under public uploads");

  const preview = await fetch(t.base + row.imageUrl.slice(row.imageUrl.indexOf("/uploads/")));
  assert.equal(preview.status, 200);
  const meta = await sharp(Buffer.from(await preview.arrayBuffer())).metadata();
  assert.equal(meta.format, "webp");
  assert.equal(meta.width, 1200, "reduced resolution");
  // The watermark changes pixels on what was a plain white page.
  const { data } = await sharp(Buffer.from(await (await fetch(t.base + row.imageUrl.slice(row.imageUrl.indexOf("/uploads/")))).arrayBuffer())).raw().toBuffer({ resolveWithObject: true });
  assert.ok(data.some((v) => v < 240), "watermark present");
});

test("only signed-in staff can download the original", async () => {
  assert.equal((await api("GET", `/admin/certificates/${ids.cert}/original`)).status, 401);
  const res = await fetch(`${t.base}/api/v1/admin/certificates/${ids.cert}/original`, { headers: { authorization: `Bearer ${tok.super}` } });
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-disposition"), /attachment; filename="My Certificate\.pdf"/);
  assert.deepEqual(Buffer.from(await res.arrayBuffer()), PDF);
});

test("re-uploading replaces the files instead of piling them up", async () => {
  const res = await upload(ids.cert, [["original", await png(900, 640), "image/png", "scan.png"]]);
  assert.equal(res.status, 201);
  await assert.rejects(fs.access(path.join(PRIVATE_DIR, ids.firstKey)), "old private original deleted");
});

test("deleting a certificate removes it and its files", async () => {
  const row = await prisma.certificate.findUnique({ where: { id: ids.cert } });
  assert.equal((await api("DELETE", `/admin/certificates/${ids.cert}`, { token: tok.super })).status, 204);
  assert.equal((await api("GET", `/certificates/${ids.cert}`)).status, 404);
  await assert.rejects(fs.access(path.join(PRIVATE_DIR, row.originalKey)));
});
