import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  NotificationType,
  PrismaClient,
  RoleKey,
  TaskStatus,
} from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const now = new Date();
const today = new Date(now);
today.setHours(0, 0, 0, 0);
const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

try {
  const [tasks, managers] = await Promise.all([
    db.task.findMany({
      where: {
        archivedAt: null,
        dueAt: { lt: now },
        status: {
          in: [
            TaskStatus.TO_DO,
            TaskStatus.IN_PROGRESS,
            TaskStatus.WAITING_CUSTOMER,
            TaskStatus.WAITING_INTERNAL,
            TaskStatus.BLOCKED,
          ],
        },
      },
      include: {
        assignedTo: { select: { id: true, displayName: true } },
        opportunity: { select: { id: true, reference: true, title: true } },
      },
    }),
    db.user.findMany({
      where: {
        archivedAt: null,
        status: "ACTIVE",
        userRoles: { some: { role: { key: RoleKey.MANAGER } } },
      },
      select: { id: true },
    }),
  ]);

  let notified = 0;
  for (const task of tasks) {
    const existing = await db.notification.findFirst({
      where: {
        recipientId: task.assignedToId,
        entityType: "Task",
        entityId: task.id,
        type: NotificationType.OVERDUE,
        createdAt: { gte: today },
      },
      select: { id: true },
    });
    if (!existing) {
      await db.notification.create({
        data: {
          recipientId: task.assignedToId,
          type: NotificationType.OVERDUE,
          title: `Overdue task: ${task.title}`,
          body: `${task.reference}${task.opportunity ? ` · ${task.opportunity.reference}` : ""} was due ${task.dueAt?.toLocaleString("en-GB")}.`,
          entityType: "Task",
          entityId: task.id,
          href: task.actionUrl ?? `/tasks/${task.id}`,
          actionLabel: "Open task",
          actorName: "CRM automation",
        },
      });
      notified += 1;
    }

    if (task.dueAt && task.dueAt < twoDaysAgo) {
      for (const manager of managers) {
        if (manager.id === task.assignedToId) continue;
        const managerExisting = await db.notification.findFirst({
          where: {
            recipientId: manager.id,
            entityType: "TaskEscalation",
            entityId: task.id,
            createdAt: { gte: today },
          },
          select: { id: true },
        });
        if (!managerExisting) {
          await db.notification.create({
            data: {
              recipientId: manager.id,
              type: NotificationType.OVERDUE,
              title: `Escalation: ${task.reference} is over 48 hours overdue`,
              body: `${task.assignedTo.displayName} · ${task.title}${task.opportunity ? ` · ${task.opportunity.reference}` : ""}`,
              entityType: "TaskEscalation",
              entityId: task.id,
              href: task.actionUrl ?? `/tasks/${task.id}`,
              actionLabel: "Review task",
              actorName: "CRM automation",
            },
          });
          notified += 1;
        }
      }
    }
  }
  console.log(`Overdue tasks checked: ${tasks.length}`);
  console.log(`Notifications created: ${notified}`);
} finally {
  await db.$disconnect();
}
