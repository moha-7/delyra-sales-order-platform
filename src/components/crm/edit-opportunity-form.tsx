"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/auth/submit-button";
import {
  updateOpportunityAction,
  type CrmActionState,
} from "@/modules/crm/actions";
import { dateTimeLocalValue, enumLabel } from "@/modules/crm/format";
import {
  OPPORTUNITY_STAGES,
} from "@/modules/crm/options";

const initialState: CrmActionState = {};

type OwnerOption = { id: string; displayName: string };

type OpportunityInput = {
  id: string;
  title: string;
  stage: string;
  siteAddress: string | null;
  requirementsSummary: string | null;
  customerBudgetAed: string | null;
  probabilityPct: string | null;
  nextFollowUpAt: string | null;
  lostReason: string | null;
  ownerId: string;
};

export function EditOpportunityForm({
  opportunity,
  owners,
  canAssign,
}: {
  opportunity: OpportunityInput;
  owners: OwnerOption[];
  canAssign: boolean;
}) {
  const [state, action] = useActionState(updateOpportunityAction, initialState);

  return (
    <form action={action} className="record-form compact-form">
      <input type="hidden" name="opportunityId" value={opportunity.id} />
      {state.error ? <p className="form-error form-wide">{state.error}</p> : null}
      {state.success ? <p className="form-success form-wide">{state.success}</p> : null}

      <label className="form-wide">
        <span>Title *</span>
        <input name="title" defaultValue={opportunity.title} required maxLength={200} />
      </label>

      <label>
        <span>Stage</span>
        <select name="stage" defaultValue={opportunity.stage}>
          {OPPORTUNITY_STAGES.map((stage) => (
              <option value={stage} key={stage}>{enumLabel(stage)}</option>
            ))}
        </select>
      </label>

      {canAssign ? (
        <label>
          <span>Owner</span>
          <select name="ownerId" defaultValue={opportunity.ownerId}>
            {owners.map((owner) => (
              <option value={owner.id} key={owner.id}>{owner.displayName}</option>
            ))}
          </select>
        </label>
      ) : null}

      <label>
        <span>Customer budget (AED, optional)</span>
        <input
          name="customerBudgetAed"
          inputMode="decimal"
          defaultValue={opportunity.customerBudgetAed ?? ""}
        />
      </label>

      <label>
        <span>Probability %</span>
        <input
          name="probabilityPct"
          type="number"
          min="0"
          max="100"
          step="1"
          defaultValue={opportunity.probabilityPct ?? ""}
        />
      </label>

      <label>
        <span>Next follow-up</span>
        <input
          name="nextFollowUpAt"
          type="datetime-local"
          defaultValue={dateTimeLocalValue(opportunity.nextFollowUpAt)}
        />
      </label>

      <label>
        <span>Lost reason</span>
        <input name="lostReason" defaultValue={opportunity.lostReason ?? ""} maxLength={1000} />
        {state.fieldErrors?.lostReason?.map((error) => (
          <small className="field-error" key={error}>{error}</small>
        ))}
      </label>

      <label className="form-wide">
        <span>Site address</span>
        <textarea name="siteAddress" rows={2} defaultValue={opportunity.siteAddress ?? ""} />
      </label>

      <label className="form-wide">
        <span>Requirements summary</span>
        <textarea
          name="requirementsSummary"
          rows={5}
          defaultValue={opportunity.requirementsSummary ?? ""}
        />
      </label>

      <div className="form-wide conversion-note">
        Won is not available here. Finance confirms the deposit to move an opportunity to Won.
      </div>

      <div className="form-wide form-actions">
        <SubmitButton idleLabel="Save opportunity" pendingLabel="Saving…" />
      </div>
    </form>
  );
}
