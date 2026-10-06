"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/auth/submit-button";
import {
  convertLeadAction,
  type CrmActionState,
} from "@/modules/crm/actions";
import { dateTimeLocalValue, enumLabel } from "@/modules/crm/format";
import { CUSTOMER_TYPES } from "@/modules/crm/options";

const initialState: CrmActionState = {};

type OwnerOption = {
  id: string;
  displayName: string;
};

export function ConvertLeadForm({
  leadId,
  leadName,
  currentOwnerId,
  defaultTrack,
  nextFollowUpAt,
  owners,
  canAssign,
}: {
  leadId: string;
  leadName: string;
  currentOwnerId: string;
  defaultTrack: string | null;
  nextFollowUpAt: string | null;
  owners: OwnerOption[];
  canAssign: boolean;
}) {
  const [state, action] = useActionState(convertLeadAction, initialState);
  const track = defaultTrack === "PROJECT" ? "PROJECT" : "RETAIL";

  return (
    <form action={action} className="record-form compact-form">
      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="track" value={track} />
      {state.error ? <p className="form-error form-wide">{state.error}</p> : null}

      <label>
        <span>Customer type</span>
        <select name="customerType" defaultValue="INDIVIDUAL">
          {CUSTOMER_TYPES.map((type) => (
            <option value={type} key={type}>{enumLabel(type)}</option>
          ))}
        </select>
      </label>

      <div className="conversion-note">
        <strong>Workspace</strong>
        <p>{enumLabel(track)} is fixed from the source lead. Users cannot switch Retail and Project during conversion.</p>
      </div>

      <label className="form-wide">
        <span>Opportunity title *</span>
        <input
          name="opportunityTitle"
          defaultValue={`${leadName} Kitchen`}
          required
          maxLength={200}
        />
        {state.fieldErrors?.opportunityTitle?.map((error) => (
          <small className="field-error" key={error}>{error}</small>
        ))}
      </label>

      <label>
        <span>Customer budget (AED, optional)</span>
        <input name="customerBudgetAed" inputMode="decimal" placeholder="0.00" />
        {state.fieldErrors?.customerBudgetAed?.map((error) => (
          <small className="field-error" key={error}>{error}</small>
        ))}
      </label>

      <label>
        <span>Probability %</span>
        <input name="probabilityPct" type="number" min="0" max="100" step="1" />
      </label>

      <label>
        <span>Next follow-up</span>
        <input
          name="nextFollowUpAt"
          type="datetime-local"
          defaultValue={dateTimeLocalValue(nextFollowUpAt)}
        />
      </label>

      {canAssign ? (
        <label>
          <span>Opportunity owner</span>
          <select name="ownerId" defaultValue={currentOwnerId}>
            {owners.map((owner) => (
              <option value={owner.id} key={owner.id}>{owner.displayName}</option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="form-wide">
        <span>Site address</span>
        <textarea name="siteAddress" rows={2} maxLength={500} />
      </label>

      <label className="form-wide">
        <span>Requirements summary</span>
        <textarea name="requirementsSummary" rows={4} maxLength={4000} />
      </label>

      <div className="form-wide conversion-note">
        Conversion creates the customer and qualified opportunity in one database transaction.
        Missing phone and email values remain empty and create a verification task.
      </div>

      <div className="form-wide form-actions">
        <SubmitButton idleLabel="Convert lead" pendingLabel="Converting…" />
      </div>
    </form>
  );
}
