"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/auth/submit-button";
import {
  saveProjectPricingAction,
  type PricingActionState,
} from "@/modules/pricing/actions";

const initialState: PricingActionState = {};

export function ProjectPricingForm({
  opportunityId,
  totalCostAed,
  proposedSellingPriceAed,
  notes,
  canEdit,
  locked,
}: {
  opportunityId: string;
  totalCostAed: string;
  proposedSellingPriceAed: string;
  notes: string;
  canEdit: boolean;
  locked: boolean;
}) {
  const [state, action] = useActionState(saveProjectPricingAction, initialState);

  return (
    <form action={action} className="record-form compact-form">
      <input type="hidden" name="opportunityId" value={opportunityId} />
      {state.error ? <p className="form-error form-wide">{state.error}</p> : null}
      {state.success ? <p className="form-success form-wide">{state.success}</p> : null}
      <div className="form-wide conversion-note">
        Finance keeps the detailed project calculation in Excel, uploads it as Project Costing evidence,
        and records only the approved summary values here.
      </div>
      <label>
        <span>Total project cost (AED)</span>
        <input name="totalCostAed" inputMode="decimal" defaultValue={totalCostAed} disabled={!canEdit || locked} />
      </label>
      <label>
        <span>Proposed selling price (AED, pre-VAT)</span>
        <input name="proposedSellingPriceAed" inputMode="decimal" defaultValue={proposedSellingPriceAed} disabled={!canEdit || locked} />
      </label>
      <label className="form-wide">
        <span>Finance calculation notes</span>
        <textarea name="notes" rows={4} defaultValue={notes} disabled={!canEdit || locked} />
      </label>
      {canEdit && !locked ? (
        <div className="form-wide form-actions">
          <SubmitButton idleLabel="Save project pricing summary" pendingLabel="Saving…" />
        </div>
      ) : null}
    </form>
  );
}
