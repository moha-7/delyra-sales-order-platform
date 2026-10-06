"use server";

import { revalidatePath } from "next/cache";
import {
  ActivityType,
  AuditAction,
  NotificationType,
  RoleKey,
  UserStatus,
  type Prisma,
} from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { opportunityViewWhere } from "@/modules/crm/access";
import { recordOperationalEvent } from "@/modules/operations/events";
import {
  compactMentionPreview,
  extractMentionTokens,
  mentionAliasesForUser,
} from "@/modules/chatter/mentions";

function uniqueIds(values: FormDataEntryValue[]): string[] {
  return [...new Set(values.map((value) => String(value)).filter(Boolean))];
}

export async function addOpportunityChatterMessageAction(formData: FormData) {
  const user = await requireUser();
  const opportunityId = String(formData.get("opportunityId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const selectedMentionIds = uniqueIds(formData.getAll("mentionUserIds"));

  if (user.roles.includes(RoleKey.CEO_VIEWER)) {
    throw new Error("CEO viewer accounts cannot post chatter updates.");
  }

  if (!opportunityId || !body) {
    throw new Error("Opportunity and message body are required.");
  }

  if (body.length > 4000) {
    throw new Error("Message is too long. Maximum 4000 characters.");
  }

  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const opportunity = await tx.opportunity.findFirst({
      where: {
        AND: [{ id: opportunityId, archivedAt: null }, opportunityViewWhere(user)],
      },
      select: { id: true, reference: true, title: true },
    });

    if (!opportunity) {
      throw new Error("Opportunity not found or not accessible.");
    }

    const activeUsers = await tx.user.findMany({
      where: {
        archivedAt: null,
        status: UserStatus.ACTIVE,
        userRoles: { none: { role: { key: RoleKey.CEO_VIEWER } } },
      },
      select: {
        id: true,
        displayName: true,
        email: true,
        initials: true,
      },
    });

    const tokens = extractMentionTokens(body);
    const isEveryoneUpdate = tokens.includes("everyone");
    const mentionedUserIds = new Set<string>();

    if (!isEveryoneUpdate) {
      for (const mentionedId of selectedMentionIds) {
        if (
          mentionedId !== user.id &&
          activeUsers.some((activeUser) => activeUser.id === mentionedId)
        ) {
          mentionedUserIds.add(mentionedId);
        }
      }

      for (const token of tokens) {
        const matchedUser = activeUsers.find((activeUser) =>
          mentionAliasesForUser(activeUser).includes(token),
        );
        if (matchedUser && matchedUser.id !== user.id) {
          mentionedUserIds.add(matchedUser.id);
        }
      }
    }

    const message = await tx.chatterMessage.create({
      data: {
        opportunityId,
        authorId: user.id,
        body,
      },
    });

    if (mentionedUserIds.size) {
      await tx.chatterMention.createMany({
        data: [...mentionedUserIds].map((mentionedUserId) => ({
          messageId: message.id,
          opportunityId,
          mentionedUserId,
          createdById: user.id,
        })),
        skipDuplicates: true,
      });
    }

    const href = `/opportunities/${opportunityId}?section=chatter&message=${message.id}`;
    const preview = compactMentionPreview(body);

    await recordOperationalEvent(tx, {
      actorId: user.id,
      actorName: user.displayName,
      action: AuditAction.UPDATE,
      entityType: "ChatterMessage",
      entityId: message.id,
      opportunityId,
      actionUrl: href,
      subject: `Internal chatter update on ${opportunity.reference}`,
      body: mentionedUserIds.size ? "Private mentioned update" : preview,
      activityType: ActivityType.NOTE,
      after: {
        messageId: message.id,
        visibility: mentionedUserIds.size ? "MENTIONED_USERS" : isEveryoneUpdate ? "EVERYONE_EXPLICIT" : "EVERYONE",
        mentionedUserIds: [...mentionedUserIds],
      },
      notifications: [...mentionedUserIds].map((recipientId) => ({
        recipientId,
        type: NotificationType.MENTION,
        title: `${user.displayName} mentioned you`,
        body: `${opportunity.reference}: ${preview}`,
        href,
        actionLabel: "Open mention",
      })),
    });
  });

  revalidatePath(`/opportunities/${opportunityId}`);
  revalidatePath("/notifications");
}
