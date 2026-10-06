import { RoleKey, UserStatus, type Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export const CRM_OWNER_ROLES = [
  RoleKey.MANAGER,
  RoleKey.PROJECT_MANAGER,
  RoleKey.PROJECT_SALES,
  RoleKey.RETAIL_SALES,
] as const;

export async function listAssignableOwners() {
  return db.user.findMany({
    where: {
      status: UserStatus.ACTIVE,
      archivedAt: null,
      userRoles: {
        some: {
          role: { key: { in: [...CRM_OWNER_ROLES] } },
        },
      },
    },
    select: {
      id: true,
      displayName: true,
      initials: true,
      department: true,
    },
    orderBy: { displayName: "asc" },
  });
}

export async function assertAssignableOwner(
  tx: Prisma.TransactionClient,
  ownerId: string,
): Promise<void> {
  const owner = await tx.user.findFirst({
    where: {
      id: ownerId,
      status: UserStatus.ACTIVE,
      archivedAt: null,
      userRoles: {
        some: {
          role: { key: { in: [...CRM_OWNER_ROLES] } },
        },
      },
    },
    select: { id: true },
  });

  if (!owner) {
    throw new Error("The selected owner is not an active CRM owner.");
  }
}
