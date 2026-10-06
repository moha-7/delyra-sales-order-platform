"use client";

import { useActionState } from "react";
import {
  changePasswordAction,
  type AuthActionState,
} from "@/modules/auth/actions";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: AuthActionState = {};

export function ChangePasswordForm() {
  const [state, action] = useActionState(changePasswordAction, initialState);

  return (
    <form action={action} className="auth-form">
      {state.error ? <p className="form-error">{state.error}</p> : null}

      <label>
        <span>Current temporary password</span>
        <input
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
        {state.fieldErrors?.currentPassword?.map((error) => (
          <small className="field-error" key={error}>{error}</small>
        ))}
      </label>

      <label>
        <span>New password</span>
        <input
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
        />
        {state.fieldErrors?.newPassword?.map((error) => (
          <small className="field-error" key={error}>{error}</small>
        ))}
      </label>

      <label>
        <span>Confirm new password</span>
        <input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
        />
        {state.fieldErrors?.confirmPassword?.map((error) => (
          <small className="field-error" key={error}>{error}</small>
        ))}
      </label>

      <SubmitButton
        idleLabel="Set new password"
        pendingLabel="Updating password…"
      />
    </form>
  );
}
