import { prisma } from "../config/prisma.js";
import { handleUpload } from "../services/upload.service.js";

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
