import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import { prisma } from "../config/prisma.js";

/**
 * Résumé PDF built from the live portfolio data, so the download always
 * matches the website: profile, summary, experience, education, skills,
 * selected projects, certifications and achievements. Single column with
 * real (selectable) text, so applicant-tracking systems can read it.
 * Only published content is included.
 */

const FONTS = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "assets", "fonts");
const C = { ink: "#14243D", body: "#2B3A4F", muted: "#5F6E82", accent: "#2769B6", copper: "#B8862A", rule: "#D8DFE8" };
const PAGE = { margin: 50, width: 595.28, height: 841.89 };
const CONTENT_W = PAGE.width - PAGE.margin * 2;

const SKILL_LABEL = {
  FRONTEND: "Frontend", BACKEND: "Backend", DATABASE: "Databases", CLOUD: "Cloud", DEVOPS: "DevOps", TOOLS: "Tools",
  LANGUAGE: "Languages", FRAMEWORK: "Frameworks", MOBILE: "Mobile", SOFT_SKILL: "Professional skills", OTHER: "Other",
};
const SKILL_ORDER = ["LANGUAGE", "FRONTEND", "BACKEND", "FRAMEWORK", "MOBILE", "DATABASE", "CLOUD", "DEVOPS", "TOOLS", "OTHER", "SOFT_SKILL"];

const monthYear = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "Africa/Lusaka" }) : "");
const longDate = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lusaka" });
const clean = (s) => String(s || "").replace(/<[^>]+>/g, "").replace(/\r/g, "").trim();
const host = (url) => String(url || "").replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

export async function loadResumeData() {
  const [settings, experience, skills, projects, certificates, achievements, referees] = await Promise.all([
    prisma.siteSetting.findMany({ where: { key: { in: ["identity", "about"] } } }),
    prisma.experience.findMany({ where: { deletedAt: null }, orderBy: [{ isCurrent: "desc" }, { startDate: "desc" }] }),
    prisma.skill.findMany({ where: { deletedAt: null }, orderBy: [{ displayOrder: "asc" }, { proficiency: "desc" }] }),
    prisma.project.findMany({
      where: { deletedAt: null, visibility: "PUBLIC", status: { not: "DRAFT" }, publicationPermission: { not: "DENIED" } },
      orderBy: [{ isFeatured: "desc" }, { displayOrder: "asc" }, { createdAt: "desc" }],
      take: 6,
      include: { technologies: { include: { technology: true } } },
    }),
    prisma.certificate.findMany({ where: { deletedAt: null, isPublished: true }, orderBy: [{ displayOrder: "asc" }, { issueDate: "desc" }] }),
    prisma.achievement.findMany({ orderBy: { date: "desc" }, take: 8 }),
    prisma.referee.findMany({ where: { showOnResume: true }, orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }] }),
  ]);
  const byKey = Object.fromEntries(settings.map((s) => [s.key, s.value || {}]));
  return { identity: byKey.identity || {}, about: byKey.about || {}, experience, skills, projects, certificates, achievements, referees };
}

export function renderResumePdf(data, { siteUrl = "https://stevenkayelu.online" } = {}) {
  const { identity, about, experience, skills, projects, certificates, achievements, referees = [] } = data;
  const name = identity.name || "Steven Kayelu";
  const doc = new PDFDocument({
    size: "A4", margins: { top: PAGE.margin, bottom: PAGE.margin + 18, left: PAGE.margin, right: PAGE.margin },
    bufferPages: true, info: { Title: `${name} — Résumé`, Author: name, Subject: identity.role || "Résumé", Keywords: skills.map((s) => s.name).join(", ") },
  });
  doc.registerFont("serif", path.join(FONTS, "Newsreader-500.ttf"));
  doc.registerFont("sans", path.join(FONTS, "HankenGrotesk-400.ttf"));
  doc.registerFont("sans-semi", path.join(FONTS, "HankenGrotesk-600.ttf"));
  doc.registerFont("sans-bold", path.join(FONTS, "HankenGrotesk-700.ttf"));
  doc.registerFont("mono", path.join(FONTS, "JetBrainsMono-500.ttf"));

  const bottom = () => PAGE.height - PAGE.margin - 18;
  const ensure = (h) => { if (doc.y + h > bottom()) doc.addPage(); };

  // ---------------------------------------------------------------- header
  doc.rect(0, 0, PAGE.width, 6).fill(C.accent);
  doc.font("serif").fontSize(30).fillColor(C.ink).text(name, PAGE.margin, PAGE.margin - 6);
  if (identity.role) doc.font("sans-semi").fontSize(12).fillColor(C.accent).text(identity.role, { characterSpacing: 0.2 });
  doc.moveDown(0.45);

  const contacts = [
    identity.location && { text: identity.location },
    identity.email && { text: identity.email, link: `mailto:${identity.email}` },
    identity.phone && { text: identity.phone, link: `tel:${identity.phone.replace(/\s/g, "")}` },
    { text: host(siteUrl), link: siteUrl },
    identity.linkedin && { text: host(identity.linkedin), link: identity.linkedin },
    identity.github && { text: host(identity.github), link: identity.github },
  ].filter(Boolean);
  doc.font("sans").fontSize(9).fillColor(C.muted);
  let x = PAGE.margin;
  let y = doc.y;
  contacts.forEach((c, i) => {
    let sep = i ? "   ·   " : "";
    if (x + doc.widthOfString(sep + c.text) > PAGE.margin + CONTENT_W) { x = PAGE.margin; y += 13; sep = ""; }
    if (sep) { doc.fillColor(C.rule).text(sep, x, y, { lineBreak: false }); x += doc.widthOfString(sep); }
    const tw = doc.widthOfString(c.text);
    doc.fillColor(c.link ? C.body : C.muted).text(c.text, x, y, { lineBreak: false, width: tw + 1, link: c.link || null });
    x += tw;
  });
  doc.x = PAGE.margin;
  doc.y = y + 20;
  doc.moveTo(PAGE.margin, doc.y).lineTo(PAGE.margin + CONTENT_W, doc.y).lineWidth(0.8).strokeColor(C.rule).stroke();
  doc.moveDown(0.9);

  // -------------------------------------------------------------- helpers
  const section = (title, keepWith = 70) => {
    ensure(34 + keepWith);
    doc.moveDown(0.5);
    const top = doc.y;
    doc.rect(PAGE.margin, top + 2, 3, 10).fill(C.copper);
    doc.font("sans-bold").fontSize(9.5).fillColor(C.ink).text(title.toUpperCase(), PAGE.margin + 10, top, { characterSpacing: 1.6 });
    doc.x = PAGE.margin;
    doc.moveDown(0.55);
  };
  const paragraph = (text, opts = {}) => {
    doc.font("sans").fontSize(opts.size || 9.8).fillColor(opts.color || C.body)
      .text(clean(text), PAGE.margin + (opts.indent || 0), doc.y, { width: CONTENT_W - (opts.indent || 0), lineGap: 2.2, align: "left" });
  };
  /** Bold title on the left, dates on the right, on one line. */
  const entryHead = (title, right, subtitle) => {
    const rightW = right ? doc.font("mono").fontSize(8.5).widthOfString(right) + 6 : 0;
    const top = doc.y;
    doc.font("sans-bold").fontSize(10.8).fillColor(C.ink).text(title, PAGE.margin, top, { width: CONTENT_W - rightW });
    const afterTitle = doc.y;
    if (right) doc.font("mono").fontSize(8.5).fillColor(C.muted).text(right, PAGE.margin + CONTENT_W - rightW, top + 2, { width: rightW, align: "right" });
    doc.y = afterTitle;
    if (subtitle) doc.font("sans-semi").fontSize(9.6).fillColor(C.accent).text(subtitle, PAGE.margin, doc.y, { width: CONTENT_W });
    doc.moveDown(0.25);
  };
  const bullets = (text) => {
    const lines = clean(text).split(/\n+/).map((l) => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
    if (lines.length <= 1) return paragraph(lines[0] || "");
    for (const line of lines) {
      ensure(16);
      const top = doc.y;
      doc.circle(PAGE.margin + 4, top + 5.6, 1.4).fill(C.muted);
      paragraph(line, { indent: 12 });
      doc.moveDown(0.1);
    }
  };
  const estimate = (text, extra = 30) => doc.font("sans").fontSize(9.8).heightOfString(clean(text), { width: CONTENT_W, lineGap: 2.2 }) + extra;

  // -------------------------------------------------------------- content
  const summary = [about.bio, identity.tagline && !about.bio ? identity.tagline : null].filter(Boolean).join("\n\n");
  if (summary) {
    section("Profile");
    paragraph(summary);
    if (identity.availability) {
      doc.moveDown(0.35);
      doc.font("sans-semi").fontSize(9.4).fillColor(C.ink).text(`Availability: `, { continued: true }).font("sans").fillColor(C.body).text(identity.availability);
    }
  }

  if (experience.length) {
    section("Experience", Math.min(estimate(experience[0].description, 44), 140));
    experience.forEach((e, i) => {
      ensure(Math.min(estimate(e.description, 44), 160));
      const end = e.isCurrent || !e.endDate ? "Present" : monthYear(e.endDate);
      entryHead(e.title, `${monthYear(e.startDate)} – ${end}`, [e.organization, e.location].filter(Boolean).join(" · "));
      bullets(e.description);
      if (i < experience.length - 1) doc.moveDown(0.8);
    });
  }

  const education = Array.isArray(about.education) ? about.education.filter((e) => e?.degree || e?.institution) : [];
  if (education.length) {
    section("Education");
    education.forEach((e) => {
      ensure(40);
      entryHead(e.degree || e.institution, e.year ? String(e.year) : "", e.degree ? e.institution : "");
      doc.moveDown(0.3);
    });
  }

  if (skills.length) {
    section("Skills");
    const groups = {};
    for (const s of skills) (groups[s.category] ||= []).push(s.name);
    const labelW = 108;
    for (const key of SKILL_ORDER.filter((k) => groups[k])) {
      const list = groups[key].join("  ·  ");
      const h = doc.font("sans").fontSize(9.6).heightOfString(list, { width: CONTENT_W - labelW, lineGap: 2 });
      ensure(h + 6);
      const top = doc.y;
      doc.font("sans-semi").fontSize(9.2).fillColor(C.ink).text(SKILL_LABEL[key] || key, PAGE.margin, top, { width: labelW - 8 });
      doc.font("sans").fontSize(9.6).fillColor(C.body).text(list, PAGE.margin + labelW, top, { width: CONTENT_W - labelW, lineGap: 2 });
      doc.y = Math.max(doc.y, top + h) + 4;
    }
  }

  if (projects.length) {
    section("Selected projects", Math.min(estimate(projects[0].summary, 50), 140));
    projects.forEach((p, i) => {
      ensure(Math.min(estimate(p.summary, 50), 140));
      const link = p.liveDemoUrl || p.githubUrl;
      entryHead(p.title, p.status === "IN_PROGRESS" ? "In progress" : "", null);
      paragraph(p.summary);
      const tech = p.technologies.map((t) => t.technology.name).slice(0, 10).join("  ·  ");
      if (tech) doc.moveDown(0.15).font("mono").fontSize(8).fillColor(C.muted).text(tech, PAGE.margin, doc.y, { width: CONTENT_W });
      if (link) doc.moveDown(0.1).font("sans").fontSize(8.8).fillColor(C.accent).text(host(link), PAGE.margin, doc.y, { link, width: CONTENT_W });
      if (i < projects.length - 1) doc.moveDown(0.7);
    });
  }

  if (certificates.length) {
    section("Certifications");
    certificates.forEach((c) => {
      ensure(34);
      const detail = [c.institution, c.showCredentialId && c.credentialId ? `Credential ID ${c.credentialId}` : null].filter(Boolean).join(" · ");
      entryHead(c.title, monthYear(c.issueDate), detail);
      if (c.credentialUrl) doc.font("sans").fontSize(8.8).fillColor(C.accent).text("Verify credential", PAGE.margin, doc.y, { link: c.credentialUrl });
      doc.moveDown(0.35);
    });
  }

  if (achievements.length) {
    section("Achievements");
    achievements.forEach((a) => {
      ensure(Math.min(estimate(a.description, 30), 100));
      entryHead(a.title, monthYear(a.date), null);
      paragraph(a.description);
      doc.moveDown(0.5);
    });
  }

  if (referees.length) {
    // Two per row; a row moves to the next page as a whole.
    const colW = (CONTENT_W - 24) / 2;
    const block = (r) => [
      { font: "sans-bold", size: 10.4, color: C.ink, text: r.name },
      { font: "sans", size: 9.2, color: C.body, text: r.position },
      { font: "sans", size: 9.2, color: C.body, text: r.organization },
      r.phone && { font: "sans", size: 9.2, color: C.muted, text: r.phone, link: `tel:${r.phone.replace(/[^+0-9]/g, "")}` },
      r.email && { font: "sans", size: 9.2, color: C.accent, text: r.email, link: `mailto:${r.email}` },
    ].filter(Boolean);
    const heightOf = (lines) => lines.reduce((h, l) => h + doc.font(l.font).fontSize(l.size).heightOfString(l.text, { width: colW, lineGap: 1.5 }) + 1.5, 0);
    section("Referees", heightOf(block(referees[0])) + 10);
    for (let i = 0; i < referees.length; i += 2) {
      const row = referees.slice(i, i + 2).map(block);
      const rowH = Math.max(...row.map(heightOf));
      ensure(rowH + 12);
      const top = doc.y;
      row.forEach((lines, col) => {
        let y = top;
        for (const l of lines) {
          doc.font(l.font).fontSize(l.size).fillColor(l.color).text(l.text, PAGE.margin + col * (colW + 24), y, { width: colW, lineGap: 1.5, link: l.link || null });
          y = doc.y + 1.5;
        }
      });
      doc.x = PAGE.margin;
      doc.y = top + rowH + 12;
    }
  }

  // --------------------------------------------------- footer on every page
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i += 1) {
    doc.switchToPage(range.start + i);
    // The footer sits inside the bottom margin; without this, writing there starts a new page.
    doc.page.margins.bottom = 0;
    const fy = PAGE.height - PAGE.margin + 6;
    doc.moveTo(PAGE.margin, fy - 8).lineTo(PAGE.margin + CONTENT_W, fy - 8).lineWidth(0.5).strokeColor(C.rule).stroke();
    doc.font("sans").fontSize(7.8).fillColor(C.muted)
      .text(`${name} · Résumé · ${host(siteUrl)} · Updated ${longDate(new Date())}`, PAGE.margin, fy, { width: CONTENT_W - 60, lineBreak: false });
    doc.text(`Page ${i + 1} of ${range.count}`, PAGE.margin + CONTENT_W - 60, fy, { width: 60, align: "right", lineBreak: false });
  }

  doc.end();
  return doc;
}
