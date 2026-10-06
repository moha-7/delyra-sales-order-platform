import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { getSession } from "@/lib/auth/session";

export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.user.forcePasswordChange) redirect("/dashboard");

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-heading">
          <p className="eyebrow">First sign-in security</p>
          <h1>Create your private password</h1>
          <p>
            {session.user.displayName}, replace the temporary password before
            accessing CRM data.
          </p>
        </div>
        <ChangePasswordForm />
      </section>
    </main>
  );
}
