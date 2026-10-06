import Link from "next/link";
import { ProfilePicturePicker } from "@/components/settings/profile-picture-picker";
import { requireUser } from "@/lib/auth/dal";
import { navigationScopeFor } from "@/modules/auth/navigation";

function initialsFor(displayName: string, initials?: string | null) {
  if (initials) return initials;
  return (
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "U"
  );
}

export default async function SettingsPage() {
  const user = await requireUser();
  const scope = navigationScopeFor(user);
  const initials = initialsFor(user.displayName, user.initials);
  const canSwitchMode = scope.workspace === "mixed";

  return (
    <div className="ux-page content-page narrow-page settings-page">
      <section className="ux-hero settings-hero">
        <div className="ux-hero-row">
          <div>
            <p className="ux-hero-kicker">User settings</p>
            <h1>Settings</h1>
            <p>Profile identity, security, and personal workspace preferences for the internal CRM.</p>
            <div className="ux-chip-row">
              <span className="ux-chip"><i className="bi bi-person-badge" /> Role: {scope.roleLabel}</span>
              <span className="ux-chip"><i className="bi bi-funnel" /> Focus: {scope.scopeLabel}</span>
              {canSwitchMode ? <span className="ux-chip"><i className="bi bi-grid-3x3-gap" /> Workspace mode available</span> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="settings-grid settings-grid-polished">
        <article className="settings-card settings-profile-card">
          <p className="eyebrow">Profile</p>
          <ProfilePicturePicker userId={user.id} initials={initials} displayName={user.displayName} />
          <dl className="detail-list settings-detail-list">
            <div><dt>Email</dt><dd>{user.email}</dd></div>
            <div><dt>Initials</dt><dd>{initials}</dd></div>
            <div><dt>Department</dt><dd>{user.department.replaceAll("_", " ")}</dd></div>
            <div><dt>Role</dt><dd>{scope.roleLabel}</dd></div>
            <div><dt>Data focus</dt><dd>{scope.scopeLabel}</dd></div>
          </dl>
        </article>

        <article className="settings-card settings-action-card">
          <p className="eyebrow">Security</p>
          <h2>Password & profile</h2>
          <p className="role-note">Keep your account secure. Profile image preview is ready for the pilot UI; permanent upload will be connected after storage rules are approved.</p>
          <div className="settings-action-stack">
            <Link className="primary-link" href="/change-password">
              <i className="bi bi-key" aria-hidden="true" /> Change password
            </Link>
            <Link className="secondary-button" href="#profile-picture">
              <i className="bi bi-camera" aria-hidden="true" /> Change profile picture
            </Link>
          </div>
        </article>

        <article className="settings-card">
          <p className="eyebrow">Workspace</p>
          <h2>How your CRM is filtered</h2>
          <p className="text-sm leading-6 text-slate-600">
            The system uses your role and data focus to show the correct pipeline, tasks, alerts, and records. Direct links still respect access permissions.
          </p>
          {canSwitchMode ? (
            <p className="settings-note-success">
              You have more than one workspace mode. Switch between Retail, Projects, and Mixed from the top-right user menu only.
            </p>
          ) : (
            <p className="settings-note-muted">
              You have a single workspace view. No track selector is shown in daily work areas.
            </p>
          )}
        </article>

        <article className="settings-card">
          <p className="eyebrow">Mentions</p>
          <h2>Internal collaboration</h2>
          <p className="text-sm leading-6 text-slate-600">
            Chatter mentions are for internal alignment only. CEO viewer accounts are hidden from mention suggestions by design.
          </p>
        </article>
      </section>
    </div>
  );
}
