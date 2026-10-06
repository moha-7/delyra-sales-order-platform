import Link from "next/link";
import type { Notification } from "@/generated/prisma/client";
import { formatDateTime } from "@/modules/crm/format";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/modules/notifications/actions";

export function NotificationCenter({
  notifications,
  unreadCount,
}: {
  notifications: Notification[];
  unreadCount: number;
}) {
  return (
    <details className="group relative">
      <summary className="relative flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-300 hover:text-blue-700 [&::-webkit-details-marker]:hidden">
        <i className="bi bi-bell text-lg" aria-hidden="true" />
        <span className="sr-only">Notifications</span>
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-extrabold text-white ring-2 ring-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </summary>
      <div className="absolute right-0 z-50 mt-3 w-[min(92vw,420px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <p className="text-sm font-extrabold text-slate-900">
              Notifications
            </p>
            <p className="text-xs text-slate-500">{unreadCount} unread</p>
          </div>
          {unreadCount ? (
            <form action={markAllNotificationsReadAction}>
              <button
                className="text-xs font-bold text-blue-700 hover:text-blue-900"
                type="submit"
              >
                Mark all read
              </button>
            </form>
          ) : null}
        </div>
        <div className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto">
          {notifications.length ? (
            notifications.map((notification) => (
              <article
                key={notification.id}
                className={`p-4 ${notification.readAt ? "bg-white" : "bg-blue-50/60"}`}
              >
                <div className="flex gap-3">
                  <span
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${notification.readAt ? "bg-slate-100 text-slate-500" : "bg-blue-600 text-white"}`}
                  >
                    <i
                      className="bi bi-lightning-charge-fill"
                      aria-hidden="true"
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <strong className="text-sm text-slate-900">
                        {notification.title}
                      </strong>
                      {!notification.readAt ? (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                      ) : null}
                    </div>
                    {notification.body ? (
                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        {notification.body}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                      <span className="text-slate-400">
                        {formatDateTime(notification.createdAt)}
                      </span>
                      {notification.actorName ? (
                        <span className="text-slate-500">
                          by {notification.actorName}
                        </span>
                      ) : null}
                      <Link
                        className="font-bold text-blue-700 hover:text-blue-900"
                        href={`/notifications/open/${notification.id}`}
                      >
                        {notification.actionLabel ?? "Open"}
                      </Link>
                      {!notification.readAt ? (
                        <form action={markNotificationReadAction}>
                          <input
                            type="hidden"
                            name="notificationId"
                            value={notification.id}
                          />
                          <button
                            type="submit"
                            className="font-bold text-slate-500 hover:text-slate-800"
                          >
                            Mark read
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="p-8 text-center text-sm text-slate-500">
              No notifications yet.
            </div>
          )}
        </div>
        <Link
          href="/notifications"
          className="block border-t border-slate-100 px-4 py-3 text-center text-sm font-extrabold text-blue-700 hover:bg-slate-50"
        >
          View notification center
        </Link>
      </div>
    </details>
  );
}
