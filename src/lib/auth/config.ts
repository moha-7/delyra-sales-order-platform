function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const authConfig = {
  sessionTtlHours: positiveInteger(process.env.SESSION_TTL_HOURS, 8),
  loginMaxAttempts: positiveInteger(process.env.LOGIN_MAX_ATTEMPTS, 5),
  loginLockMinutes: positiveInteger(process.env.LOGIN_LOCK_MINUTES, 15),
} as const;
