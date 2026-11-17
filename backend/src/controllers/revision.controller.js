import { prisma } from "../config/prisma.js";
import { audit } from "../services/audit.service.js";
import { SCOPES, assertBrandScope, brandFilter, forbidden } from "../services/brandAccess.service.js";
import { REVISION_MODELS, applyChanges, pickChanges } from "../services/revision.service.js";

/**
 * Approval queue and history for venture/product edits.
 *   GET  /admin/revisions                pending queue (brand admins)
 *   GET  /admin/revisions?entityId=…     history of one record (editors too)
 *   POST /admin/revisions/:id/approve    apply a pending change
 *   POST /admin/revisions/:id/reject     decline it, with a note
 *   POST /admin/revisions/:id/restore    roll back to the values before an applied change
 */

// Legal/governance fields a non-super-admin may never write, even by restore.
const SUPER_ONLY_FIELDS = ["verificationStatus", "organizationId", "ownershipStatus"];

function notFound() {
  return Object.assign(new Error("Revision not found."), { status: 404, publicMessage: "Revision not found." });
}

async function loadEntity(revision) {
  const entity = await prisma[REVISION_MODELS[revision.entityType]].findUnique({ where: { id: revision.entityId } });
  if (!entity || entity.deletedAt) {
    throw Object.assign(new Error("Gone"), { status: 409, publicMessage: "That record has been deleted, so this change can't be applied." });
  }
  return entity;
}

async function loadScopedRevision(req, scopes) {
  const revision = await prisma.contentRevision.findUnique({ where: { id: req.params.id } });
  if (!revision) throw notFound();
  try {
    assertBrandScope(req.brandAccess, revision.brandId, scopes);
  } catch {
    throw notFound(); // don't reveal revisions outside the caller's brands
  }
  return revision;
}

export async function listRevisions(req, res, next) {
  try {
    const { entityId, entityType } = req.validQuery;
    const status = req.validQuery.status ?? (entityId ? undefined : "PENDING");
    const where = {
      ...(status ? { status } : {}),
      ...(entityId ? { entityId } : {}),
      ...(entityType ? { entityType } : {}),
      // The queue is for approvers; a record's history is visible to its editors.
      ...brandFilter(req.brandAccess, entityId ? SCOPES.edit : SCOPES.manage),
    };
    const revisions = await prisma.contentRevision.findMany({
      where,
      orderBy: { createdAt: entityId ? "desc" : "asc" },
      take: 100,
      include: { author: { select: { id: true, name: true } }, reviewer: { select: { id: true, name: true } } },
    });

    // Attach each record's name and current values of the changed fields, for diffs.
    const byType = { VENTURE: new Set(), PRODUCT: new Set() };
    revisions.forEach((r) => byType[r.entityType].add(r.entityId));
    const [ventures, products] = await Promise.all([
      prisma.venture.findMany({ where: { id: { in: [...byType.VENTURE] } } }),
      prisma.product.findMany({ where: { id: { in: [...byType.PRODUCT] } } }),
    ]);
    const entities = new Map([...ventures, ...products].map((e) => [e.id, e]));

    res.json(revisions.map((r) => {
      const entity = entities.get(r.entityId);
      return {
        ...r,
        entity: entity
          ? { id: entity.id, name: entity.name, status: entity.status, deleted: Boolean(entity.deletedAt), current: Object.fromEntries(Object.keys(r.changes).map((k) => [k, entity[k] ?? null])) }
          : null,
      };
    }));
  } catch (err) {
    next(err);
  }
}

export async function approveRevision(req, res, next) {
  try {
    const revision = await loadScopedRevision(req, SCOPES.manage);
    if (revision.status !== "PENDING") return res.status(409).json({ error: "This change has already been reviewed." });
    const entity = await loadEntity(revision);
    const changes = pickChanges(revision.changes, entity);
    const updated = await applyChanges({
      entityType: revision.entityType, entity, brandId: revision.brandId, changes,
      reviewerId: req.user.sub, reviewNote: req.body.reviewNote, pendingRevisionId: revision.id,
    });
    await audit(req, "APPROVE", "ContentRevision", revision.id, { entityId: entity.id });
    res.json({ message: "Change applied.", entity: updated });
  } catch (err) {
    next(err);
  }
}

export async function rejectRevision(req, res, next) {
  try {
    const revision = await loadScopedRevision(req, SCOPES.manage);
    if (revision.status !== "PENDING") return res.status(409).json({ error: "This change has already been reviewed." });
    const updated = await prisma.contentRevision.update({
      where: { id: revision.id },
      data: { status: "REJECTED", reviewerId: req.user.sub, reviewNote: req.body.reviewNote, reviewedAt: new Date() },
    });
    await audit(req, "REJECT", "ContentRevision", revision.id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function restoreRevision(req, res, next) {
  try {
    const revision = await loadScopedRevision(req, SCOPES.manage);
    if (revision.status !== "APPLIED" || !revision.previous) {
      return res.status(409).json({ error: "Only applied changes can be rolled back." });
    }
    const entity = await loadEntity(revision);
    const changes = pickChanges(revision.previous, entity);
    if (!req.brandAccess.all && Object.keys(changes).some((k) => SUPER_ONLY_FIELDS.includes(k))) {
      throw forbidden("This rollback touches verification or ownership. Ask a super admin.");
    }
    if (!Object.keys(changes).length) return res.json({ message: "Already matches that version.", entity });
    const updated = await applyChanges({
      entityType: revision.entityType, entity, brandId: revision.brandId, changes,
      userId: req.user.sub, note: `Rolled back the change made ${revision.createdAt.toISOString().slice(0, 10)}`,
    });
    await audit(req, "RESTORE", "ContentRevision", revision.id, { entityId: entity.id });
    res.json({ message: "Rolled back.", entity: updated });
  } catch (err) {
    next(err);
  }
}
