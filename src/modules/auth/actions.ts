"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuditAction, UserStatus } from "@/generated/prisma/client";
import { authConfig } from "@/lib/auth/config";
import { requireUser } from "@/lib/auth/dal";
import {
  createSession,
  revokeAllUserSessions,
  revokeCurrentSession,
} from "@/lib/auth/session";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/security/password";
import { changePasswordSchema, loginSchema } from "@/modules/auth/schemas";

export type AuthActionState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

async function auditMetadata(): Promise<{
  ipAddress?: string;
  userAgent?: string;
}> {
  const headerStore = await headers();
  return {
    ipAddress:
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headerStore.get("x-real-ip")?.trim() ||
      undefined,
    userAgent: headerStore.get("user-agent")?.slice(0, 500) || undefined,
  };
}

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const metadata = await auditMetadata();
  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
  });

  const genericError = "Email or password is incorrect.";

  if (!user || user.archivedAt || user.status === UserStatus.DISABLED) {
    await db.auditLog.create({
      data: {
        action: AuditAction.LOGIN_FAILED,
        entityType: "User",
        entityId: parsed.data.email,
        metadata: { reason: "INVALID_CREDENTIALS_OR_DISABLED" },
        ...metadata,
      },
    });
    return { error: genericError };
  }

  const now = new Date();
  if (
    user.status === UserStatus.LOCKED ||
    (user.lockedUntil && user.lockedUntil > now)
  ) {
    return {
      error: "This account is temporarily locked. Try again later or contact Admin.",
    };
  }

  const validPassword = await verifyPassword(
    user.passwordHash,
    parsed.data.password,
  );

  if (!validPassword) {
    const attempts = user.failedLoginAttempts + 1;
    const shouldLock = attempts >= authConfig.loginMaxAttempts;
    const lockedUntil = shouldLock
      ? new Date(Date.now() + authConfig.loginLockMinutes * 60 * 1000)
      : null;

    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: shouldLock ? 0 : attempts,
          lockedUntil,
        },
      }),
      db.auditLog.create({
        data: {
          actorId: user.id,
          action: AuditAction.LOGIN_FAILED,
          entityType: "User",
          entityId: user.id,
          metadata: {
            attempts,
            lockedUntil: lockedUntil?.toISOString() ?? null,
          },
          ...metadata,
        },
      }),
    ]);

    return {
      error: shouldLock
        ? `Too many failed attempts. Account locked for ${authConfig.loginLockMinutes} minutes.`
        : genericError,
    };
  }

  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: now,
      },
    }),
    db.auditLog.create({
      data: {
        actorId: user.id,
        action: AuditAction.LOGIN,
        entityType: "User",
        entityId: user.id,
        ...metadata,
      },
    }),
  ]);

  await createSession(user.id, user.sessionVersion);
  redirect(user.forcePasswordChange ? "/change-password" : "/dashboard");
}

export async function changePasswordAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const currentUser = await requireUser({ allowForcedPasswordChange: true });
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const user = await db.user.findUniqueOrThrow({
    where: { id: currentUser.id },
    select: { id: true, passwordHash: true, sessionVersion: true },
  });

  const validCurrentPassword = await verifyPassword(
    user.passwordHash,
    parsed.data.currentPassword,
  );
  if (!validCurrentPassword) {
    return { error: "Current password is incorrect." };
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  const nextSessionVersion = user.sessionVersion + 1;
  const metadata = await auditMetadata();

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        forcePasswordChange: false,
        sessionVersion: nextSessionVersion,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    await tx.session.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: AuditAction.PASSWORD_CHANGE,
        entityType: "User",
        entityId: user.id,
        metadata: { allPreviousSessionsRevoked: true },
        ...metadata,
      },
    });
  });

  await createSession(user.id, nextSessionVersion);
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  const userId = await revokeCurrentSession();
  if (userId) {
    const metadata = await auditMetadata();
    await db.auditLog.create({
      data: {
        actorId: userId,
        action: AuditAction.LOGOUT,
        entityType: "User",
        entityId: userId,
        ...metadata,
      },
    });
  }
  redirect("/login");
}

export async function logoutAllSessionsAction(): Promise<void> {
  const user = await requireUser({ allowForcedPasswordChange: true });
  await revokeAllUserSessions(user.id);
  const metadata = await auditMetadata();
  await db.auditLog.create({
    data: {
      actorId: user.id,
      action: AuditAction.SESSION_REVOKE,
      entityType: "User",
      entityId: user.id,
      metadata: { scope: "ALL" },
      ...metadata,
    },
  });
  await revokeCurrentSession();
  redirect("/login");
}
