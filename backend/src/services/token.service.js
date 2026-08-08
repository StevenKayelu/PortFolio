import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../config/prisma.js";

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m" }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

// Refresh tokens are stored hashed + rotated on every use (rotation
// prevents replay if a token is stolen from a stale device).
export async function issueRefreshToken(user, meta = {}) {
  const raw = crypto.randomBytes(64).toString("hex");
  const hashed = crypto.createHash("sha256").update(raw).digest("hex");

  const expiresInDays = parseInt(process.env.JWT_REFRESH_EXPIRES_IN) || 30;
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      token: hashed,
      userId: user.id,
      expiresAt,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    },
  });

  return raw; // the raw token is what goes in the client's httpOnly cookie
}

export async function rotateRefreshToken(rawToken, meta = {}) {
  const hashed = crypto.createHash("sha256").update(rawToken).digest("hex");

  const existing = await prisma.refreshToken.findUnique({
    where: { token: hashed },
    include: { user: true },
  });

  if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
    return null; // caller treats this as "must log in again"
  }

  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });

  const newRawToken = await issueRefreshToken(existing.user, meta);
  return { user: existing.user, refreshToken: newRawToken };
}

export async function revokeRefreshToken(rawToken) {
  const hashed = crypto.createHash("sha256").update(rawToken).digest("hex");
  await prisma.refreshToken
    .updateMany({
      where: { token: hashed, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    .catch(() => {});
}
