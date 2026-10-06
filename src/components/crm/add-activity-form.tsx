"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/auth/submit-button";
import {
  addOpportunityActivityAction,
  type CrmActionState,
} from "@/modules/crm/actions";
import { enumLabel } from "@/modules/crm/format";
import { ACTIVITY_TYPES } from "@/modules/crm/options";

const initialState: CrmActionState = {};

export function AddActivityForm({ opportunityId }: { opportunityId: string }) {
  const [state, action] = useActionState(
    addOpportunityActivityAction,
    initialState,
  );

  return (
    <form action={action} className="record-form compact-form">
      <input type="hidden" name="opportunityId" value={opportunityId} />
      {state.error ? <p className="form-error form-wide">{state.error}</p> : null}
      {state.success ? <p className="form-success form-wide">{state.success}</p> : null}

      <label>
        <span>Activity type</span>
        <select name="type" defaultValue="NOTE">
          {ACTIVITY_TYPES.map((type) => (
              <option value={type} key={type}>{enumLabel(type)}</option>
            ))}
        </select>
      </label>
      <label>
        <span>Subject / update *</span>
        <input name="subject" required maxLength={200} />
      </label>
      <label className="form-wide">
        <span>Details / @mentions</span>
        <textarea name="body" rows={4} maxLength={4000} />
      </label>
      <div className="form-wide form-actions">
        <SubmitButton idleLabel="Post update" pendingLabel="Posting…" />
      </div>
    </form>
  );
}
