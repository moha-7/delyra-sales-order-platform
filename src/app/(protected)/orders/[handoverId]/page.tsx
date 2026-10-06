import { formatOrderDateTime, formatOrderDateTimeLocal } from "@/modules/orders/time";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChecklistBoard } from "@/components/checklist/checklist-board";
import { DocumentManager } from "@/components/documents/document-manager";
import { OrderHandoverForm } from "@/components/orders/order-handover-form";
import { StatusPill } from "@/components/crm/status-pill";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { checklistForOpportunity } from "@/modules/checklist/service";
import { formatDateTime } from "@/modules/crm/format";
import {
  canArchiveDocument,
  canUploadDocumentCategory,
  canViewDocument,
} from "@/modules/documents/access";
import { PERMISSIONS } from "@/modules/rbac/permissions";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ handoverId: string }>;
}) {
  const user = await requireUser();
  if (!user.permissions.includes(PERMISSIONS.ORDER_HANDOVER_MANAGE))
    redirect("/dashboard?error=forbidden");
  const { handoverId } = await params;
  const handover = await db.orderHandover.findFirst({
    where: { id: handoverId, assignedToId: user.id },
    include: {
      opportunity: {
        include: {
          customer: true,
          owner: true,
          documents: {
            include: {
              versions: {
                orderBy: { versionNo: "desc" },
                include: { uploadedBy: { select: { displayName: true } } },
              },
            },
            orderBy: [{ archivedAt: "asc" }, { category: "asc" }],
          },
        },
      },
      etaHistory: {
        include: { changedBy: { select: { displayName: true } } },
        orderBy: { changedAt: "desc" },
      },
    },
  });
  if (!handover) notFound();
  const checklistItems = await checklistForOpportunity(
    handover.opportunityId,
    handover.opportunity.track,
    user,
  );
  const documents = handover.opportunity.documents
    .filter((document) => canViewDocument(user, document))
    .map((document) => ({
      id: document.id,
      title: document.title,
      category: document.category,
      currentVersion: document.currentVersion,
      archivedAt: document.archivedAt?.toISOString() ?? null,
      archiveReason: document.archiveReason,
      canManage: canUploadDocumentCategory(user, document.category),
      canArchive: canArchiveDocument(
        user,
        document,
        handover.opportunity.stage,
      ),
      canRestore:
        user.permissions.includes(PERMISSIONS.SYSTEM_ADMIN) ||
        user.permissions.includes(PERMISSIONS.OPPORTUNITIES_MANAGE_ALL),
      versions: document.versions.map((version) => ({
        id: version.id,
        versionNo: version.versionNo,
        originalName: version.originalName,
        mimeType: version.mimeType,
        sizeBytes: version.sizeBytes.toString(),
        notes: version.notes,
        createdAt: version.createdAt.toISOString(),
        uploadedBy: version.uploadedBy,
      })),
    }));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-500">
        <Link href="/orders" className="hover:text-blue-700">
          Orders
        </Link>
        <i className="bi bi-chevron-right text-xs" />
        <span>{handover.opportunity.reference}</span>
      </div>
      <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#10233d] to-[#225da8] p-7 text-white shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-blue-200">
              Order Coordination handover
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight">
              {handover.opportunity.customer.name}
            </h1>
            <p className="mt-3 text-sm text-blue-100">
              {handover.opportunity.reference} · Sales owner{" "}
              {handover.opportunity.owner.displayName}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill value={handover.status} />
            <Link
              href={`/opportunities/${handover.opportunityId}?section=files`}
              className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-extrabold hover:bg-white/20"
            >
              <i className="bi bi-box-arrow-up-right mr-2" />
              Open opportunity
            </Link>
          </div>
        </div>
      </header>

      <section
        id="files"
        className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm md:p-6"
      >
        <div className="mb-5">
          <p className="text-xs font-black uppercase tracking-[.16em] text-blue-700">
            Complete package
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950">
            Preview, versions, replacement, and controlled archive
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Design files are read-only for Order Coordination. OC/AB and ERP PO files can
            be versioned from this workspace.
          </p>
        </div>
        <DocumentManager documents={documents} />
      </section>

      <ChecklistBoard
        opportunityId={handover.opportunityId}
        items={checklistItems}
      />

      <section
        id="eta"
        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"
      >
        <div className="mb-5">
          <p className="text-xs font-black uppercase tracking-[.16em] text-emerald-700">
            Order coordination
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950">
            OC/AB, Purchase Order, and ETA
          </h2>
        </div>
        <OrderHandoverForm
          handover={{
            id: handover.id,
            opportunityId: handover.opportunityId,
            status: handover.status,
            supplierReference: handover.supplierReference,
            erpPoNumber: handover.erpPoNumber,
            currentEta: formatOrderDateTimeLocal(handover.currentEta),
            notes: handover.notes,
          }}
        />
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-100 px-6 py-5">
          <p className="text-xs font-black uppercase tracking-[.16em] text-violet-700">
            History
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950">
            ETA changes
          </h2>
        </header>
        {handover.etaHistory.length ? (
          <div className="divide-y divide-slate-100">
            {handover.etaHistory.map((history) => (
              <article
                key={history.id}
                className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                  <i className="bi bi-calendar-event" />
                </span>
                <div className="min-w-0 flex-1">
                  <strong className="text-sm text-slate-950">
                    {formatOrderDateTime(history.newDate)}
                  </strong>
                  <p className="mt-1 text-xs text-slate-500">
                    {history.changedBy.displayName} ·{" "}
                    {history.reason ?? "Updated"}
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-400">
                  {formatDateTime(history.changedAt)}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <div className="p-14 text-center text-sm font-bold text-slate-500">
            <i className="bi bi-calendar-x mb-3 block text-4xl text-slate-300" />
            No ETA updates yet.
          </div>
        )}
      </section>
    </div>
  );
}
