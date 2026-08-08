import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import {
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} from "../services/token.service.js";

const REFRESH_COOKIE = "refreshToken";
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = await issueRefreshToken(user, {
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await prisma.auditLog.create({
      data: { userId: user.id, action: "LOGIN", entityType: "User", entityId: user.id, ipAddress: req.ip },
    });

    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
    res.json({
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl },
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const rawToken = req.cookies?.[REFRESH_COOKIE];
    if (!rawToken) return res.status(401).json({ error: "No refresh token provided." });

    const result = await rotateRefreshToken(rawToken, {
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    if (!result) {
      res.clearCookie(REFRESH_COOKIE);
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }

    const accessToken = signAccessToken(result.user);
    res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOptions);
    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const rawToken = req.cookies?.[REFRESH_COOKIE];
    if (rawToken) await revokeRefreshToken(rawToken);
    res.clearCookie(REFRESH_COOKIE);
    res.json({ message: "Logged out." });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl });
  } catch (err) {
    next(err);
  }
}
