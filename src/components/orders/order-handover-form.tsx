"use client";

import { useActionState } from "react";
import type { HandoverStatus } from "@/generated/prisma/client";
import { updateOrderHandoverAction, type OrderActionState } from "@/modules/orders/actions";
import { uploadRossDocumentAction, type DocumentActionState } from "@/modules/documents/actions";

const initialOrder: OrderActionState = {};
const initialDocument: DocumentActionState = {};

const HANDOVER_STATUSES = [
  "PACKAGE_RECEIVED",
  "MISSING_FILES",
  "READY",
  "SENT_TO_SUPPLIER",
  "PO_PENDING",
  "PO_CREATED",
  "PO_SENT",
  "ETA_ENTERED",
  "COMPLETED",
  "CANCELLED",
] as const satisfies readonly HandoverStatus[];

export function OrderHandoverForm({ handover }: { handover: { id: string; opportunityId: string; status: HandoverStatus; supplierReference: string | null; erpPoNumber: string | null; currentEta: string | null; notes: string | null } }) {
  const [state, action, pending] = useActionState(updateOrderHandoverAction, initialOrder);
  const [documentState, uploadAction, uploadPending] = useActionState(uploadRossDocumentAction, initialDocument);
  return <div className="order-workspace">
    <form key={`${handover.id}:${handover.status}:${handover.supplierReference ?? ""}:${handover.erpPoNumber ?? ""}:${handover.currentEta ?? ""}:${handover.notes ?? ""}`} action={action} className="record-form compact-form">
      <input type="hidden" name="handoverId" value={handover.id} />
      {state.error ? <p className="form-error form-wide">{state.error}</p> : null}{state.success ? <p className="form-success form-wide">{state.success}</p> : null}
      <label><span>Status</span><select name="status" defaultValue={handover.status}>{HANDOVER_STATUSES.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></label>
      <label><span>Supplier OC/AB reference</span><input name="supplierReference" defaultValue={handover.supplierReference ?? ""} /></label>
      <label><span>ERP PO number</span><input name="erpPoNumber" defaultValue={handover.erpPoNumber ?? ""} /></label>
      <label><span>Current ETA</span><input name="currentEta" type="datetime-local" defaultValue={handover.currentEta ?? ""} /></label>
      <label className="form-wide"><span>Notes / return reason</span><textarea name="notes" rows={3} defaultValue={handover.notes ?? ""} /></label>
      <div className="form-wide form-actions"><button className="primary-button" type="submit" disabled={pending}>{pending ? "Saving…" : "Save handover update"}</button></div>
    </form>
    <form action={uploadAction} className="record-form compact-form">
      <input type="hidden" name="opportunityId" value={handover.opportunityId} />
      {documentState.error ? <p className="form-error form-wide">{documentState.error}</p> : null}{documentState.success ? <p className="form-success form-wide">{documentState.success}</p> : null}
      <label><span>Document</span><select name="category"><option value="SUPPLIER_ORDER_CONFIRMATION">Supplier OC/AB</option><option value="ERP_PO">ERP Purchase Order</option></select></label>
      <label><span>File</span><input name="file" type="file" required /></label>
      <div className="form-wide form-actions"><button className="secondary-button" type="submit" disabled={uploadPending}>{uploadPending ? "Uploading…" : "Upload order document"}</button></div>
    </form>
  </div>;
}
