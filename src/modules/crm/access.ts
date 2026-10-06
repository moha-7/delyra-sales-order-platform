import type { Prisma } from "@/generated/prisma/client";
import type { AuthenticatedUser } from "@/lib/auth/session";
import { PERMISSIONS } from "@/modules/rbac/permissions";

export function hasAnyPermission(
  user: Pick<AuthenticatedUser, "permissions">,
  permissions: readonly string[],
): boolean {
  return permissions.some((permission) => user.permissions.includes(permission));
}

export function canCreateLead(user: AuthenticatedUser): boolean {
  return hasAnyPermission(user, [
    PERMISSIONS.LEADS_MANAGE_OWN,
    PERMISSIONS.LEADS_MANAGE_ALL,
  ]);
}


function hasRole(user: AuthenticatedUser, roles: readonly string[]): boolean {
  return roles.some((role) => user.roles.includes(role));
}

export function canCreateRetailLead(user: AuthenticatedUser): boolean {
  return canCreateLead(user) && hasRole(user, [
    "RETAIL_SALES",
    "MANAGER",
    "SYSTEM_ADMIN",
  ]);
}

export function canCreateProjectLead(user: AuthenticatedUser): boolean {
  return canCreateLead(user) && hasRole(user, [
    "PROJECT_SALES",
    "PROJECT_MANAGER",
    "MANAGER",
    "SYSTEM_ADMIN",
  ]);
}

export function canViewLeads(user: AuthenticatedUser): boolean {
  return hasAnyPermission(user, [
    PERMISSIONS.LEADS_MANAGE_OWN,
    PERMISSIONS.LEADS_MANAGE_ALL,
    PERMISSIONS.LEADS_VIEW_ALL,
  ]);
}

export function canManageAllLeads(user: AuthenticatedUser): boolean {
  return user.permissions.includes(PERMISSIONS.LEADS_MANAGE_ALL);
}

export function canManageOwnLeads(user: AuthenticatedUser): boolean {
  return user.permissions.includes(PERMISSIONS.LEADS_MANAGE_OWN);
}

export function leadViewWhere(user: AuthenticatedUser): Prisma.LeadWhereInput {
  if (
    user.permissions.includes(PERMISSIONS.LEADS_VIEW_ALL) ||
    user.permissions.includes(PERMISSIONS.LEADS_MANAGE_ALL)
  ) {
    return {};
  }

  if (user.permissions.includes(PERMISSIONS.LEADS_MANAGE_OWN)) {
    return { ownerId: user.id };
  }

  return { id: "00000000-0000-0000-0000-000000000000" };
}

export function leadManageWhere(user: AuthenticatedUser): Prisma.LeadWhereInput {
  if (user.permissions.includes(PERMISSIONS.LEADS_MANAGE_ALL)) {
    return {};
  }

  if (user.permissions.includes(PERMISSIONS.LEADS_MANAGE_OWN)) {
    return { ownerId: user.id };
  }

  return { id: "00000000-0000-0000-0000-000000000000" };
}

export function canViewOpportunities(user: AuthenticatedUser): boolean {
  return hasAnyPermission(user, [
    PERMISSIONS.OPPORTUNITIES_MANAGE_OWN,
    PERMISSIONS.OPPORTUNITIES_MANAGE_ALL,
    PERMISSIONS.OPPORTUNITIES_VIEW_ALL,
  ]);
}

export function canManageAllOpportunities(user: AuthenticatedUser): boolean {
  return user.permissions.includes(PERMISSIONS.OPPORTUNITIES_MANAGE_ALL);
}

export function canManageOwnOpportunities(user: AuthenticatedUser): boolean {
  return user.permissions.includes(PERMISSIONS.OPPORTUNITIES_MANAGE_OWN);
}

function assignedOpportunityWhere(
  user: AuthenticatedUser,
): Prisma.OpportunityWhereInput {
  if (user.dataScope === "ASSIGNED") {
    return {
      OR: [
        { ownerId: user.id },
        { members: { some: { userId: user.id } } },
      ],
    };
  }

  return { ownerId: user.id };
}

export function opportunityViewWhere(
  user: AuthenticatedUser,
): Prisma.OpportunityWhereInput {
  if (
    user.permissions.includes(PERMISSIONS.OPPORTUNITIES_VIEW_ALL) ||
    user.permissions.includes(PERMISSIONS.OPPORTUNITIES_MANAGE_ALL)
  ) {
    return {};
  }

  if (user.permissions.includes(PERMISSIONS.OPPORTUNITIES_MANAGE_OWN)) {
    return assignedOpportunityWhere(user);
  }

  return { id: "00000000-0000-0000-0000-000000000000" };
}

export function opportunityManageWhere(
  user: AuthenticatedUser,
): Prisma.OpportunityWhereInput {
  if (user.permissions.includes(PERMISSIONS.OPPORTUNITIES_MANAGE_ALL)) {
    return {};
  }

  if (user.permissions.includes(PERMISSIONS.OPPORTUNITIES_MANAGE_OWN)) {
    return assignedOpportunityWhere(user);
  }

  return { id: "00000000-0000-0000-0000-000000000000" };
}

export function canViewCustomers(user: AuthenticatedUser): boolean {
  return user.permissions.includes(PERMISSIONS.CUSTOMERS_VIEW);
}

export function canManageCustomers(user: AuthenticatedUser): boolean {
  return user.permissions.includes(PERMISSIONS.CUSTOMERS_MANAGE);
}

export function customerViewWhere(
  user: AuthenticatedUser,
): Prisma.CustomerWhereInput {
  if (!canViewCustomers(user)) {
    return { id: "00000000-0000-0000-0000-000000000000" };
  }

  if (user.dataScope === "ALL") {
    return {};
  }

  const opportunityAccess =
    user.dataScope === "ASSIGNED"
      ? {
          OR: [
            { ownerId: user.id },
            { members: { some: { userId: user.id } } },
          ],
        }
      : { ownerId: user.id };

  return {
    OR: [
      { createdById: user.id },
      { opportunities: { some: opportunityAccess } },
    ],
  };
}

export function customerManageWhere(
  user: AuthenticatedUser,
): Prisma.CustomerWhereInput {
  if (!canManageCustomers(user)) {
    return { id: "00000000-0000-0000-0000-000000000000" };
  }

  return customerViewWhere(user);
}

export function canConvertLead(user: AuthenticatedUser): boolean {
  return user.permissions.includes(PERMISSIONS.LEADS_CONVERT);
}
