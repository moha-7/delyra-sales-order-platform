"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/auth/submit-button";
import {
  assignDesignerAction,
  type DesignActionState,
} from "@/modules/crm/design-actions";

const initialState: DesignActionState = {};

export function DesignAssignmentForm({
  opportunityId,
  designers,
  currentDesignerId,
}: {
  opportunityId: string;
  designers: Array<{ id: string; displayName: string }>;
  currentDesignerId?: string;
}) {
  const [state, action] = useActionState(assignDesignerAction, initialState);
  return (
    <form action={action} className="record-form compact-form">
      <input type="hidden" name="opportunityId" value={opportunityId} />
      {state.error ? <p className="form-error form-wide">{state.error}</p> : null}
      {state.success ? <p className="form-success form-wide">{state.success}</p> : null}
      <label>
        <span>Designer</span>
        <select name="designerId" defaultValue={currentDesignerId ?? ""} required>
          <option value="" disabled>Select designer</option>
          {designers.map((designer) => (
            <option value={designer.id} key={designer.id}>{designer.displayName}</option>
          ))}
        </select>
      </label>
      <label>
        <span>Design due date</span>
        <input name="dueAt" type="datetime-local" />
      </label>
      <div className="form-wide form-actions">
        <SubmitButton idleLabel="Assign designer" pendingLabel="Assigning…" />
      </div>
    </form>
  );
}
