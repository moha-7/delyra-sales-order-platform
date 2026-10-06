"use server";

import { formatOrderDateTime, parseOrderDateTimeLocal } from "@/modules/orders/time";

import { revalidatePath } from "next/cache";
import {
  AuditAction,
  DepositStatus,
  HandoverStatus,
  NotificationType,
  OpportunityStage,
  PricingStatus,
  TaskPriority,
  type Prisma,
} from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { DESIGN_REQUIRED_CATEGORIES } from "@/modules/documents/options";
import {
  completeAutomationTask,
  dueInHours,
  recordOperationalEvent,
} from "@/modules/operations/events";
import { PERMISSIONS } from "@/modules/rbac/permissions";

export type OrderActionState = { error?: string; success?: string };

export async function updateOrderHandoverAction(
  _previousState: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const user = await requireUser();
  if (!user.permissions.includes(PERMISSIONS.ORDER_HANDOVER_MANAGE))
    return { error: "Order Coordination permission is required." };
  const handoverId = String(formData.get("handoverId") ?? "");
  const status = String(formData.get("status") ?? "") as HandoverStatus;
  const supplierReference = String(formData.get("supplierReference") ?? "").trim();
  const erpPoNumber = String(formData.get("erpPoNumber") ?? "").trim();
  const etaValue = String(formData.get("currentEta") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  if (!handoverId || !Object.values(HandoverStatus).includes(status))
    return { error: "Invalid handover update." };
  const handover = await db.orderHandover.findFirst({
    where: { id: handoverId, assignedToId: user.id },
    include: {
      opportunity: {
        include: {
          documents: {
            where: { archivedAt: null, currentVersion: { gt: 0 } },
            select: { category: true },
          },
          pricingCases: {
            where: { status: PricingStatus.APPROVED },
            orderBy: { revision: "desc" },
            take: 1,
          },
          deposits: { where: { status: DepositStatus.CONFIRMED }, take: 1 },
        },
      },
    },
  });
  if (!handover) return { error: "Handover not found or not assigned to you." };

  const orderingStatuses: HandoverStatus[] = [
    HandoverStatus.READY,
    HandoverStatus.SENT_TO_SUPPLIER,
    HandoverStatus.PO_PENDING,
    HandoverStatus.PO_CREATED,
    HandoverStatus.PO_SENT,
    HandoverStatus.ETA_ENTERED,
    HandoverStatus.COMPLETED,
  ];
  if (orderingStatuses.includes(status)) {
    const present = new Set(
      handover.opportunity.documents.map((document) => document.category),
    );
    const missing = DESIGN_REQUIRED_CATEGORIES.filter(
      (category) => !present.has(category),
    );
    if (handover.opportunity.stage !== OpportunityStage.WON)
      return { error: "The opportunity must be Won before ordering." };
    if (!handover.opportunity.pricingCases[0])
      return { error: "Approved pricing is required before ordering." };
    if (!handover.opportunity.deposits[0])
      return {
        error: "Finance-confirmed deposit is required before ordering.",
      };
    if (!handover.opportunity.financeInvoiceReference)
      return {
        error: "Finance invoice reference is required before ordering.",
      };
    if (missing.length)
      return { error: `design package is incomplete: ${missing.join(", ")}.` };
  }
  if (
    (status === HandoverStatus.PO_CREATED ||
      status === HandoverStatus.PO_SENT ||
      status === HandoverStatus.ETA_ENTERED ||
      status === HandoverStatus.COMPLETED) &&
    !erpPoNumber
  ) {
    return { error: "ERP PO number is required for this status." };
  }
  if (
    (status === HandoverStatus.ETA_ENTERED ||
      status === HandoverStatus.COMPLETED) &&
    !etaValue
  ) {
    return { error: "ETA is required for this status." };
  }
  const eta = etaValue ? parseOrderDateTimeLocal(etaValue) : null;
  if (etaValue && !eta) return { error: "Enter a valid ETA date and time." };
  const etaChanged = eta?.getTime() !== handover.currentEta?.getTime();

  // PORTFOLIO_NOOP_HANDOVER_GUARD
  const normalizedSupplierReference = supplierReference || null;
  const normalizedErpPoNumber = erpPoNumber || null;
  const normalizedNotes = notes || null;

  const handoverChanged =
    status !== handover.status ||
    normalizedSupplierReference !== handover.supplierReference ||
    normalizedErpPoNumber !== handover.erpPoNumber ||
    etaChanged ||
    normalizedNotes !== handover.notes;

  if (!handoverChanged) {
    return { success: "No changes to save." };
  }

  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.orderHandover.update({
      where: { id: handover.id },
      data: {
        status,
        supplierReference: supplierReference || null,
        erpPoNumber: erpPoNumber || null,
        currentEta: eta,
        notes: notes || null,
        sentToSupplierAt:
          status === HandoverStatus.SENT_TO_SUPPLIER && !handover.sentToSupplierAt
            ? new Date()
            : undefined,
        poDate: erpPoNumber && !handover.poDate ? new Date() : undefined,
        poSentAt:
          status === HandoverStatus.PO_SENT && !handover.poSentAt
            ? new Date()
            : undefined,
        completedAt: status === HandoverStatus.COMPLETED ? (handover.completedAt ?? new Date()) : null,
      },
    });
    if (etaChanged && eta) {
      await tx.eTAHistory.create({
        data: {
          handoverId: handover.id,
          oldDate: handover.currentEta,
          newDate: eta,
          changedById: user.id,
          reason: notes || "ETA updated",
        },
      });
    }

    const statusLabel = status.replaceAll("_", " ");
    const actionUrl = `/orders/${handover.id}?section=eta`;
    await recordOperationalEvent(tx, {
      actorId: user.id,
      actorName: user.displayName,
      action: etaChanged ? AuditAction.ETA_CHANGE : AuditAction.PO_UPDATE,
      entityType: "OrderHandover",
      entityId: handover.id,
      opportunityId: handover.opportunityId,
      actionUrl,
      subject: etaChanged
        ? "Order Coordination updated the delivery ETA"
        : `Order Coordination updated order handover: ${statusLabel}`,
      body:
        etaChanged && eta
          ? `${handover.currentEta?.toISOString() ?? "No previous ETA"} → ${eta.toISOString()}${notes ? ` · ${notes}` : ""}`
          : `${statusLabel}${supplierReference ? ` · OC/AB ${supplierReference}` : ""}${erpPoNumber ? ` · PO ${erpPoNumber}` : ""}`,
      before: {
        status: handover.status,
        supplierReference: handover.supplierReference,
        erpPoNumber: handover.erpPoNumber,
        eta: handover.currentEta?.toISOString() ?? null,
      },
      after: {
        status,
        supplierReference: supplierReference || null,
        erpPoNumber: erpPoNumber || null,
        eta: eta?.toISOString() ?? null,
        notes: notes || null,
      },
      notifications: [
        {
          recipientId: handover.opportunity.ownerId,
          type: etaChanged
            ? NotificationType.ETA_CHANGED
            : NotificationType.SYSTEM,
          title: etaChanged
            ? "Supplier ETA updated"
            : "Order Coordination order handover updated",
          body:
            etaChanged && eta
              ? `New ETA: ${formatOrderDateTime(eta)}`
              : statusLabel,
          href: actionUrl,
          actionLabel: "Open order",
        },
      ],
    });

    if (status === HandoverStatus.COMPLETED) {
      await completeAutomationTask(
        tx,
        `order-handover:${handover.opportunityId}`,
      );
    } else if (etaChanged && eta) {
      await recordOperationalEvent(tx, {
        actorId: user.id,
        actorName: user.displayName,
        action: AuditAction.CREATE,
        entityType: "Task",
        entityId: handover.id,
        opportunityId: handover.opportunityId,
        subject: "Customer delivery follow-up scheduled",
        body: "Sales should update the customer after the ETA change.",
        actionUrl: `/opportunities/${handover.opportunityId}?section=tasks`,
        task: {
          automationKey: `eta-follow-up:${handover.opportunityId}`,
          title: "Update customer about revised ETA",
          description: `Order Coordination changed ETA to ${formatOrderDateTime(eta)}. Confirm the delivery update with the customer.`,
          assignedToId: handover.opportunity.ownerId,
          dueAt: dueInHours(24),
          priority: TaskPriority.HIGH,
          sectionKey: "tasks",
          actionUrl: `/opportunities/${handover.opportunityId}?section=tasks`,
          autoCreated: true,
        },
      });
    }
  });
  revalidatePath(`/orders/${handover.id}`);
  revalidatePath("/orders");
  revalidatePath(`/orders/${handover.id}`);
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath("/notifications");
  revalidatePath(`/opportunities/${handover.opportunityId}`);
  return { success: "Order handover updated." };
}
