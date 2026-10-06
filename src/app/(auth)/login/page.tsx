import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getSession } from "@/lib/auth/session";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect(session.user.forcePasswordChange ? "/change-password" : "/dashboard");
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-heading">
          <p className="eyebrow">Delyra · Northstar workspace</p>
          <h1>Sign in to Delyra</h1>
          <p>Use your assigned account. Activity is recorded for audit.</p>
        </div>
        <LoginForm />

        <details className="demo-access">
          <summary>
            <span>
              <strong>Demo access</strong>
              <small>4 portfolio roles</small>
            </span>
            <span className="demo-access-chevron" aria-hidden="true">⌄</span>
          </summary>

          <div className="demo-access-body">
            <p className="demo-access-note">
              Synthetic portfolio accounts for exploring role-based workflows.
            </p>

            <div className="demo-account-list">
              <div className="demo-account">
                <div>
                  <strong>Manager</strong>
                  <span>alex.morgan@northstar.example</span>
                </div>
                <code>demo12345678</code>
              </div>

              <div className="demo-account">
                <div>
                  <strong>Finance</strong>
                  <span>finance@northstar.example</span>
                </div>
                <code>demo12345678</code>
              </div>

              <div className="demo-account">
                <div>
                  <strong>Order Coordinator</strong>
                  <span>jordan.lee@northstar.example</span>
                </div>
                <code>demo12345678</code>
              </div>

              <div className="demo-account">
                <div>
                  <strong>CEO</strong>
                  <span>ceo@northstar.example</span>
                </div>
                <code>demo12345678</code>
              </div>
            </div>
          </div>
        </details>
      </section>
    </main>
  );
}
