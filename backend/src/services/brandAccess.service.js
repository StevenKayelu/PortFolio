import { prisma } from "../config/prisma.js";

/**
 * Brand-scoped authorization (Digital Ecosystem report §08).
 *
 * SUPER_ADMIN (User.role) can act on every brand. Everyone else can act
 * only on brands granted through UserBrandRole, at that grant's scope:
 *   ADMIN        brand settings, ventures, products, publishing, leads
 *   EDITOR       ventures/products as drafts (cannot publish)
 *   LEAD_MANAGER leads only
 *
 * The frontend's brand switcher is presentation only; every admin
 * handler must check access here.
 */

export const SCOPES = {
  manage: ["ADMIN"],
  edit: ["ADMIN", "EDITOR"],
  leads: ["ADMIN", "LEAD_MANAGER"],
};

export function forbidden(message = "You don't have access to this brand.") {
  const err = new Error(message);
  err.status = 403;
  err.publicMessage = message;
  return err;
}

export async function loadBrandAccess(req, res, next) {
  try {
    if (req.user?.role === "SUPER_ADMIN") {
      req.brandAccess = { all: true, scopes: new Map() };
      return next();
    }
    // Re-read from the database so revoked grants and deactivated users
    // take effect immediately, not when the access token expires.
    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { isActive: true, deletedAt: true, brandRoles: { select: { brandId: true, scope: true } } },
    });
    if (!user || !user.isActive || user.deletedAt) {
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }
    req.brandAccess = { all: false, scopes: new Map(user.brandRoles.map((r) => [r.brandId, r.scope])) };
    return next();
  } catch (err) {
    return next(err);
  }
}

export function hasBrandScope(access, brandId, allowed) {
  if (access.all) return true;
  if (!brandId) return false; // unassigned records are super-admin only
  const scope = access.scopes.get(brandId);
  return Boolean(scope && allowed.includes(scope));
}

export function assertBrandScope(access, brandId, allowed) {
  if (!hasBrandScope(access, brandId, allowed)) throw forbidden();
}

/** Prisma `where` fragment limiting a query to brands the user may see. */
export function brandFilter(access, allowed, field = "brandId") {
  if (access.all) return {};
  const ids = [...access.scopes].filter(([, scope]) => allowed.includes(scope)).map(([id]) => id);
  return { [field]: { in: ids } };
}

export function requireSuperAdmin(req, res, next) {
  if (req.user?.role !== "SUPER_ADMIN") {
    return res.status(403).json({ error: "Only a super admin can do that." });
  }
  return next();
}
