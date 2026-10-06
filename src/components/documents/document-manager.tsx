"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Version = { id: string; versionNo: number; originalName: string; mimeType: string; sizeBytes: string; notes: string | null; createdAt: string; uploadedBy: { displayName: string } };
type ManagedDocument = { id: string; title: string; category: string; currentVersion: number; archivedAt: string | null; archiveReason: string | null; canManage: boolean; canArchive: boolean; canRestore: boolean; versions: Version[] };

function bytes(value: string) { const n = Number(value); return n < 1024 ** 2 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 ** 2).toFixed(1)} MB`; }

export function DocumentManager({ documents }: { documents: ManagedDocument[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  async function uploadVersion(documentId: string, form: HTMLFormElement) {
    setBusy(documentId); setMessage(null);
    const response = await fetch(`/api/documents/${documentId}/versions`, { method: "POST", body: new FormData(form) });
    const data = await response.json();
    setBusy(null); setMessage(response.ok ? `Version ${data.versionNo} uploaded.` : data.error ?? "Upload failed.");
    if (response.ok) { form.reset(); router.refresh(); }
  }
  async function archive(documentId: string) {
    const reason = window.prompt("Reason for archiving this file?");
    if (!reason) return;
    setBusy(documentId);
    const response = await fetch(`/api/documents/${documentId}/archive`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reason }) });
    const data = await response.json(); setBusy(null); setMessage(response.ok ? "Document archived." : data.error ?? "Archive failed."); if (response.ok) router.refresh();
  }

  async function restore(documentId: string) {
    setBusy(documentId);
    const response = await fetch(`/api/documents/${documentId}/restore`, { method: "POST" });
    const data = await response.json(); setBusy(null); setMessage(response.ok ? "Document restored." : data.error ?? "Restore failed."); if (response.ok) router.refresh();
  }
  return <div className="space-y-4">{message ? <p className="rounded-xl bg-blue-50 p-3 text-sm font-bold text-blue-800">{message}</p> : null}{documents.map((document) => { const current = document.versions[0]; return <article id={`document-${document.id}`} key={document.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-4 p-5 md:flex-row md:items-center"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-700"><i className={`bi ${current?.mimeType === "application/pdf" ? "bi-file-earmark-pdf-fill" : current?.mimeType.startsWith("image/") ? "bi-file-earmark-image-fill" : "bi-file-earmark-fill"}`} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-slate-950">{document.title}</h3><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-600">{document.category.replaceAll("_", " ")}</span><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700">v{document.currentVersion}</span>{document.archivedAt ? <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase text-red-700">Archived</span> : null}</div>{current ? <p className="mt-1 break-all text-sm text-slate-500">{current.originalName} · {bytes(current.sizeBytes)} · {current.uploadedBy.displayName}</p> : null}</div><div className="flex flex-wrap gap-2">{current ? <><Link href={`/documents/${current.id}/preview`} className="rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-blue-700"><i className="bi bi-eye mr-2" />Preview</Link><a href={`/api/document-versions/${current.id}/download`} className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50"><i className="bi bi-download mr-2" />Download</a></> : null}{document.canArchive && !document.archivedAt ? <button disabled={busy === document.id} onClick={() => archive(document.id)} className="rounded-xl border border-red-200 px-3.5 py-2 text-xs font-extrabold text-red-700 hover:bg-red-50"><i className="bi bi-archive mr-2" />Archive</button> : null}{document.canRestore && document.archivedAt ? <button disabled={busy === document.id} onClick={() => restore(document.id)} className="rounded-xl border border-emerald-200 px-3.5 py-2 text-xs font-extrabold text-emerald-700 hover:bg-emerald-50"><i className="bi bi-arrow-counterclockwise mr-2" />Restore</button> : null}</div></div><div className="border-t border-slate-100 bg-slate-50/70 p-4"><div className="grid gap-4 lg:grid-cols-[1fr_.9fr]"><details><summary className="cursor-pointer list-none text-sm font-extrabold text-slate-700 [&::-webkit-details-marker]:hidden"><i className="bi bi-clock-history mr-2 text-blue-600" />Version history ({document.versions.length})</summary><div className="mt-3 space-y-2">{document.versions.map((version) => <div key={version.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><strong className="text-sm text-slate-900">Version {version.versionNo}</strong><p className="truncate text-xs text-slate-500">{version.originalName} · {version.uploadedBy.displayName} · {new Date(version.createdAt).toLocaleString("en-GB")}</p>{version.notes ? <p className="mt-1 text-xs text-slate-600">{version.notes}</p> : null}</div><div className="flex gap-2"><Link className="text-xs font-bold text-blue-700" href={`/documents/${version.id}/preview`}>Preview</Link><a className="text-xs font-bold text-slate-600" href={`/api/document-versions/${version.id}/download`}>Download</a></div></div>)}</div></details>{document.canManage && !document.archivedAt ? <form onSubmit={(event) => { event.preventDefault(); void uploadVersion(document.id, event.currentTarget); }} className="grid gap-2 rounded-xl border border-dashed border-slate-300 bg-white p-3"><strong className="text-sm text-slate-800">Upload new version</strong><input type="file" name="file" required className="text-xs" /><input name="notes" placeholder="Revision note" className="rounded-lg border border-slate-200 px-3 py-2 text-xs" /><button disabled={busy === document.id} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-extrabold text-white">{busy === document.id ? "Uploading…" : "Upload version"}</button></form> : <p className="text-xs text-slate-500">Read-only for your role.</p>}</div></div></article>; })}{!documents.length ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm font-bold text-slate-500"><i className="bi bi-folder2-open block text-4xl text-slate-300" />No files uploaded yet.</div> : null}</div>;
}
