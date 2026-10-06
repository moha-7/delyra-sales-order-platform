"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/auth/submit-button";
import {
  managerDecisionProjectAction,
  managerDecisionRetailAction,
  submitProjectPricingAction,
  submitRetailFinancePricingAction,
  type PricingActionState,
} from "@/modules/pricing/actions";

const initialState: PricingActionState = {};

export function SubmitRetailPricing({ pricingCaseId }: { pricingCaseId: string }) {
  const [state, action] = useActionState(submitRetailFinancePricingAction, initialState);
  return <form action={action} className="approval-form">
    <input type="hidden" name="pricingCaseId" value={pricingCaseId} />
    {state.error ? <p className="form-error">{state.error}</p> : null}
    {state.success ? <p className="form-success">{state.success}</p> : null}
    <textarea name="notes" rows={2} placeholder="Finance notes for Branch Manager" />
    <SubmitButton idleLabel="Send final calculation to Branch Manager" pendingLabel="Submitting…" />
  </form>;
}

export function ManagerRetailDecision({ pricingCaseId, currentDiscount }: { pricingCaseId: string; currentDiscount: string }) {
  const [state, action] = useActionState(managerDecisionRetailAction, initialState);
  return <form action={action} className="approval-form manager-decision-form">
    <input type="hidden" name="pricingCaseId" value={pricingCaseId} />
    {state.error ? <p className="form-error">{state.error}</p> : null}
    {state.success ? <p className="form-success">{state.success}</p> : null}
    <label><span>Manager discount %</span><input name="managerDiscountPercent" inputMode="decimal" defaultValue={currentDiscount} /></label>
    <label><span>Decision notes / discount reason</span><textarea name="notes" rows={3} /></label>
    <div className="inline-actions">
      <button className="secondary-button" name="decision" value="RETURN" type="submit">Return to Finance</button>
      <button className="primary-button" name="decision" value="APPROVE" type="submit">Approve final Retail price</button>
    </div>
  </form>;
}

export function SubmitProjectPricing({ pricingCaseId }: { pricingCaseId: string }) {
  const [state, action] = useActionState(submitProjectPricingAction, initialState);
  return <form action={action} className="approval-form">
    <input type="hidden" name="pricingCaseId" value={pricingCaseId} />
    {state.error ? <p className="form-error">{state.error}</p> : null}
    {state.success ? <p className="form-success">{state.success}</p> : null}
    <textarea name="notes" rows={2} placeholder="Project pricing notes for Branch Manager" />
    <SubmitButton idleLabel="Send Project price to Branch Manager" pendingLabel="Submitting…" />
  </form>;
}

export function ManagerProjectDecision({ pricingCaseId }: { pricingCaseId: string }) {
  const [state, action] = useActionState(managerDecisionProjectAction, initialState);
  return <form action={action} className="approval-form">
    <input type="hidden" name="pricingCaseId" value={pricingCaseId} />
    {state.error ? <p className="form-error">{state.error}</p> : null}
    {state.success ? <p className="form-success">{state.success}</p> : null}
    <textarea name="notes" rows={3} placeholder="Approval notes" />
    <div className="inline-actions">
      <button className="secondary-button" name="decision" value="RETURN" type="submit">Return to Finance</button>
      <button className="primary-button" name="decision" value="APPROVE" type="submit">Approve final Project price</button>
    </div>
  </form>;
}
