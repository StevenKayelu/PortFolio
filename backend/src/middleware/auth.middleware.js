import { verifyAccessToken } from "../services/token.service.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Authentication required." });
  }

  try {
    req.user = verifyAccessToken(token);
    return next();
  } catch {
    return res.status(401).json({ error: "Session expired. Please log in again." });
  }
}

/**
 * Attaches req.user when a valid access token is present, but never
 * rejects — for public endpoints that reveal extra data (drafts) to staff.
 */
export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (token) {
    try {
      req.user = verifyAccessToken(token);
    } catch {
      // treat an invalid/expired token as anonymous
    }
  }
  return next();
}

export const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "EDITOR"];

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "You don't have permission to do that." });
    }
    return next();
  };
}
