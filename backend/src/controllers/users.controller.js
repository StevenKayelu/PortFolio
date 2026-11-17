import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { audit } from "../services/audit.service.js";
import { issueRefreshToken } from "../services/token.service.js";
import { REFRESH_COOKIE, cookieOptions } from "./auth.controller.js";

/**
 * Staff accounts (super admin only, except change-own-password).
 * Guards against lock-out: you can't demote or deactivate yourself,
 * and the last active super admin can't be demoted or deactivated.
 */

const publicUser = {
  id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true,
  brandRoles: { select: { scope: true, brand: { select: { id: true, key: true, name: true } } } },
};

const badRequest = (message) => Object.assign(new Error(message), { status: 400, publicMessage: message });

async function revokeSessions(userId) {
  await prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function adminCreateUser(req, res, next) {
  try {
    const { password, ...data } = req.body;
    const user = await prisma.user.create({
      data: { ...data, passwordHash: await bcrypt.hash(password, 12) },
      select: publicUser,
    });
    await audit(req, "CREATE", "User", user.id, { role: user.role });
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateUser(req, res, next) {
  try {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target || target.deletedAt) return res.status(404).json({ error: "User not found." });

    const demoting = req.body.role !== undefined && req.body.role !== "SUPER_ADMIN" && target.role === "SUPER_ADMIN";
    const deactivating = req.body.isActive === false && target.isActive;
    if (target.id === req.user.sub && (demoting || deactivating || (req.body.role && req.body.role !== target.role))) {
      throw badRequest("You can't change your own role or deactivate yourself.");
    }
    if (demoting || (deactivating && target.role === "SUPER_ADMIN")) {
      const supers = await prisma.user.count({ where: { role: "SUPER_ADMIN", isActive: true, deletedAt: null } });
      if (supers <= 1) throw badRequest("Keep at least one active super admin.");
    }

    const user = await prisma.user.update({ where: { id: target.id }, data: req.body, select: publicUser });
    if (deactivating) await revokeSessions(target.id);
    await audit(req, "UPDATE", "User", target.id, req.body);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function adminResetPassword(req, res, next) {
  try {
    const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!target) return res.status(404).json({ error: "User not found." });
    await prisma.user.update({ where: { id: target.id }, data: { passwordHash: await bcrypt.hash(req.body.password, 12) } });
    await revokeSessions(target.id); // sign them out everywhere
    await audit(req, "RESET_PASSWORD", "User", target.id);
    res.json({ message: "Password reset. They have been signed out everywhere." });
  } catch (err) {
    next(err);
  }
}

/** Any signed-in user. Signs out other sessions and keeps this one. */
export async function changeOwnPassword(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user || !user.isActive) return res.status(401).json({ error: "Session expired. Please log in again." });
    if (!(await bcrypt.compare(req.body.currentPassword, user.passwordHash))) {
      return res.status(400).json({ error: "Your current password is incorrect.", fields: { currentPassword: ["Incorrect password."] } });
    }
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(req.body.newPassword, 12) } });
    await revokeSessions(user.id);
    const refreshToken = await issueRefreshToken(user, { userAgent: req.headers["user-agent"], ipAddress: req.ip });
    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
    await audit(req, "CHANGE_PASSWORD", "User", user.id);
    res.json({ message: "Password changed. Other sessions have been signed out." });
  } catch (err) {
    next(err);
  }
}
