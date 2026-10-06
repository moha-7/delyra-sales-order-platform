"use client";

import { useActionState } from "react";
import { generateQuotationAction, type QuotationActionState } from "@/modules/quotations/actions";

const initialState: QuotationActionState = {};

export function GenerateQuotationForm({ opportunityId }: { opportunityId: string }) {
  const [state, action, pending] = useActionState(generateQuotationAction, initialState);
  return <form action={action} className="approval-form">
    <input type="hidden" name="opportunityId" value={opportunityId} />
    {state.error ? <p className="form-error">{state.error}</p> : null}
    <textarea name="notes" rows={2} placeholder="Optional quotation notes" />
    <button className="primary-button" type="submit" disabled={pending}>{pending ? "Generating…" : "Generate quotation preview"}</button>
  </form>;
}
