import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import {
  notificationMessageIdFromHref,
  safeNotificationRedirectHref,
} from "@/modules/notifications/routing";

export default async function OpenNotificationPage({
  params,
}: {
  params: Promise<{ notificationId: string }>;
}) {
  const user = await requireUser();
  const { notificationId } = await params;

  const notification = await db.notification.findFirst({
    where: { id: notificationId, recipientId: user.id },
    select: { id: true, href: true },
  });

  if (!notification) {
    redirect("/notifications?error=not-found");
  }

  const destination = safeNotificationRedirectHref(notification.href);
  const messageId = notificationMessageIdFromHref(destination);
  const now = new Date();

  await db.$transaction([
    db.notification.updateMany({
      where: { id: notification.id, recipientId: user.id, readAt: null },
      data: { readAt: now },
    }),
    ...(messageId
      ? [
          db.chatterMention.updateMany({
            where: {
              messageId,
              mentionedUserId: user.id,
              readAt: null,
            },
            data: { readAt: now },
          }),
        ]
      : []),
  ]);

  redirect(destination);
}
