import { redirect } from "next/navigation";
import { getSession, type AuthenticatedUser } from "@/lib/auth/session";

export async function requireUser(options?: {
  allowForcedPasswordChange?: boolean;
}): Promise<AuthenticatedUser> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (
    session.user.forcePasswordChange &&
    !options?.allowForcedPasswordChange
  ) {
    redirect("/change-password");
  }

  return session.user;
}

export async function requirePermission(
  permission: string,
): Promise<AuthenticatedUser> {
  const user = await requireUser();
  if (!user.permissions.includes(permission)) {
    redirect("/dashboard?error=forbidden");
  }
  return user;
}

export function hasPermission(
  user: Pick<AuthenticatedUser, "permissions">,
  permission: string,
): boolean {
  return user.permissions.includes(permission);
}
