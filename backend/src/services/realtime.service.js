import { Server } from "socket.io";
import { prisma } from "../config/prisma.js";
import { verifyAccessToken } from "./token.service.js";

/**
 * Live admin updates over Socket.IO: new leads, messages, approvals and
 * testimonials appear in the admin without a refresh.
 *
 * Only signed-in staff can connect (same access token as the API). Each
 * socket joins rooms for exactly what its user may see:
 *   "super"                 super admins (everything)
 *   "messages"              super admins and admins (contact messages)
 *   "brand:<id>:<scope>"    one room per brand grant
 * Events carry a short summary only; the admin re-fetches details through
 * the normal, access-checked API. The connection is closed when the access
 * token expires, and the client reconnects with a fresh one.
 */

let io = null;

export function initRealtime(httpServer, allowedOrigins) {
  io = new Server(httpServer, {
    path: "/api/v1/realtime",
    cors: { origin: allowedOrigins, credentials: true },
    serveClient: false,
    maxHttpBufferSize: 1e4, // clients only listen; nothing large is accepted
  });

  io.use(async (socket, next) => {
    try {
      const claims = verifyAccessToken(socket.handshake.auth?.token);
      const user = await prisma.user.findUnique({
        where: { id: claims.sub },
        select: { id: true, role: true, isActive: true, deletedAt: true, brandRoles: { select: { brandId: true, scope: true } } },
      });
      if (!user || !user.isActive || user.deletedAt) return next(new Error("unauthorized"));
      socket.data.user = user;
      socket.data.expiresAt = claims.exp * 1000;
      return next();
    } catch {
      return next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const { user, expiresAt } = socket.data;
    if (user.role === "SUPER_ADMIN") socket.join("super");
    if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") socket.join("messages");
    for (const r of user.brandRoles) socket.join(`brand:${r.brandId}:${r.scope}`);

    const timer = setTimeout(() => socket.disconnect(true), Math.max(expiresAt - Date.now(), 1000));
    socket.on("disconnect", () => clearTimeout(timer));
  });

  return io;
}

/**
 * Tell the right staff something happened.
 *   kind     "lead" | "message" | "approval" | "testimonial"
 *   brandId  the brand it belongs to (null: super admins only)
 *   scopes   brand scopes that may see it, e.g. ["ADMIN", "LEAD_MANAGER"]
 *   rooms    extra rooms (e.g. "messages")
 */
export function notifyStaff({ kind, brandId = null, scopes = [], rooms = [], title, body, link }) {
  if (!io) return;
  const targets = ["super", ...rooms, ...(brandId ? scopes.map((s) => `brand:${brandId}:${s}`) : [])];
  io.to(targets).emit("notify", { kind, title, body: body?.slice(0, 140), link, at: new Date().toISOString() });
}

/** Tests and shutdown. */
export function closeRealtime() {
  io?.close();
  io = null;
}
