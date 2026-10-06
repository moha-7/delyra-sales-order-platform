import { cache } from "react";
import { createHmac, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { UserStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { authConfig } from "@/lib/auth/config";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

function authSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must contain at least 32 characters");
  }
  return secret;
}

function hashToken(token: string): string {
  return createHmac("sha256", authSecret()).update(token).digest("hex");
}

function newToken(): string {
  return randomBytes(32).toString("base64url");
}

async function requestMetadata(): Promise<{
  ipAddress?: string;
  userAgent?: string;
}> {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headerStore.get("x-real-ip")?.trim();
  const userAgent = headerStore.get("user-agent")?.slice(0, 500);

  return {
    ipAddress: forwarded || realIp || undefined,
    userAgent: userAgent || undefined,
  };
}

export type AuthenticatedUser = {
  id: string;
  email: string;
  displayName: string;
  initials: string | null;
  department: string;
  dataScope: string;
  forcePasswordChange: boolean;
  accountType: string;
  roles: string[];
  permissions: string[];
};

export type AuthSession = {
  id: string;
  expiresAt: Date;
  user: AuthenticatedUser;
};

export async function createSession(
  userId: string,
  sessionVersion: number,
): Promise<void> {
  const token = newToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(
    Date.now() + authConfig.sessionTtlHours * 60 * 60 * 1000,
  );
  const metadata = await requestMetadata();

  await db.session.create({
    data: {
      userId,
      tokenHash,
      sessionVersion,
      expiresAt,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
    priority: "high",
  });
}

async function readSession(): Promise<AuthSession | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const now = new Date();
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  permissions: {
                    where: { allowed: true },
                    include: { permission: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (
    !session ||
    session.revokedAt ||
    session.expiresAt <= now ||
    session.user.archivedAt ||
    session.user.status !== UserStatus.ACTIVE ||
    session.sessionVersion !== session.user.sessionVersion
  ) {
    return null;
  }

  const roles = session.user.userRoles.map(({ role }) => role.key);
  const permissions: string[] = Array.from(
    new Set<string>(
      session.user.userRoles.flatMap(({ role }) =>
        role.permissions.map(({ permission }) => permission.key),
      ),
    ),
  );

  return {
    id: session.id,
    expiresAt: session.expiresAt,
    user: {
      id: session.user.id,
      email: session.user.email,
      displayName: session.user.displayName,
      initials: session.user.initials,
      department: session.user.department,
      dataScope: session.user.dataScope,
      forcePasswordChange: session.user.forcePasswordChange,
      accountType: session.user.accountType,
      roles,
      permissions,
    },
  };
}

export const getSession = cache(readSession);

export async function revokeCurrentSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  cookieStore.delete(SESSION_COOKIE_NAME);

  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, userId: true, revokedAt: true },
  });

  if (!session) return null;

  if (!session.revokedAt) {
    await db.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
  }

  return session.userId;
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await db.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
