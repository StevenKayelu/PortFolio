import { prisma } from "../config/prisma.js";
import { handleUpload } from "../services/upload.service.js";
import { loadResumeData, renderResumePdf } from "../services/resumePdf.service.js";

// Generated PDFs are reused for a few minutes; edits show up after that.
let cached = null; // { buffer, at }
const CACHE_MS = 5 * 60 * 1000;
export const clearResumeCache = () => { cached = null; };

/** GET /resume/pdf: the résumé built from the live portfolio data. */
export async function getResumePdf(req, res, next) {
  try {
    if (!cached || Date.now() - cached.at > CACHE_MS) {
      const data = await loadResumeData();
      const doc = renderResumePdf(data, { siteUrl: "https://stevenkayelu.online" });
      const chunks = [];
      const buffer = await new Promise((resolve, reject) => {
        doc.on("data", (c) => chunks.push(c));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);
      });
      const name = String(data.identity.name || "Steven Kayelu").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
      cached = { buffer, at: Date.now(), filename: `${name}-Resume.pdf` };
    }
    res.set({
      "Content-Type": "application/pdf",
      "Content-Length": cached.buffer.length,
      "Content-Disposition": `${req.query.download === "1" ? "attachment" : "inline"}; filename="${cached.filename}"`,
      "Cache-Control": "public, max-age=300",
    });
    res.end(cached.buffer);
  } catch (err) {
    next(err);
  }
}

export async function getActiveResume(req, res, next) {
  try {
    const resume = await prisma.resume.findFirst({ where: { isActive: true }, orderBy: { version: "desc" } });
    if (!resume) return res.status(404).json({ error: "No résumé uploaded yet." });
    res.json(resume);
  } catch (err) {
    next(err);
  }
}

export async function uploadResume(req, res, next) {
  try {
    // handleUpload passes PDFs straight through (no image optimization
    // applies), so this is identical for a résumé as it is for a photo.
    const saved = await handleUpload(req.file);
    const previous = await prisma.resume.findFirst({ where: { isActive: true } });

    await prisma.$transaction([
      ...(previous ? [prisma.resume.update({ where: { id: previous.id }, data: { isActive: false } })] : []),
      prisma.resume.create({
        data: {
          isActive: true,
          fileUrl: saved.url,
          jsonData: req.body.jsonData ? JSON.parse(req.body.jsonData) : undefined,
          version: (previous?.version ?? 0) + 1,
        },
      }),
    ]);

    res.status(201).json({ message: "Résumé updated." });
  } catch (err) {
    next(err);
  }
}
