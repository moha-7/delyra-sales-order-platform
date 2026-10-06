"use server";

import { revalidatePath } from "next/cache";
import {
  AuditAction,
  ChecklistStatus,
  NotificationType,
  type Prisma,
} from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { opportunityViewWhere } from "@/modules/crm/access";
import { recordOperationalEvent } from "@/modules/operations/events";
import { PERMISSIONS } from "@/modules/rbac/permissions";

export type ChecklistActionState = { error?: string; success?: string };

export async function updateChecklistItemAction(
  _previousState: ChecklistActionState,
  formData: FormData,
): Promise<ChecklistActionState> {
  const user = await requireUser();
  if (!user.permissions.includes(PERMISSIONS.CHECKLIST_UPDATE))
    return { error: "Checklist permission is required." };
  const opportunityId = String(formData.get("opportunityId") ?? "");
  const definitionId = String(formData.get("definitionId") ?? "");
  const status = String(formData.get("status") ?? "") as ChecklistStatus;
  const comment = String(formData.get("comment") ?? "").trim();
  if (
    !opportunityId ||
    !definitionId ||
    !Object.values(ChecklistStatus).includes(status)
  )
    return { error: "Invalid checklist update." };

  const opportunity = await db.opportunity.findFirst({
    where: {
      AND: [
        { id: opportunityId, archivedAt: null },
        opportunityViewWhere(user),
      ],
    },
    select: { id: true },
  });
  if (!opportunity)
    return { error: "Opportunity not found or not accessible." };
  const definition = await db.checklistDefinition.findUnique({
    where: { id: definitionId },
  });
  if (!definition || definition.autoRule)
    return { error: "This checklist item is controlled automatically." };
  const allowed =
    user.roles.includes("MANAGER") ||
    user.permissions.includes(PERMISSIONS.CHECKLIST_ADMIN) ||
    !definition.responsibleRole ||
    user.roles.includes(definition.responsibleRole);
  if (!allowed) return { error: "This item belongs to another role." };

  const completed =
    status === ChecklistStatus.COMPLETED ||
    status === ChecklistStatus.NOT_APPLICABLE;
  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const previous = await tx.opportunityChecklistItem.findUnique({
      where: { opportunityId_definitionId: { opportunityId, definitionId } },
    });
    const item = await tx.opportunityChecklistItem.upsert({
      where: { opportunityId_definitionId: { opportunityId, definitionId } },
      create: {
        opportunityId,
        definitionId,
        labelSnapshot: definition.label,
        status,
        completedById: completed ? user.id : null,
        completedAt: completed ? new Date() : null,
        comment: comment || null,
        blockedReason:
          status === ChecklistStatus.BLOCKED ? comment || "Blocked" : null,
      },
      update: {
        status,
        completedById: completed ? user.id : null,
        completedAt: completed ? new Date() : null,
        comment: comment || null,
        blockedReason:
          status === ChecklistStatus.BLOCKED ? comment || "Blocked" : null,
      },
    });
    const opportunityRecord = await tx.opportunity.findUnique({
      where: { id: opportunityId },
      select: { ownerId: true },
    });
    await recordOperationalEvent(tx, {
      actorId: user.id,
      actorName: user.displayName,
      action: AuditAction.UPDATE,
      entityType: "OpportunityChecklistItem",
      entityId: item.id,
      opportunityId,
      actionUrl: `/opportunities/${opportunityId}?section=checklist`,
      subject: `Checklist updated: ${definition.label}`,
      body: `${(previous?.status ?? ChecklistStatus.NOT_STARTED).replaceAll("_", " ")} → ${status.replaceAll("_", " ")}${comment ? ` · ${comment}` : ""}`,
      before: previous
        ? { status: previous.status, comment: previous.comment }
        : undefined,
      after: {
        status,
        comment: comment || null,
        completedById: completed ? user.id : null,
      },
      notifications:
        status === ChecklistStatus.BLOCKED &&
        opportunityRecord &&
        opportunityRecord.ownerId !== user.id
          ? [
              {
                recipientId: opportunityRecord.ownerId,
                type: NotificationType.SYSTEM,
                title: `Checklist item blocked: ${definition.label}`,
                body: comment || "Open the opportunity to review the blocker.",
                href: `/opportunities/${opportunityId}?section=checklist`,
                actionLabel: "Review checklist",
              },
            ]
          : [],
    });
  });
  revalidatePath(`/opportunities/${opportunityId}`);
  return { success: "Checklist item updated." };
}
