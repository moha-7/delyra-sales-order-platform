import Link from "next/link";
import { redirect } from "next/navigation";
import { AuditAction, type Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { formatDateTime } from "@/modules/crm/format";
import { PERMISSIONS } from "@/modules/rbac/permissions";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; action?: string; entity?: string }>;
}) {
  const user = await requireUser();
  if (!user.permissions.includes(PERMISSIONS.AUDIT_VIEW))
    redirect("/dashboard?error=forbidden");
  const params = await searchParams;
  const q = params.q?.trim();
  const action = Object.values(AuditAction).includes(
    params.action as AuditAction,
  )
    ? (params.action as AuditAction)
    : undefined;
  const where: Prisma.AuditLogWhereInput = {
    ...(action ? { action } : {}),
    ...(params.entity ? { entityType: params.entity } : {}),
    ...(q
      ? {
          OR: [
            { entityType: { contains: q, mode: "insensitive" } },
            { entityId: { contains: q, mode: "insensitive" } },
            { actor: { displayName: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const [logs, entityTypes] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: { actor: { select: { displayName: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    db.auditLog.findMany({
      distinct: ["entityType"],
      select: { entityType: true },
      orderBy: { entityType: "asc" },
    }),
  ]);
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="rounded-3xl bg-gradient-to-br from-[#10233d] to-[#225da8] p-7 text-white shadow-xl">
        <p className="text-xs font-black uppercase tracking-[.2em] text-blue-200">
          Governance
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          Audit center
        </h1>
        <p className="mt-3 text-sm text-blue-100">
          Immutable who, what, when, before, after, and direct operational
          links.
        </p>
      </header>
      <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_210px_210px_auto]">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search actor, entity, or reference…"
          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
        />
        <select
          name="action"
          defaultValue={action ?? ""}
          className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
        >
          <option value="">All actions</option>
          {Object.values(AuditAction).map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select
          name="entity"
          defaultValue={params.entity ?? ""}
          className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
        >
          <option value="">All entities</option>
          {entityTypes.map((item) => (
            <option key={item.entityType}>{item.entityType}</option>
          ))}
        </select>
        <button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-extrabold text-white">
          <i className="bi bi-search mr-2" />
          Filter
        </button>
      </form>
      <section className="space-y-3">
        {logs.map((log) => (
          <details
            key={log.id}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <summary className="cursor-pointer list-none p-5 [&::-webkit-details-marker]:hidden">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <i className="bi bi-shield-check" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm text-slate-950">
                      {log.action.replaceAll("_", " ")}
                    </strong>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-600">
                      {log.entityType}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {log.actor?.displayName ?? "System"} ·{" "}
                    {log.actor?.email ?? "automation"} · {log.entityId}
                  </p>
                </div>
                <time className="text-xs font-bold text-slate-400">
                  {formatDateTime(log.createdAt)}
                </time>
              </div>
            </summary>
            <div className="grid gap-4 border-t border-slate-100 bg-slate-50/70 p-5 lg:grid-cols-2">
              <div>
                <strong className="text-xs uppercase tracking-wider text-slate-600">
                  Before
                </strong>
                <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-white p-4 text-xs text-slate-700">
                  {log.before ? JSON.stringify(log.before, null, 2) : "—"}
                </pre>
              </div>
              <div>
                <strong className="text-xs uppercase tracking-wider text-slate-600">
                  After
                </strong>
                <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-white p-4 text-xs text-slate-700">
                  {log.after ? JSON.stringify(log.after, null, 2) : "—"}
                </pre>
              </div>
              {log.actionUrl ? (
                <Link
                  href={log.actionUrl}
                  className="font-extrabold text-blue-700"
                >
                  Open linked record <i className="bi bi-arrow-up-right ml-1" />
                </Link>
              ) : null}
            </div>
          </details>
        ))}
        {!logs.length ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center text-sm font-bold text-slate-500">
            No audit entries match the filters.
          </div>
        ) : null}
      </section>
    </div>
  );
}
