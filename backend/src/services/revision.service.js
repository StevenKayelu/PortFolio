import { prisma } from "../config/prisma.js";

/**
 * Editorial revisions for ventures and products (report §06, §08).
 *  - applyChanges(): writes the entity and records an APPLIED revision
 *    holding both the new and the previous values (history + rollback).
 *  - proposeChanges(): records a PENDING revision without touching the
 *    entity; a brand admin applies it later.
 */

export const REVISION_MODELS = { VENTURE: "venture", PRODUCT: "product" };

/** Only the fields whose value actually differs (admin forms resend everything). */
export function pickChanges(body, existing) {
  return Object.fromEntries(
    Object.entries(body).filter(([k, v]) => v !== undefined && v !== (existing[k] ?? null) && !(v === null && existing[k] === undefined))
  );
}

const snapshot = (entity, keys) => Object.fromEntries(keys.map((k) => [k, entity[k] ?? null]));

export async function applyChanges({ entityType, entity, brandId, changes, userId, note, reviewerId, reviewNote, pendingRevisionId }) {
  const model = REVISION_MODELS[entityType];
  const previous = snapshot(entity, Object.keys(changes));
  const [updated] = await prisma.$transaction([
    prisma[model].update({ where: { id: entity.id }, data: changes }),
    pendingRevisionId
      ? prisma.contentRevision.update({
          where: { id: pendingRevisionId },
          data: { status: "APPLIED", previous, reviewerId, reviewNote, reviewedAt: new Date() },
        })
      : prisma.contentRevision.create({
          data: { entityType, entityId: entity.id, brandId, status: "APPLIED", changes, previous, note, authorId: userId, reviewerId: userId, reviewedAt: new Date() },
        }),
  ]);
  return updated;
}

export function proposeChanges({ entityType, entity, brandId, changes, userId, note }) {
  return prisma.contentRevision.create({
    data: { entityType, entityId: entity.id, brandId, status: "PENDING", changes, note, authorId: userId },
    select: { id: true, status: true, changes: true, createdAt: true },
  });
}
