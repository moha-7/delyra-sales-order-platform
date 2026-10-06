"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/auth/submit-button";
import {
  updateLeadAction,
  type CrmActionState,
} from "@/modules/crm/actions";
import { dateTimeLocalValue, enumLabel } from "@/modules/crm/format";
import {
  LEAD_STATUSES,
  OPPORTUNITY_TRACKS,
} from "@/modules/crm/options";

const initialState: CrmActionState = {};

type OwnerOption = {
  id: string;
  displayName: string;
  initials: string | null;
  department: string;
};

type LeadInput = {
  id: string;
  name: string;
  mobile: string | null;
  email: string | null;
  track: string | null;
  status: string;
  source: string | null;
  channel: string | null;
  campaign: string | null;
  interestCategory: string | null;
  notes: string | null;
  nextFollowUpAt: string | null;
  ownerId: string;
};

function Errors({ errors }: { errors?: string[] }) {
  return errors?.map((error) => (
    <small className="field-error" key={error}>{error}</small>
  ));
}

export function EditLeadForm({
  lead,
  owners,
  canAssign,
}: {
  lead: LeadInput;
  owners: OwnerOption[];
  canAssign: boolean;
}) {
  const [state, action] = useActionState(updateLeadAction, initialState);

  return (
    <form action={action} className="record-form compact-form">
      <input type="hidden" name="leadId" value={lead.id} />
      {state.error ? <p className="form-error form-wide">{state.error}</p> : null}
      {state.success ? <p className="form-success form-wide">{state.success}</p> : null}

      <label>
        <span>Name *</span>
        <input name="name" defaultValue={lead.name} required maxLength={160} />
        <Errors errors={state.fieldErrors?.name} />
      </label>

      <label>
        <span>Status</span>
        <select name="status" defaultValue={lead.status}>
          {LEAD_STATUSES.map((status) => (
              <option value={status} key={status}>{enumLabel(status)}</option>
            ))}
        </select>
      </label>

      <label>
        <span>Track</span>
        <select name="track" defaultValue={lead.track ?? ""}>
          <option value="">Not decided yet</option>
          {OPPORTUNITY_TRACKS.map((track) => (
            <option value={track} key={track}>{enumLabel(track)}</option>
          ))}
        </select>
      </label>

      <label>
        <span>Mobile</span>
        <input name="mobile" defaultValue={lead.mobile ?? ""} maxLength={40} />
      </label>

      <label>
        <span>Email</span>
        <input name="email" type="email" defaultValue={lead.email ?? ""} maxLength={254} />
        <Errors errors={state.fieldErrors?.email} />
      </label>

      <label>
        <span>Next follow-up</span>
        <input
          name="nextFollowUpAt"
          type="datetime-local"
          defaultValue={dateTimeLocalValue(lead.nextFollowUpAt)}
        />
      </label>

      <label>
        <span>Source</span>
        <input name="source" defaultValue={lead.source ?? ""} maxLength={120} />
      </label>

      <label>
        <span>Channel</span>
        <input name="channel" defaultValue={lead.channel ?? ""} maxLength={120} />
      </label>

      <label>
        <span>Campaign</span>
        <input name="campaign" defaultValue={lead.campaign ?? ""} maxLength={160} />
      </label>

      <label>
        <span>Interest category</span>
        <input
          name="interestCategory"
          defaultValue={lead.interestCategory ?? ""}
          maxLength={160}
        />
      </label>

      {canAssign ? (
        <label>
          <span>Owner</span>
          <select name="ownerId" defaultValue={lead.ownerId}>
            {owners.map((owner) => (
              <option value={owner.id} key={owner.id}>{owner.displayName}</option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="form-wide">
        <span>Notes</span>
        <textarea name="notes" rows={4} defaultValue={lead.notes ?? ""} maxLength={4000} />
      </label>

      <div className="form-wide form-actions">
        <SubmitButton idleLabel="Save lead" pendingLabel="Saving…" />
      </div>
    </form>
  );
}
