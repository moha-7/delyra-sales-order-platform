"use client";
import { useActionState } from "react";
import { addTaskCommentAction, type TaskActionState } from "@/modules/tasks/actions";
const initialState: TaskActionState = {};
export function TaskCommentForm({ taskId }: { taskId: string }) {
  const [state, action, pending] = useActionState(addTaskCommentAction, initialState);
  return <form action={action} className="grid gap-3"><input type="hidden" name="taskId" value={taskId} />{state.error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{state.error}</p> : null}<textarea name="body" rows={3} required placeholder="Add an update, decision, or blocker…" className="rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /><div className="flex justify-end"><button className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-blue-700" disabled={pending} type="submit">{pending ? "Adding…" : "Add comment"}</button></div></form>;
}
