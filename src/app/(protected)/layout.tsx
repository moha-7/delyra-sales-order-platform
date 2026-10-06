import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { TaskStatus } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();
  const now = new Date();
  const [notifications, unreadCount, overdueTaskCount] = await Promise.all([
    db.notification.findMany({ where: { recipientId: user.id }, orderBy: { createdAt: "desc" }, take: 8 }),
    db.notification.count({ where: { recipientId: user.id, readAt: null } }),
    db.task.count({ where: { assignedToId: user.id, archivedAt: null, dueAt: { lt: now }, status: { notIn: [TaskStatus.COMPLETED, TaskStatus.CANCELLED] } } }),
  ]);
  return <AppShell user={user} notifications={notifications} unreadCount={unreadCount} overdueTaskCount={overdueTaskCount}>{children}</AppShell>;
}
