"use server";

import { revalidatePath } from "next/cache";
import {
  AuditAction,
  DesignJobStatus,
  NotificationType,
  OpportunityMemberRole,
  RoleKey,
  TaskPriority,
  type Prisma,
} from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { canManageAllOpportunities, opportunityManageWhere } from "@/modules/crm/access";
import { dueInHours, recordOperationalEvent } from "@/modules/operations/events";

export type DesignActionState = { error?: string; success?: string };

export async function assignDesignerAction(
  _previousState: DesignActionState,
  formData: FormData,
): Promise<DesignActionState> {
  const user = await requireUser();
  const opportunityId = String(formData.get("opportunityId") ?? "");
  const designerId = String(formData.get("designerId") ?? "");
  const dueAtValue = String(formData.get("dueAt") ?? "");
  if (!opportunityId || !designerId) return { error: "Choose a designer." };

  const opportunity = await db.opportunity.findFirst({
    where: { AND: [{ id: opportunityId, archivedAt: null }, opportunityManageWhere(user)] },
    select: { id: true, reference: true, ownerId: true },
  });
  if (!opportunity) return { error: "Opportunity not found or you cannot assign its designer." };
  if (!canManageAllOpportunities(user) && opportunity.ownerId !== user.id) {
    return { error: "Only the opportunity owner or a manager can assign the designer." };
  }

  const designer = await db.user.findFirst({
    where: {
      id: designerId,
      archivedAt: null,
      userRoles: { some: { role: { key: RoleKey.DESIGNER } } },
    },
    select: { id: true, displayName: true },
  });
  if (!designer) return { error: "The selected user is not an active designer." };

  const dueAt = dueAtValue && !Number.isNaN(Date.parse(dueAtValue))
    ? new Date(dueAtValue)
    : null;

  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.opportunityMember.deleteMany({
      where: { opportunityId, role: OpportunityMemberRole.DESIGN_OWNER },
    });
    await tx.opportunityMember.create({
      data: { opportunityId, userId: designer.id, role: OpportunityMemberRole.DESIGN_OWNER },
    });

    const active = await tx.designJob.findFirst({
      where: {
        opportunityId,
        status: { notIn: [DesignJobStatus.APPROVED, DesignJobStatus.CANCELLED] },
      },
      orderBy: { createdAt: "desc" },
    });
    if (active) {
      await tx.designJob.update({
        where: { id: active.id },
        data: { assignedToId: designer.id, dueAt },
      });
    } else {
      await tx.designJob.create({
        data: {
          opportunityId,
          assignedToId: designer.id,
          createdById: user.id,
          dueAt,
        },
      });
    }

    await recordOperationalEvent(tx, {
      actorId: user.id,
      actorName: user.displayName,
      action: AuditAction.ASSIGN,
      entityType: "Opportunity",
      entityId: opportunityId,
      opportunityId,
      actionUrl: `/opportunities/${opportunityId}?section=design`,
      subject: `Designer assigned: ${designer.displayName}`,
      body: dueAt ? `design package due ${dueAt.toLocaleString("en-GB")}.` : "Designer assignment created.",
      after: { designOwnerId: designer.id, designOwner: designer.displayName, dueAt: dueAt?.toISOString() ?? null },
      notifications: [{ recipientId: designer.id, type: NotificationType.ASSIGNMENT, title: `Design assignment: ${opportunity.reference}`, body: `${user.displayName} assigned you to prepare the design package.`, href: `/opportunities/${opportunityId}?section=design`, actionLabel: "Open design" }],
      task: {
        automationKey: `design-package:${opportunityId}`,
        title: `Prepare design package · ${opportunity.reference}`,
        description: "Complete Design values and upload the required design package.",
        assignedToId: designer.id,
        dueAt: dueAt ?? dueInHours(48),
        priority: TaskPriority.HIGH,
        sectionKey: "design",
        actionUrl: `/opportunities/${opportunityId}?section=design`,
        metadata: { workflow: "DESIGN_PACKAGE" },
      },
    });
  });

  revalidatePath(`/opportunities/${opportunityId}`);
  return { success: `Design assigned to ${designer.displayName}.` };
}
