import type { AuthenticatedUser } from "@/lib/auth/session";
import type { Prisma } from "@/generated/prisma/client";
import { PERMISSIONS } from "@/modules/rbac/permissions";

export function canManageTasks(user: AuthenticatedUser): boolean {
  return user.permissions.includes(PERMISSIONS.TASKS_MANAGE);
}

export function taskViewWhere(user: AuthenticatedUser): Prisma.TaskWhereInput {
  if (
    user.permissions.includes(PERMISSIONS.OPPORTUNITIES_VIEW_ALL) ||
    user.permissions.includes(PERMISSIONS.OPPORTUNITIES_MANAGE_ALL) ||
    user.roles.includes("MANAGER") ||
    user.roles.includes("SYSTEM_ADMIN")
  ) {
    return { archivedAt: null };
  }
  return {
    archivedAt: null,
    OR: [
      { assignedToId: user.id },
      { createdById: user.id },
      { watchers: { some: { userId: user.id } } },
      { opportunity: { ownerId: user.id } },
      { opportunity: { members: { some: { userId: user.id } } } },
    ],
  };
}
