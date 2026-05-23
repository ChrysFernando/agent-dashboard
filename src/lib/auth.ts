import { randomBytes } from "node:crypto";

import { SessionSubject } from "@prisma/client";
import bcrypt from "bcryptjs";

import { prisma } from "./prisma.js";

export const ADMIN_COOKIE = "sentinel_session";
export const PORTAL_COOKIE = "aether_session";
const SESSION_TTL_HOURS = 24 * 7;
const BCRYPT_ROUNDS = 10;

export function generateSessionId(): string {
  return randomBytes(32).toString("hex");
}

export function generateRandomPassword(length = 20): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#%^&*";
  const buf = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += alphabet[buf[i] % alphabet.length];
  }
  return out;
}

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, BCRYPT_ROUNDS);
}

export async function verifyPassword(plaintext: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) {
    return false;
  }
  return bcrypt.compare(plaintext, hash);
}

export function sessionExpiresAt(): Date {
  return new Date(Date.now() + SESSION_TTL_HOURS * 3_600_000);
}

export async function createSession(input: {
  subjectType: SessionSubject;
  subjectId: string;
  workspaceId?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
}) {
  const id = generateSessionId();
  await prisma.session.create({
    data: {
      id,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      workspaceId: input.workspaceId ?? null,
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
      expiresAt: sessionExpiresAt(),
    },
  });
  return id;
}

export async function lookupSession(sessionId: string | undefined | null) {
  if (!sessionId) {
    return null;
  }
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) {
    return null;
  }
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => undefined);
    return null;
  }
  // Sliding refresh: bump lastSeenAt; only extend expiry if more than an hour
  // has passed since lastSeenAt to avoid a write on every request.
  if (Date.now() - session.lastSeenAt.getTime() > 3_600_000) {
    await prisma.session.update({
      where: { id: sessionId },
      data: { lastSeenAt: new Date(), expiresAt: sessionExpiresAt() },
    });
  }
  return session;
}

export async function revokeSession(sessionId: string | undefined | null) {
  if (!sessionId) {
    return;
  }
  await prisma.session.deleteMany({ where: { id: sessionId } });
}

export async function loadAdminFromSession(sessionId: string | undefined | null) {
  const session = await lookupSession(sessionId);
  if (!session || session.subjectType !== SessionSubject.admin) {
    return null;
  }
  const admin = await prisma.adminUser.findUnique({ where: { id: session.subjectId } });
  if (!admin || !admin.isActive) {
    return null;
  }
  return { session, admin };
}

export async function loadTeamMemberFromSession(sessionId: string | undefined | null) {
  const session = await lookupSession(sessionId);
  if (!session || session.subjectType !== SessionSubject.team) {
    return null;
  }
  const member = await prisma.teamMember.findUnique({
    where: { id: session.subjectId },
    include: { workspace: true },
  });
  if (!member) {
    return null;
  }
  return { session, member };
}

export function cookieOptions(maxAgeSeconds = SESSION_TTL_HOURS * 3600) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: false,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
