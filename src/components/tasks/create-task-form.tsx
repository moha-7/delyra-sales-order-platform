"use client";

import { useActionState } from "react";
import { TASK_PRIORITY_OPTIONS } from "@/modules/tasks/options";
import { createTaskAction, type TaskActionState } from "@/modules/tasks/actions";

const initialState: TaskActionState = {};

export function CreateTaskForm({
  users,
  opportunityId,
  sectionKey = "tasks",
}: {
  users: Array<{ id: string; displayName: string }>;
  opportunityId?: string;
  sectionKey?: string;
}) {
  const [state, action, pending] = useActionState(createTaskAction, initialState);
  return (
    <form action={action} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
      {opportunityId ? <input type="hidden" name="opportunityId" value={opportunityId} /> : null}
      <input type="hidden" name="sectionKey" value={sectionKey} />
      {state.error ? <p className="md:col-span-2 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{state.error}</p> : null}
      {state.success ? <p className="md:col-span-2 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{state.success}</p> : null}
      <label className="grid gap-1.5 text-sm font-bold text-slate-700 md:col-span-2">Title<input className="rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" name="title" required /></label>
      <label className="grid gap-1.5 text-sm font-bold text-slate-700">Assigned to<select className="rounded-xl border border-slate-300 px-3 py-2.5" name="assignedToId" required><option value="">Select employee</option>{users.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select></label>
      <label className="grid gap-1.5 text-sm font-bold text-slate-700">Priority<select className="rounded-xl border border-slate-300 px-3 py-2.5" name="priority" defaultValue="NORMAL">{TASK_PRIORITY_OPTIONS.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label className="grid gap-1.5 text-sm font-bold text-slate-700">Due date<input className="rounded-xl border border-slate-300 px-3 py-2.5" name="dueAt" type="datetime-local" /></label>
      <label className="grid gap-1.5 text-sm font-bold text-slate-700 md:col-span-2">Description<textarea className="rounded-xl border border-slate-300 px-3 py-2.5" name="description" rows={3} /></label>
      <div className="md:col-span-2 flex justify-end"><button className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-blue-700 disabled:opacity-60" disabled={pending} type="submit"><i className="bi bi-plus-lg" />{pending ? "Creating…" : "Create task"}</button></div>
    </form>
  );
}
