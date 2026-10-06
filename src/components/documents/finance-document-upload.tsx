"use client";

import { useActionState } from "react";
import {
  uploadFinanceDocumentAction,
  type DocumentActionState,
} from "@/modules/documents/actions";

const initialState: DocumentActionState = {};

export function FinanceProjectCostingUpload({ opportunityId }: { opportunityId: string }) {
  const [state, action, pending] = useActionState(uploadFinanceDocumentAction, initialState);
  return (
    <form action={action} className="record-form compact-form">
      <input type="hidden" name="opportunityId" value={opportunityId} />
      {state.error ? <p className="form-error form-wide">{state.error}</p> : null}
      {state.success ? <p className="form-success form-wide">{state.success}</p> : null}
      <label className="form-wide">
        <span>Project Costing Excel *</span>
        <input name="projectCostingFile" type="file" accept=".xlsx,.xls" required />
      </label>
      <div className="form-wide form-actions">
        <button className="primary-button" type="submit" disabled={pending}>
          {pending ? "Uploading…" : "Upload costing Excel"}
        </button>
      </div>
    </form>
  );
}
