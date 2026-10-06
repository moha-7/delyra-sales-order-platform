import Link from "next/link";
import type { ReactNode } from "react";
import type { Notification } from "@/generated/prisma/client";
import type { AuthenticatedUser } from "@/lib/auth/session";
import { LogoutButton } from "@/components/auth/logout-button";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { ProfileAvatar } from "@/components/settings/profile-avatar";
import { SidebarNavigation } from "@/components/sidebar-navigation";
import { navigationFor, navigationScopeFor } from "@/modules/auth/navigation";

function initialsFor(user: AuthenticatedUser): string {
  if (user.initials) return user.initials;
  return user.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "U";
}

type AppShellProps = {
  user: AuthenticatedUser;
  children: ReactNode;
  notifications?: Notification[];
  unreadCount?: number;
  overdueTaskCount?: number;
};

function CountBadge({ value, label }: { value: number; label: string }) {
  if (!value) return null;
  return (
    <span className="uk-count-badge" aria-label={`${value} ${label}`}>
      {value > 99 ? "99+" : value}
    </span>
  );
}

function workspaceModeLinks(scopeWorkspace: string) {
  if (scopeWorkspace !== "mixed") return [];

  return [
    { label: "Retail", href: "/opportunities?track=RETAIL", icon: "bi-shop-window" },
    { label: "Projects", href: "/opportunities?track=PROJECT", icon: "bi-buildings" },
    { label: "Mixed", href: "/opportunities", icon: "bi-grid-3x3-gap" },
  ];
}

export function AppShell({
  user,
  children,
  notifications = [],
  unreadCount = 0,
  overdueTaskCount = 0,
}: AppShellProps) {
  const navigation = navigationFor(user);
  const scope = navigationScopeFor(user);
  const modeLinks = workspaceModeLinks(scope.workspace);
  const initials = initialsFor(user);

  return (
    <div className="uk-shell">
      <aside className="uk-sidebar" aria-label="CRM navigation">
        <div className="uk-brand-block">
          <span>DELYRA</span>
          <div className="uk-brand-lockup">
            <span className="uk-company-logo" aria-hidden="true">D</span>
            <div>
              <strong>Sales &amp; Order Lifecycle</strong>
              <small>{scope.label}</small>
            </div>
          </div>
        </div>

        <SidebarNavigation items={navigation} />

        <div className="uk-sidebar-help">
          <strong>Action center</strong>
          <span>Use Pipeline, Tasks, and Alerts to open the exact record without searching manually.</span>
        </div>

        <div className="uk-sidebar-user">
          <ProfileAvatar
            className="uk-avatar profile-avatar-in-shell"
            displayName={user.displayName}
            initials={initials}
            userId={user.id}
          />
          <div>
            <strong>{user.displayName}</strong>
            <span>{scope.roleLabel} · {scope.scopeLabel}</span>
          </div>
          <LogoutButton />
        </div>
      </aside>

      <div className="uk-main-shell">
        <header className="uk-topbar">
          <div>
            <span>{scope.roleLabel}</span>
            <strong>{scope.scopeLabel} · {scope.label}</strong>
          </div>
          <div className="uk-topbar-actions">
            <Link className="uk-topbar-link" href="/tasks" aria-label="Open tasks">
              <i className="bi bi-check2-square" aria-hidden="true" />
              Tasks
              <CountBadge value={overdueTaskCount} label="overdue tasks" />
            </Link>
            <NotificationCenter notifications={notifications} unreadCount={unreadCount} />
            <details className="uk-user-menu">
              <summary className="uk-user-chip" aria-label="Open user menu">
                <ProfileAvatar
                  className="profile-avatar-in-chip"
                  displayName={user.displayName}
                  initials={initials}
                  userId={user.id}
                />
                <div>
                  <strong>{user.displayName}</strong>
                  <small>{scope.roleLabel}</small>
                </div>
                <i className="bi bi-chevron-down" aria-hidden="true" />
              </summary>
              <div className="uk-user-menu-panel">
                <div className="uk-user-menu-head">
                  <ProfileAvatar
                    className="profile-avatar-in-menu"
                    displayName={user.displayName}
                    initials={initials}
                    userId={user.id}
                  />
                  <div>
                    <strong>{user.displayName}</strong>
                    <small>{scope.roleLabel}</small>
                  </div>
                </div>
                <Link href="/settings#profile-picture">
                  <i className="bi bi-camera" aria-hidden="true" />
                  Change profile picture
                </Link>
                <Link href="/change-password">
                  <i className="bi bi-key" aria-hidden="true" />
                  Change password
                </Link>
                <Link href="/settings">
                  <i className="bi bi-person-gear" aria-hidden="true" />
                  Profile settings
                </Link>
                {modeLinks.length ? (
                  <div className="uk-user-menu-modes">
                    <span>Switch mode</span>
                    {modeLinks.map((mode) => (
                      <Link href={mode.href} key={`menu-${mode.href}`}>
                        <i className={`bi ${mode.icon}`} aria-hidden="true" />
                        {mode.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            </details>
          </div>
        </header>
        <main className="uk-page-body">{children}</main>
      </div>
    </div>
  );
}
