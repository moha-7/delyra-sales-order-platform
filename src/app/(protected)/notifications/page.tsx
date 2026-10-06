import Link from "next/link";
import { NotificationType } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { formatDateTime } from "@/modules/crm/format";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/modules/notifications/actions";

function iconFor(title: string) {
  const lower = title.toLowerCase();
  if (lower.includes("deposit")) return "bi-check-circle";
  if (lower.includes("pricing") || lower.includes("finance")) return "bi-receipt";
  if (lower.includes("design") || lower.includes("package")) return "bi-trophy";
  if (lower.includes("mention")) return "bi-at";
  return "bi-bell";
}

function toneFor(title: string) {
  const lower = title.toLowerCase();
  if (lower.includes("confirmed") || lower.includes("approved")) return "success";
  if (lower.includes("deposit")) return "warning";
  if (lower.includes("design") || lower.includes("mention")) return "violet";
  return "blue";
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const filter = params.filter ?? "all";
  const unreadOnly = filter === "unread";
  const mentionOnly = filter === "mentions";

  const baseWhere = { recipientId: user.id };
  const [allCount, unreadCount, notifications] = await Promise.all([
    db.notification.count({ where: baseWhere }),
    db.notification.count({ where: { ...baseWhere, readAt: null } }),
    db.notification.findMany({
      where: {
        ...baseWhere,
        ...(unreadOnly ? { readAt: null } : {}),
        ...(mentionOnly ? { type: NotificationType.MENTION } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);
  const mentionCount = await db.notification.count({
    where: { ...baseWhere, type: "MENTION" as const },
  });
  const needsActionCount = notifications.filter((item) => !item.readAt).length;

  return (
    <div className="clean-alerts-page">
      <header className="clean-alerts-header">
        <div>
          <h1>Alerts / Mentions</h1>
          <p>Stay on top of approvals, updates, and internal mentions with direct action links.</p>
        </div>
      </header>

      <section className="alert-kpi-grid">
        <article className="alert-kpi-card"><i className="bi bi-bell" /><div><span>All notifications</span><strong>{allCount}</strong><small>All time</small></div></article>
        <article className="alert-kpi-card success"><i className="bi bi-envelope" /><div><span>Unread</span><strong>{unreadCount}</strong><small>Needs your attention</small></div></article>
        <article className="alert-kpi-card violet"><i className="bi bi-at" /><div><span>Mentions</span><strong>{mentionCount}</strong><small>You were mentioned</small></div></article>
        <article className="alert-kpi-card warning"><i className="bi bi-exclamation-circle" /><div><span>Needs action</span><strong>{needsActionCount}</strong><small>Requires your response</small></div></article>
      </section>

      <nav className="clean-alert-tabs mt-5">
        <Link href="/notifications" className={filter === "all" ? "active" : ""}>All <span className="status-chip-soft">{allCount}</span></Link>
        <Link href="/notifications?filter=unread" className={filter === "unread" ? "active" : ""}>Unread <span className="status-chip-soft">{unreadCount}</span></Link>
        <Link href="/notifications?filter=mentions" className={filter === "mentions" ? "active" : ""}>Mentions <span className="status-chip-soft">{mentionCount}</span></Link>
        <div className="spacer" />
        <form action={markAllNotificationsReadAction}>
          <button type="submit"><i className="bi bi-check2-all" /> Mark all read</button>
        </form>
      </nav>

      <section className="clean-alerts-panel alert-list-card">
        {notifications.length ? notifications.map((notification) => {
          const tone = toneFor(notification.title);
          return (
            <article className="alert-list-row" key={notification.id}>
              <span className={`row-icon ${tone}`}><i className={`bi ${iconFor(notification.title)}`} /></span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <strong>{notification.title}</strong>
                  {!notification.readAt ? <span className="status-chip-soft">Unread</span> : null}
                </div>
                {notification.body ? <small>{notification.body}</small> : null}
                <small>{formatDateTime(notification.createdAt)}{notification.actorName ? ` · ${notification.actorName}` : ""}</small>
              </div>
              <div className="version-actions">
                {!notification.readAt ? (
                  <form action={markNotificationReadAction}>
                    <input type="hidden" name="notificationId" value={notification.id} />
                    <button className="alert-soft-button" type="submit">Mark read</button>
                  </form>
                ) : null}
                <Link className="alert-action-button" href={`/notifications/open/${notification.id}`}>{notification.actionLabel ?? "Open"} <i className="bi bi-arrow-right" /></Link>
              </div>
            </article>
          );
        }) : (
          <div className="empty-state"><i className="bi bi-bell-slash text-4xl" /><p>No alerts in this view.</p></div>
        )}
      </section>
    </div>
  );
}
