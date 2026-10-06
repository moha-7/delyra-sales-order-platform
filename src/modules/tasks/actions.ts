"use server";

import { revalidatePath } from "next/cache";
import {
  AuditAction,
  NotificationType,
  TaskPriority,
  TaskStatus,
  type Prisma,
} from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import {
  issueBusinessReference,
  REFERENCE_TRACK_CODES,
  REFERENCE_TYPE_CODES,
  trackCodeForOpportunityTrack,
} from "@/modules/crm/references";
import { recordOperationalEvent } from "@/modules/operations/events";
import { canManageTasks, taskViewWhere } from "@/modules/tasks/access";

export type TaskActionState = { error?: string; success?: string };

function asDate(value: FormDataEntryValue | null): Date | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function taskUrl(taskId: string, opportunityId?: string | null, sectionKey?: string | null) {
  if (opportunityId) {
    return `/opportunities/${opportunityId}?section=${sectionKey ?? "tasks"}&task=${taskId}`;
  }
  return `/tasks/${taskId}`;
}

export async function createTaskAction(
  _state: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const user = await requireUser();
  if (!canManageTasks(user)) return { error: "Task permission is required." };
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const assignedToId = String(formData.get("assignedToId") ?? "");
  const opportunityId = String(formData.get("opportunityId") ?? "") || null;
  const priority = String(formData.get("priority") ?? TaskPriority.NORMAL) as TaskPriority;
  const dueAt = asDate(formData.get("dueAt"));
  const sectionKey = String(formData.get("sectionKey") ?? "tasks") || "tasks";
  if (!title || !assignedToId) return { error: "Title and assignee are required." };
  if (!Object.values(TaskPriority).includes(priority)) return { error: "Invalid priority." };

  try {
    const reference = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const opportunity = opportunityId
        ? await tx.opportunity.findUnique({
            where: { id: opportunityId },
            select: { track: true },
          })
        : null;

      if (opportunityId && !opportunity) {
        throw new Error("Linked opportunity not found.");
      }

      const taskReference = await issueBusinessReference(tx, {
        trackCode: opportunity
          ? trackCodeForOpportunityTrack(opportunity.track)
          : REFERENCE_TRACK_CODES.RETAIL,
        typeCode: REFERENCE_TYPE_CODES.TASK,
        year: new Date().getFullYear(),
      });

      const task = await tx.task.create({
        data: {
          reference: taskReference,
          title,
          description: description || null,
          status: TaskStatus.TO_DO,
          priority,
          opportunityId,
          assignedToId,
          createdById: user.id,
          dueAt,
          sectionKey,
          actionUrl: opportunityId ? `/opportunities/${opportunityId}?section=${sectionKey}` : null,
          autoCreated: false,
        },
      });
      const assignee = await tx.user.findUnique({ where: { id: assignedToId }, select: { displayName: true } });
      await recordOperationalEvent(tx, {
        actorId: user.id,
        actorName: user.displayName,
        action: AuditAction.CREATE,
        entityType: "Task",
        entityId: task.id,
        taskId: task.id,
        opportunityId,
        actionUrl: taskUrl(task.id, opportunityId, sectionKey),
        subject: `Task created: ${title}`,
        body: `Assigned to ${assignee?.displayName ?? "user"}${dueAt ? ` · due ${dueAt.toLocaleString("en-GB")}` : ""}`,
        after: { reference: task.reference, title, assignedToId, priority, dueAt: dueAt?.toISOString() ?? null },
        notifications: assignedToId !== user.id ? [{
          recipientId: assignedToId,
          type: NotificationType.ASSIGNMENT,
          title: `New task: ${title}`,
          body: opportunityId ? `Open the linked opportunity and complete the required work.` : description || "Task assigned to you.",
          href: taskUrl(task.id, opportunityId, sectionKey),
          actionLabel: "Open task",
        }] : [],
      });
      return task.reference;
    });
    revalidatePath("/tasks");
    if (opportunityId) revalidatePath(`/opportunities/${opportunityId}`);
    return { success: `${reference} created.` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Task could not be created." };
  }
}

export async function updateTaskAction(
  _state: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const user = await requireUser();
  if (!canManageTasks(user)) return { error: "Task permission is required." };
  const taskId = String(formData.get("taskId") ?? "");
  const status = String(formData.get("status") ?? "") as TaskStatus;
  const priority = String(formData.get("priority") ?? "") as TaskPriority;
  const assignedToId = String(formData.get("assignedToId") ?? "");
  const dueAt = asDate(formData.get("dueAt"));
  const blockedReason = String(formData.get("blockedReason") ?? "").trim();
  if (!taskId || !Object.values(TaskStatus).includes(status) || !Object.values(TaskPriority).includes(priority)) {
    return { error: "Invalid task update." };
  }
  const task = await db.task.findFirst({
    where: { AND: [{ id: taskId }, taskViewWhere(user)] },
    include: { assignedTo: true, opportunity: true },
  });
  if (!task) return { error: "Task not found or not accessible." };
  const nextAssignee = assignedToId || task.assignedToId;
  const completedAt = status === TaskStatus.COMPLETED ? new Date() : null;
  try {
    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.task.update({
        where: { id: task.id },
        data: {
          status,
          priority,
          assignedToId: nextAssignee,
          dueAt,
          blockedReason: status === TaskStatus.BLOCKED ? blockedReason || "Blocked" : null,
          completedAt,
          version: { increment: 1 },
        },
      });
      await recordOperationalEvent(tx, {
        actorId: user.id,
        actorName: user.displayName,
        action: AuditAction.UPDATE,
        entityType: "Task",
        entityId: task.id,
        taskId: task.id,
        opportunityId: task.opportunityId,
        actionUrl: taskUrl(task.id, task.opportunityId, task.sectionKey),
        subject: `Task ${task.reference} updated`,
        body: `${task.status.replaceAll("_", " ")} → ${status.replaceAll("_", " ")}`,
        before: { status: task.status, priority: task.priority, assignedToId: task.assignedToId, dueAt: task.dueAt?.toISOString() ?? null },
        after: { status, priority, assignedToId: nextAssignee, dueAt: dueAt?.toISOString() ?? null, blockedReason: blockedReason || null },
        notifications: nextAssignee !== user.id ? [{
          recipientId: nextAssignee,
          type: NotificationType.ASSIGNMENT,
          title: `${task.reference} was updated`,
          body: `${user.displayName} changed the task to ${status.replaceAll("_", " ")}.`,
          href: taskUrl(task.id, task.opportunityId, task.sectionKey),
          actionLabel: "Open task",
        }] : [],
      });
    });
    revalidatePath("/tasks");
    revalidatePath(`/tasks/${task.id}`);
    if (task.opportunityId) revalidatePath(`/opportunities/${task.opportunityId}`);
    return { success: "Task updated." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Task could not be updated." };
  }
}

export async function addTaskCommentAction(
  _state: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const user = await requireUser();
  if (!canManageTasks(user)) return { error: "Task permission is required." };
  const taskId = String(formData.get("taskId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!taskId || !body) return { error: "Comment cannot be empty." };
  const task = await db.task.findFirst({ where: { AND: [{ id: taskId }, taskViewWhere(user)] } });
  if (!task) return { error: "Task not found or not accessible." };
  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const comment = await tx.taskComment.create({ data: { taskId, authorId: user.id, body } });
    const notifyIds = new Set([task.assignedToId, task.createdById]);
    notifyIds.delete(user.id);
    await recordOperationalEvent(tx, {
      actorId: user.id,
      actorName: user.displayName,
      action: AuditAction.UPDATE,
      entityType: "TaskComment",
      entityId: comment.id,
      taskId: task.id,
      opportunityId: task.opportunityId,
      actionUrl: taskUrl(task.id, task.opportunityId, task.sectionKey),
      subject: `Comment added to ${task.reference}`,
      body,
      after: { commentId: comment.id, body },
      notifications: [...notifyIds].map((recipientId) => ({
        recipientId,
        type: NotificationType.MENTION,
        title: `New comment on ${task.reference}`,
        body: `${user.displayName}: ${body.slice(0, 180)}`,
        href: taskUrl(task.id, task.opportunityId, task.sectionKey),
        actionLabel: "View comment",
      })),
    });
  });
  revalidatePath(`/tasks/${task.id}`);
  if (task.opportunityId) revalidatePath(`/opportunities/${task.opportunityId}`);
  return { success: "Comment added." };
}
