"use server";

import { revalidatePath } from "next/cache";
import {
  ActivityType,
  AuditAction,
  OpportunityStage,
  RoleKey,
  UserStatus,
} from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import {
  canManageAllOpportunities,
  opportunityManageWhere,
} from "@/modules/crm/access";
import { assertAssignableOwner } from "@/modules/crm/queries";

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function reassignOpportunityOwnerFromPipelineAction(
  formData: FormData,
) {
  const user = await requireUser();
  if (!user.roles.includes(RoleKey.MANAGER) && !canManageAllOpportunities(user)) {
    throw new Error("Only an authorized manager can reassign opportunity owners.");
  }

  const opportunityId = stringValue(formData, "opportunityId");
  const ownerId = stringValue(formData, "ownerId");
  if (!opportunityId || !ownerId) {
    throw new Error("Choose an opportunity and a sales owner.");
  }

  const salesOwner = await db.user.findFirst({
    where: {
      id: ownerId,
      status: UserStatus.ACTIVE,
      archivedAt: null,
      userRoles: {
        some: {
          role: { key: { in: [RoleKey.RETAIL_SALES, RoleKey.PROJECT_SALES] } },
        },
      },
    },
    select: { id: true },
  });
  if (!salesOwner) {
    throw new Error("Choose an active Retail Sales or Project Sales user.");
  }

  await db.$transaction(async (tx) => {
    const opportunity = await tx.opportunity.findFirst({
      where: {
        AND: [{ id: opportunityId, archivedAt: null }, opportunityManageWhere(user)],
      },
      include: { owner: { select: { displayName: true } } },
    });

    if (!opportunity) {
      throw new Error("Opportunity not found or you cannot reassign it.");
    }

    if (opportunity.stage === OpportunityStage.WON) {
      throw new Error("Won opportunities are controlled by Order Coordination / Handover and the Sales owner.");
    }

    if (opportunity.ownerId === ownerId) return;

    await assertAssignableOwner(tx, ownerId);

    const updated = await tx.opportunity.update({
      where: { id: opportunity.id },
      data: { ownerId, version: { increment: 1 } },
      include: { owner: { select: { displayName: true } } },
    });

    await tx.activity.create({
      data: {
        type: ActivityType.SYSTEM,
        subject: "Owner reassigned from Pipeline",
        body: `${opportunity.owner.displayName} -> ${updated.owner.displayName}`,
        opportunityId: opportunity.id,
        createdById: user.id,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: AuditAction.ASSIGN,
        entityType: "Opportunity",
        entityId: opportunity.id,
        opportunityId: opportunity.id,
        before: { ownerId: opportunity.ownerId },
        after: { ownerId },
      },
    });
  });

  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/${opportunityId}`);
}
