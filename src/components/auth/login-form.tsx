"use client";

import { useActionState } from "react";
import { loginAction, type AuthActionState } from "@/modules/auth/actions";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: AuthActionState = {};

export function LoginForm() {
  const [state, action] = useActionState(loginAction, initialState);

  return (
    <form action={action} className="auth-form">
      {state.error ? <p className="form-error">{state.error}</p> : null}

      <label>
        <span>Email address</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          placeholder="name@northstar.example"
        />
        {state.fieldErrors?.email?.map((error) => (
          <small className="field-error" key={error}>{error}</small>
        ))}
      </label>

      <label>
        <span>Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        {state.fieldErrors?.password?.map((error) => (
          <small className="field-error" key={error}>{error}</small>
        ))}
      </label>

      <SubmitButton idleLabel="Sign in" pendingLabel="Signing in…" />
    </form>
  );
}
