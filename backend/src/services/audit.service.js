import { prisma } from "../config/prisma.js";

/**
 * Best-effort audit trail for admin writes. A failed audit write is
 * logged but never fails the request it describes.
 */
export async function audit(req, action, entityType, entityId, metadata) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: req.user?.sub ?? null,
        action,
        entityType,
        entityId: entityId ?? null,
        metadata: metadata ?? undefined,
        ipAddress: req.ip,
      },
    });
  } catch (err) {
    console.error("Audit log write failed:", err.message);
  }
}
