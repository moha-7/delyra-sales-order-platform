"use client";

import { useActionState } from "react";
import { TASK_PRIORITY_OPTIONS, TASK_STATUS_OPTIONS, type TaskPriorityValue, type TaskStatusValue } from "@/modules/tasks/options";
import { updateTaskAction, type TaskActionState } from "@/modules/tasks/actions";

const initialState: TaskActionState = {};

export function TaskUpdateForm({ task, users }: { task: { id: string; status: TaskStatusValue; priority: TaskPriorityValue; assignedToId: string; dueAt: string | null; blockedReason: string | null }; users: Array<{ id: string; displayName: string }> }) {
  const [state, action, pending] = useActionState(updateTaskAction, initialState);
  return <form action={action} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
    <input type="hidden" name="taskId" value={task.id} />
    {state.error ? <p className="md:col-span-2 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{state.error}</p> : null}
    {state.success ? <p className="md:col-span-2 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{state.success}</p> : null}
    <label className="grid gap-1.5 text-sm font-bold text-slate-700">Status<select className="rounded-xl border border-slate-300 px-3 py-2.5" name="status" defaultValue={task.status}>{TASK_STATUS_OPTIONS.map((value) => <option key={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
    <label className="grid gap-1.5 text-sm font-bold text-slate-700">Priority<select className="rounded-xl border border-slate-300 px-3 py-2.5" name="priority" defaultValue={task.priority}>{TASK_PRIORITY_OPTIONS.map((value) => <option key={value}>{value}</option>)}</select></label>
    <label className="grid gap-1.5 text-sm font-bold text-slate-700">Assignee<select className="rounded-xl border border-slate-300 px-3 py-2.5" name="assignedToId" defaultValue={task.assignedToId}>{users.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select></label>
    <label className="grid gap-1.5 text-sm font-bold text-slate-700">Due date<input className="rounded-xl border border-slate-300 px-3 py-2.5" name="dueAt" type="datetime-local" defaultValue={task.dueAt ?? ""} /></label>
    <label className="grid gap-1.5 text-sm font-bold text-slate-700 md:col-span-2">Blocked reason<textarea className="rounded-xl border border-slate-300 px-3 py-2.5" name="blockedReason" rows={2} defaultValue={task.blockedReason ?? ""} /></label>
    <div className="md:col-span-2 flex justify-end"><button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-slate-800" disabled={pending} type="submit">{pending ? "Saving…" : "Save task"}</button></div>
  </form>;
}
