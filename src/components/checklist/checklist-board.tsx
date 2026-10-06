"use client";

import { useActionState } from "react";
import type { ChecklistViewItem } from "@/modules/checklist/service";
import { updateChecklistItemAction, type ChecklistActionState } from "@/modules/checklist/actions";

const initialState: ChecklistActionState = {};

function ChecklistEditor({ item, opportunityId }: { item: ChecklistViewItem; opportunityId: string }) {
  const [state, action, pending] = useActionState(updateChecklistItemAction, initialState);
  return <form action={action} className="checklist-editor">
    <input type="hidden" name="opportunityId" value={opportunityId} />
    <input type="hidden" name="definitionId" value={item.definitionId} />
    <select name="status" defaultValue={item.status} disabled={pending}>
      <option value="NOT_STARTED">Not started</option>
      <option value="IN_PROGRESS">In progress</option>
      <option value="COMPLETED">Completed</option>
      <option value="NOT_APPLICABLE">Not applicable</option>
      <option value="BLOCKED">Blocked</option>
    </select>
    <input name="comment" defaultValue={item.comment ?? ""} placeholder="Comment / evidence note" />
    <button className="secondary-button compact-button" type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
    {state.error ? <small className="form-error">{state.error}</small> : null}
  </form>;
}

export function ChecklistBoard({ opportunityId, items }: { opportunityId: string; items: ChecklistViewItem[] }) {
  const sections = Array.from(new Set(items.map((item) => item.section)));
  const complete = items.filter((item) => item.status === "COMPLETED" || item.status === "NOT_APPLICABLE").length;
  return <section className="form-card checklist-board">
    <div className="card-heading"><div><p className="eyebrow">Digital checklist</p><h2>Order readiness without paper</h2></div><strong>{complete}/{items.length}</strong></div>
    {sections.map((section) => <div className="checklist-section" key={section}>
      <h3>{section}</h3>
      {items.filter((item) => item.section === section).map((item) => <article className="checklist-item" key={item.definitionId}>
        <div className="checklist-copy">
          <span className={`check-dot status-${item.status.toLowerCase()}`} />
          <div><strong>{item.label}{item.required ? " *" : ""}</strong><small>{item.automatic ? "Automatic from CRM data" : item.responsibleRole ? `Owner: ${item.responsibleRole}` : "Manual"}{item.completedBy ? ` · ${item.completedBy}` : ""}</small></div>
        </div>
        {item.canEdit ? <ChecklistEditor item={item} opportunityId={opportunityId} /> : <span className="status-pill">{item.status.replaceAll("_", " ")}</span>}
      </article>)}
    </div>)}
  </section>;
}
