import { prisma } from "../config/prisma.js";
import { audit } from "../services/audit.service.js";
import { clearResumeCache } from "./resume.controller.js";

/**
 * Referees appear only on the résumé PDF. These endpoints are admin-only;
 * nothing public lists them.
 */

const notFound = () => Object.assign(new Error("Referee not found."), { status: 404, publicMessage: "Referee not found." });

export async function listReferees(req, res, next) {
  try {
    res.set("Cache-Control", "no-store");
    res.json(await prisma.referee.findMany({ orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }] }));
  } catch (err) {
    next(err);
  }
}

export async function createReferee(req, res, next) {
  try {
    const referee = await prisma.referee.create({ data: req.body });
    clearResumeCache();
    await audit(req, "CREATE", "Referee", referee.id);
    res.status(201).json(referee);
  } catch (err) {
    next(err);
  }
}

export async function updateReferee(req, res, next) {
  try {
    if (!(await prisma.referee.findUnique({ where: { id: req.params.id } }))) throw notFound();
    const referee = await prisma.referee.update({ where: { id: req.params.id }, data: req.body });
    clearResumeCache();
    await audit(req, "UPDATE", "Referee", referee.id, { fields: Object.keys(req.body) });
    res.json(referee);
  } catch (err) {
    next(err);
  }
}

export async function deleteReferee(req, res, next) {
  try {
    if (!(await prisma.referee.findUnique({ where: { id: req.params.id } }))) throw notFound();
    await prisma.referee.delete({ where: { id: req.params.id } });
    clearResumeCache();
    await audit(req, "DELETE", "Referee", req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
