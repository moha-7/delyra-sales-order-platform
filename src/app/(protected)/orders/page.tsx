import Link from "next/link";
import { redirect } from "next/navigation";
import { HandoverStatus } from "@/generated/prisma/client";
import { StatusPill } from "@/components/crm/status-pill";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { formatDateTime } from "@/modules/crm/format";
import { PERMISSIONS } from "@/modules/rbac/permissions";

export default async function OrdersPage() {
  const user = await requireUser();
  if (!user.permissions.includes(PERMISSIONS.ORDER_HANDOVER_MANAGE))
    redirect("/dashboard?error=forbidden");
  const handovers = await db.orderHandover.findMany({
    where: { assignedToId: user.id },
    include: { opportunity: { include: { customer: true, owner: true } } },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });
  const open = handovers.filter(
    (item) =>
      item.status !== HandoverStatus.COMPLETED &&
      item.status !== HandoverStatus.CANCELLED,
  ).length;
  const missing = handovers.filter(
    (item) => item.status === HandoverStatus.MISSING_FILES,
  ).length;
  const etaMissing = handovers.filter(
    (item) =>
      !item.currentEta &&
      item.status !== HandoverStatus.COMPLETED &&
      item.status !== HandoverStatus.CANCELLED,
  ).length;
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="rounded-3xl bg-gradient-to-br from-[#10233d] to-[#225da8] p-7 text-white shadow-xl">
        <p className="text-xs font-black uppercase tracking-[.2em] text-blue-200">
          Order coordination
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          Order Coordination handovers
        </h1>
        <p className="mt-3 text-sm text-blue-100">
          Won packages, Supplier OC/AB, ERP PO, and delivery ETA.
        </p>
      </header>
      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-black uppercase tracking-wider text-blue-600">
            Open orders
          </span>
          <strong className="mt-2 block text-3xl font-black">{open}</strong>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-black uppercase tracking-wider text-red-600">
            Missing files
          </span>
          <strong className="mt-2 block text-3xl font-black">{missing}</strong>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-black uppercase tracking-wider text-amber-600">
            ETA missing
          </span>
          <strong className="mt-2 block text-3xl font-black">
            {etaMissing}
          </strong>
        </article>
      </section>
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-4">Opportunity</th>
                <th className="px-5 py-4">Customer</th>
                <th className="px-5 py-4">Sales</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">OC/AB</th>
                <th className="px-5 py-4">PO</th>
                <th className="px-5 py-4">ETA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {handovers.map((handover) => (
                <tr key={handover.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <Link
                      href={`/orders/${handover.id}`}
                      className="font-extrabold text-blue-700 hover:text-blue-900"
                    >
                      {handover.opportunity.reference}
                    </Link>
                    <small className="mt-1 block text-slate-500">
                      {handover.opportunity.title}
                    </small>
                  </td>
                  <td className="px-5 py-4 font-bold text-slate-800">
                    {handover.opportunity.customer.name}
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {handover.opportunity.owner.displayName}
                  </td>
                  <td className="px-5 py-4">
                    <StatusPill value={handover.status} />
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {handover.supplierReference ?? "—"}
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {handover.erpPoNumber ?? "—"}
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {formatDateTime(handover.currentEta)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!handovers.length ? (
          <div className="p-16 text-center text-sm font-bold text-slate-500">
            <i className="bi bi-box-seam mb-3 block text-4xl text-slate-300" />
            No Won handovers assigned.
          </div>
        ) : null}
      </section>
    </div>
  );
}
