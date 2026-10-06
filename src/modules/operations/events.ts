import {
  ActivityType,
  AuditAction,
  NotificationType,
  RoleKey,
  TaskPriority,
  TaskStatus,
  type Prisma,
} from "@/generated/prisma/client";
import {
  issueBusinessReference,
  REFERENCE_TRACK_CODES,
  REFERENCE_TYPE_CODES,
  trackCodeForOpportunityTrack,
} from "@/modules/crm/references";

type TransactionClient = Prisma.TransactionClient;

export type NotificationTarget = {
  recipientId: string;
  type?: NotificationType;
  title: string;
  body?: string | null;
  href?: string | null;
  actionLabel?: string | null;
};

export type OperationalTaskInput = {
  automationKey?: string | null;
  title: string;
  description?: string | null;
  assignedToId: string;
  dueAt?: Date | null;
  priority?: TaskPriority;
  sectionKey?: string | null;
  actionUrl?: string | null;
  metadata?: Prisma.InputJsonValue;
  autoCreated?: boolean;
};

export async function userIdsForRole(
  tx: TransactionClient,
  role: RoleKey,
): Promise<string[]> {
  const users = await tx.user.findMany({
    where: {
      archivedAt: null,
      status: "ACTIVE",
      userRoles: { some: { role: { key: role } } },
    },
    select: { id: true },
  });
  return users.map((user) => user.id);
}

export async function upsertOperationalTask(
  tx: TransactionClient,
  input: OperationalTaskInput & {
    opportunityId?: string | null;
    createdById: string;
  },
) {
  if (input.automationKey) {
    const existing = await tx.task.findUnique({
      where: { automationKey: input.automationKey },
    });
    if (existing) {
      return tx.task.update({
        where: { id: existing.id },
        data: {
          title: input.title,
          description: input.description ?? null,
          assignedToId: input.assignedToId,
          dueAt: input.dueAt ?? null,
          priority: input.priority ?? TaskPriority.NORMAL,
          sectionKey: input.sectionKey ?? null,
          actionUrl: input.actionUrl ?? null,
          metadata: input.metadata,
          autoCreated: input.autoCreated ?? true,
          status: TaskStatus.TO_DO,
          blockedReason: null,
          completedAt: null,
          archivedAt: null,
          version: { increment: 1 },
        },
      });
    }
  }

  const opportunity = input.opportunityId
    ? await tx.opportunity.findUnique({
        where: { id: input.opportunityId },
        select: { track: true },
      })
    : null;

  if (input.opportunityId && !opportunity) {
    throw new Error("Linked opportunity not found.");
  }

  const reference = await issueBusinessReference(tx, {
    trackCode: opportunity
      ? trackCodeForOpportunityTrack(opportunity.track)
      : REFERENCE_TRACK_CODES.RETAIL,
    typeCode: REFERENCE_TYPE_CODES.TASK,
    year: new Date().getFullYear(),
  });

  return tx.task.create({
    data: {
      reference,
      title: input.title,
      description: input.description ?? null,
      status: TaskStatus.TO_DO,
      priority: input.priority ?? TaskPriority.NORMAL,
      opportunityId: input.opportunityId ?? null,
      assignedToId: input.assignedToId,
      createdById: input.createdById,
      dueAt: input.dueAt ?? null,
      sectionKey: input.sectionKey ?? null,
      automationKey: input.automationKey ?? null,
      actionUrl: input.actionUrl ?? null,
      metadata: input.metadata,
      autoCreated: input.autoCreated ?? true,
    },
  });
}

export async function completeAutomationTask(
  tx: TransactionClient,
  automationKey: string,
) {
  await tx.task.updateMany({
    where: {
      automationKey,
      status: { notIn: [TaskStatus.COMPLETED, TaskStatus.CANCELLED] },
    },
    data: {
      status: TaskStatus.COMPLETED,
      completedAt: new Date(),
      blockedReason: null,
      version: { increment: 1 },
    },
  });
}

export async function recordOperationalEvent(
  tx: TransactionClient,
  input: {
    actorId: string;
    actorName?: string | null;
    action: AuditAction;
    entityType: string;
    entityId: string;
    opportunityId?: string | null;
    subject: string;
    body?: string | null;
    activityType?: ActivityType;
    before?: Prisma.InputJsonValue;
    after?: Prisma.InputJsonValue;
    metadata?: Prisma.InputJsonValue;
    actionUrl?: string | null;
    taskId?: string | null;
    notifications?: NotificationTarget[];
    task?: OperationalTaskInput;
  },
) {
  if (input.opportunityId) {
    await tx.activity.create({
      data: {
        type: input.activityType ?? ActivityType.SYSTEM,
        subject: input.subject,
        body: input.body ?? null,
        actionUrl: input.actionUrl ?? null,
        metadata: input.metadata,
        opportunityId: input.opportunityId,
        createdById: input.actorId,
      },
    });
  }

  await tx.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      opportunityId: input.opportunityId ?? null,
      taskId: input.taskId ?? null,
      actionUrl: input.actionUrl ?? null,
      before: input.before,
      after: input.after,
      metadata: input.metadata,
    },
  });

  if (input.notifications?.length) {
    await tx.notification.createMany({
      data: input.notifications.map((notification) => ({
        recipientId: notification.recipientId,
        type: notification.type ?? NotificationType.SYSTEM,
        title: notification.title,
        body: notification.body ?? null,
        entityType: input.entityType,
        entityId: input.entityId,
        href: notification.href ?? null,
        actionLabel: notification.actionLabel ?? null,
        actorName: input.actorName ?? null,
      })),
    });
  }

  if (input.task) {
    await upsertOperationalTask(tx, {
      ...input.task,
      opportunityId: input.opportunityId,
      createdById: input.actorId,
    });
  }
}

export function dueInHours(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}
