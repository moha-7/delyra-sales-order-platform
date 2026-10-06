"use client";

import { useActionState } from "react";
import {
  saveDesignPackageAction,
  type DocumentActionState,
} from "@/modules/documents/actions";

const initialState: DocumentActionState = {};

export function OpportunityDocumentUpload({
  opportunityId,
  values,
}: {
  opportunityId: string;
  values: {
    designReference: string;
    revisionLabel: string;
    designFurnitureEur: string;
    designAuxiliaryEur: string;
    notes: string;
  };
}) {
  const [state, action, pending] = useActionState(saveDesignPackageAction, initialState);

  return (
    <form action={action} className="record-form design-package-form">
      <input type="hidden" name="opportunityId" value={opportunityId} />
      {state.error ? <p className="form-error form-wide">{state.error}</p> : null}
      {state.success ? <p className="form-success form-wide">{state.success}</p> : null}

      <label>
        <span>Design reference *</span>
        <input name="designReference" defaultValue={values.designReference} required />
      </label>
      <label>
        <span>Revision</span>
        <input name="revisionLabel" defaultValue={values.revisionLabel} placeholder="AB / Rev 2" />
      </label>
      <label>
        <span>Design Furniture value (EUR) *</span>
        <input name="designFurnitureEur" inputMode="decimal" defaultValue={values.designFurnitureEur} required />
      </label>
      <label>
        <span>Design HLP / Trade Goods value (EUR)</span>
        <input name="designAuxiliaryEur" inputMode="decimal" defaultValue={values.designAuxiliaryEur} />
      </label>

      <fieldset className="form-wide package-files-grid">
        <legend>design package files</legend>
        <label><span>Design .drw</span><input name="designFile" type="file" /></label>
        <label><span>Design PDF</span><input name="designPdf" type="file" accept="application/pdf" /></label>
        <label><span>Element List PDF</span><input name="elementList" type="file" accept="application/pdf" /></label>
        <label><span>Design Quotation PDF</span><input name="designQuotation" type="file" accept="application/pdf" /></label>
        <label><span>Appliances List (optional)</span><input name="appliancesList" type="file" /></label>
      </fieldset>

      <label className="form-wide">
        <span>Designer notes</span>
        <textarea name="notes" rows={3} defaultValue={values.notes} />
      </label>

      <div className="form-wide form-actions">
        <button className="secondary-button" type="submit" name="intent" value="SAVE" disabled={pending}>
          {pending ? "Saving…" : "Save draft"}
        </button>
        <button className="primary-button" type="submit" name="intent" value="SUBMIT" disabled={pending}>
          {pending ? "Submitting…" : "Save & submit design package"}
        </button>
      </div>
    </form>
  );
}
