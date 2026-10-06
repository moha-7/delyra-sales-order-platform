"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/auth/submit-button";
import {
  saveRetailFinancePricingAction,
  type PricingActionState,
} from "@/modules/pricing/actions";

const initialState: PricingActionState = {};

type FinanceValues = {
  conversionRate: string;
  kitchenSellingRate: string;
  hlpSellingRate: string;
  applianceCostAed: string;
  worktopCostAed: string;
  worktopSellingPriceAed: string;
  freightAed: string;
  clearanceAed: string;
  otherCostAed: string;
  otherSellingPriceAed: string;
  managerDiscountPercent: string;
  customerDiscountAed: string;
  financeNotes: string;
  sellingRateOverrideReason: string;
};

export function RetailPricingForm({
  opportunityId,
  designValues,
  values,
  canEdit,
  locked,
}: {
  opportunityId: string;
  designValues: { furnitureEur: string; hlpEur: string; pointFactor: string };
  values: FinanceValues;
  canEdit: boolean;
  locked: boolean;
}) {
  const [state, action] = useActionState(saveRetailFinancePricingAction, initialState);

  return (
    <form action={action} className="record-form compact-form">
      <input type="hidden" name="opportunityId" value={opportunityId} />
      {state.error ? <p className="form-error form-wide">{state.error}</p> : null}
      {state.success ? <p className="form-success form-wide">{state.success}</p> : null}

      <div className="form-wide conversion-note">This portfolio edition uses fictional, configurable pricing defaults for supplier inputs, cost conversion, commercial rates, logistics costs, and manager-approved adjustments.</div>

      <div className="form-wide pricing-readonly-grid">
        <article><span>Design Furniture list</span><strong>EUR {designValues.furnitureEur}</strong></article>
        <article><span>Design HLP / Trade Goods list</span><strong>EUR {designValues.hlpEur}</strong></article>
        <article><span>Default Supplier selling rate</span><strong>{designValues.pointFactor}</strong></article>
        <article><span>Manager discount</span><strong>{values.managerDiscountPercent}% / AED {values.customerDiscountAed}</strong></article>
      </div>

      <label><span>Finance material cost rate EUR → AED</span><input name="conversionRate" inputMode="decimal" defaultValue={values.conversionRate} disabled={!canEdit || locked} /></label>
      <label><span>Kitchen selling rate</span><input name="kitchenSellingRate" inputMode="decimal" defaultValue={values.kitchenSellingRate} disabled={!canEdit || locked} /></label>
      <label><span>HLP / trade goods selling rate</span><input name="hlpSellingRate" inputMode="decimal" defaultValue={values.hlpSellingRate} disabled={!canEdit || locked} /></label>
      <label><span>Appliances supplier cost (AED)</span><input name="applianceCostAed" inputMode="decimal" defaultValue={values.applianceCostAed} disabled={!canEdit || locked} /></label>
      <label><span>Worktop cost (AED)</span><input name="worktopCostAed" inputMode="decimal" defaultValue={values.worktopCostAed} disabled={!canEdit || locked} /></label>
      <label><span>Worktop selling price (AED)</span><input name="worktopSellingPriceAed" inputMode="decimal" defaultValue={values.worktopSellingPriceAed} disabled={!canEdit || locked} /></label>
      <label><span>Freight (AED)</span><input name="freightAed" inputMode="decimal" defaultValue={values.freightAed} disabled={!canEdit || locked} /></label>
      <label><span>Clearance (AED)</span><input name="clearanceAed" inputMode="decimal" defaultValue={values.clearanceAed} disabled={!canEdit || locked} /></label>
      <label><span>Other local cost (AED)</span><input name="otherCostAed" inputMode="decimal" defaultValue={values.otherCostAed} disabled={!canEdit || locked} /></label>
      <label><span>Other local selling price (AED)</span><input name="otherSellingPriceAed" inputMode="decimal" defaultValue={values.otherSellingPriceAed} disabled={!canEdit || locked} /></label>
      <label className="form-wide"><span>Selling rate override reason — required if Finance changes rate from default</span><textarea name="sellingRateOverrideReason" rows={2} defaultValue={values.sellingRateOverrideReason} disabled={!canEdit || locked} /></label>
      <label className="form-wide"><span>Finance notes</span><textarea name="financeNotes" rows={4} defaultValue={values.financeNotes} disabled={!canEdit || locked} /></label>

      {canEdit && !locked ? <div className="form-wide form-actions"><SubmitButton idleLabel="Save Retail pricing draft" pendingLabel="Saving…" /></div> : null}
    </form>
  );
}
