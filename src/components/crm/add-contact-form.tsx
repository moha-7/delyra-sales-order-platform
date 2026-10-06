"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/auth/submit-button";
import {
  addContactAction,
  type CrmActionState,
} from "@/modules/crm/actions";

const initialState: CrmActionState = {};

export function AddContactForm({ customerId }: { customerId: string }) {
  const [state, action] = useActionState(addContactAction, initialState);

  return (
    <form action={action} className="record-form compact-form">
      <input type="hidden" name="customerId" value={customerId} />
      {state.error ? <p className="form-error form-wide">{state.error}</p> : null}
      {state.success ? <p className="form-success form-wide">{state.success}</p> : null}

      <label>
        <span>Contact name *</span>
        <input name="name" required maxLength={160} />
      </label>
      <label>
        <span>Role / title</span>
        <input name="roleTitle" maxLength={120} />
      </label>
      <label>
        <span>Mobile</span>
        <input name="mobile" maxLength={40} />
      </label>
      <label>
        <span>Email</span>
        <input name="email" type="email" maxLength={254} />
      </label>
      <label className="checkbox-label form-wide">
        <input name="isPrimary" type="checkbox" />
        <span>Set as primary contact</span>
      </label>
      <div className="form-wide form-actions">
        <SubmitButton idleLabel="Add contact" pendingLabel="Adding…" />
      </div>
    </form>
  );
}
