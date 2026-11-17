/**
 * Résumé PDF generated from the live data. Same prerequisites as other tests.
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { startApp } from "./helpers.js";
import { clearResumeCache } from "../src/controllers/resume.controller.js";

const t = await startApp();
const { prisma, base } = t;

after(async () => {
  await prisma.experience.deleteMany({ where: { organization: { in: ["Resume Test Visible Org", "Resume Test Archived Org"] } } });
  await prisma.$disconnect();
  t.close();
});

test("the résumé is a PDF built from published data only", async () => {
  await prisma.experience.createMany({ data: [
    { type: "EMPLOYMENT", title: "Resume Test Role", organization: "Resume Test Visible Org", startDate: new Date("2024-01-01"), description: "Shown." },
    { type: "EMPLOYMENT", title: "Resume Test Role", organization: "Resume Test Archived Org", startDate: new Date("2023-01-01"), description: "Hidden.", deletedAt: new Date() },
  ] });
  clearResumeCache();
  const res = await fetch(`${base}/api/v1/resume/pdf?download=1`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "application/pdf");
  assert.match(res.headers.get("content-disposition"), /^attachment; filename=".+-Resume\.pdf"$/);
  const pdf = Buffer.from(await res.arrayBuffer());
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.ok(pdf.length > 5000);

  const { loadResumeData } = await import("../src/services/resumePdf.service.js");
  const data = await loadResumeData();
  const orgs = data.experience.map((e) => e.organization);
  assert.ok(orgs.includes("Resume Test Visible Org"));
  assert.ok(!orgs.includes("Resume Test Archived Org"), "archived experience is left out");
  assert.ok(data.projects.every((p) => p.visibility === "PUBLIC" && p.status !== "DRAFT"));

  const inline = await fetch(`${base}/api/v1/resume/pdf`);
  assert.match(inline.headers.get("content-disposition"), /^inline;/);
});
