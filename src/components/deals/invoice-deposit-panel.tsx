"use client";

import { useActionState } from "react";
import { uploadFinanceInvoiceAction, type DocumentActionState } from "@/modules/documents/actions";
import { confirmDepositAction, recordFinanceInvoiceAction, submitDepositAction, type DealActionState } from "@/modules/deals/actions";

const dealState: DealActionState = {};
const documentState: DocumentActionState = {};

export function FinanceInvoiceForm({ opportunityId, values }: { opportunityId: string; values: { reference: string; date: string; total: string } }) {
  const [state, action, pending] = useActionState(recordFinanceInvoiceAction, dealState);
  const [uploadState, uploadAction, uploadPending] = useActionState(uploadFinanceInvoiceAction, documentState);
  return <div className="order-workspace">
    <form action={action} className="record-form compact-form"><input type="hidden" name="opportunityId" value={opportunityId} />{state.error ? <p className="form-error form-wide">{state.error}</p> : null}{state.success ? <p className="form-success form-wide">{state.success}</p> : null}<label><span>Invoice reference</span><input name="invoiceReference" defaultValue={values.reference} required /></label><label><span>Invoice date</span><input name="invoiceDate" type="date" defaultValue={values.date} /></label><label className="form-wide"><span>Invoice total AED</span><input name="invoiceTotal" inputMode="decimal" defaultValue={values.total} required /></label><div className="form-wide form-actions"><button className="primary-button" type="submit" disabled={pending}>{pending ? "Saving…" : "Record invoice and notify Sales"}</button></div></form>
    <form action={uploadAction} className="record-form compact-form"><input type="hidden" name="opportunityId" value={opportunityId} />{uploadState.error ? <p className="form-error form-wide">{uploadState.error}</p> : null}{uploadState.success ? <p className="form-success form-wide">{uploadState.success}</p> : null}<label className="form-wide"><span>Invoice PDF</span><input name="invoiceFile" type="file" accept="application/pdf" required /></label><div className="form-wide form-actions"><button className="secondary-button" type="submit" disabled={uploadPending}>{uploadPending ? "Uploading…" : "Upload invoice PDF"}</button></div></form>
  </div>;
}

export function SalesDepositForm({ opportunityId, expectedAmount }: { opportunityId: string; expectedAmount: string }) {
  const [state, action, pending] = useActionState(submitDepositAction, dealState);
  return <form action={action} className="record-form compact-form"><input type="hidden" name="opportunityId" value={opportunityId} />{state.error ? <p className="form-error form-wide">{state.error}</p> : null}{state.success ? <p className="form-success form-wide">{state.success}</p> : null}<div className="form-wide conversion-note">Expected minimum deposit: AED {expectedAmount} (30% of the recorded Finance invoice total). Submitting this creates a deposit receipt waiting for Finance confirmation.</div><label><span>Amount received AED</span><input name="amount" inputMode="decimal" required /></label><label><span>Payment method</span><select name="paymentMethod" defaultValue=""><option value="">Select…</option><option>Bank Transfer</option><option>Card</option><option>Cash</option><option>Cheque</option><option>Other</option></select></label><label><span>Payment reference</span><input name="paymentReference" /></label><label><span>Received at</span><input name="receivedAt" type="datetime-local" /></label><div className="form-wide form-actions"><button className="primary-button" type="submit" disabled={pending}>{pending ? "Submitting…" : "Generate receipt and send to Finance"}</button></div></form>;
}

export function FinanceDepositDecision({ depositId }: { depositId: string }) {
  const [state, action, pending] = useActionState(confirmDepositAction, dealState);
  return <form action={action} className="approval-form"><input type="hidden" name="depositId" value={depositId} />{state.error ? <p className="form-error">{state.error}</p> : null}{state.success ? <p className="form-success">{state.success}</p> : null}<textarea name="notes" rows={2} placeholder="Finance confirmation notes" /><button className="primary-button" type="submit" disabled={pending}>{pending ? "Confirming…" : "Confirm deposit and mark Won"}</button></form>;
}
