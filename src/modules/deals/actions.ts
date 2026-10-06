"use server";

import Decimal from "decimal.js";
import { revalidatePath } from "next/cache";
import { DepositStatus, NotificationType, PricingStatus, type Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import {
  issueBusinessReference,
  REFERENCE_TYPE_CODES,
  trackCodeForOpportunityTrack,
} from "@/modules/crm/references";
import { confirmDeposit } from "@/modules/deals/confirm-deposit";
import { PERMISSIONS } from "@/modules/rbac/permissions";

export type DealActionState = { error?: string; success?: string };

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The transaction could not be completed.";
}

export async function recordFinanceInvoiceAction(_previousState: DealActionState, formData: FormData): Promise<DealActionState> {
  const user = await requireUser();
  if (!user.permissions.includes(PERMISSIONS.FINANCE_PRICING_PREPARE)) return { error: "Only Finance can record the invoice." };
  const opportunityId = String(formData.get("opportunityId") ?? "");
  const reference = String(formData.get("invoiceReference") ?? "").trim();
  const total = String(formData.get("invoiceTotal") ?? "").trim();
  const dateValue = String(formData.get("invoiceDate") ?? "");
  if (!opportunityId || !reference || !/^\d{1,15}(?:\.\d{1,2})?$/.test(total)) return { error: "Invoice reference and total are required." };
  const invoiceDate = dateValue && !Number.isNaN(Date.parse(dateValue)) ? new Date(dateValue) : new Date();
  const opportunity = await db.opportunity.findUnique({ where: { id: opportunityId }, include: { pricingCases: { where: { status: PricingStatus.APPROVED }, orderBy: { revision: "desc" }, take: 1 } } });
  if (!opportunity?.pricingCases[0]) return { error: "Approved pricing is required before the invoice." };
  await db.opportunity.update({ where: { id: opportunityId }, data: { financeInvoiceReference: reference, financeInvoiceDate: invoiceDate, financeInvoiceTotal: total } });
  await db.notification.create({ data: { recipientId: opportunity.ownerId, type: NotificationType.SYSTEM, title: "Finance invoice is ready", body: `${reference} · AED ${total}`, entityType: "Opportunity", entityId: opportunityId } });
  revalidatePath(`/opportunities/${opportunityId}`);
  return { success: "Invoice reference recorded and Sales notified." };
}

export async function submitDepositAction(_previousState: DealActionState, formData: FormData): Promise<DealActionState> {
  const user = await requireUser();
  const opportunityId = String(formData.get("opportunityId") ?? "");
  const amount = String(formData.get("amount") ?? "").trim();
  const paymentReference = String(formData.get("paymentReference") ?? "").trim();
  const paymentMethod = String(formData.get("paymentMethod") ?? "").trim();
  const receivedAt = String(formData.get("receivedAt") ?? "").trim();
  if (!opportunityId || !/^\d{1,15}(?:\.\d{1,2})?$/.test(amount)) return { error: "Enter the received deposit amount." };
  const opportunity = await db.opportunity.findUnique({ where: { id: opportunityId }, include: { pricingCases: { where: { status: PricingStatus.APPROVED }, orderBy: { revision: "desc" }, take: 1 }, deposits: { orderBy: { submittedAt: "desc" }, take: 1 } } });
  if (!opportunity || (opportunity.ownerId !== user.id && !user.permissions.includes(PERMISSIONS.OPPORTUNITIES_MANAGE_ALL))) return { error: "Only the Sales owner or Manager can submit the deposit." };
  const approvedPrice = opportunity.pricingCases[0]?.approvedSellingPrice;
  if (!approvedPrice) return { error: "Approved pricing is required." };
  if (!opportunity.financeInvoiceReference || !opportunity.financeInvoiceTotal) return { error: "Finance must record the invoice reference and total first." };
  const latest = opportunity.deposits[0];
  if (latest?.status === DepositStatus.CONFIRMED) return { error: "The deposit is already confirmed." };
  if (latest?.status === DepositStatus.SUBMITTED) return { error: "A deposit is already waiting for Finance confirmation." };
  const expected = new Decimal(opportunity.financeInvoiceTotal.toString()).mul("0.3");
  const receiptNotes = [paymentMethod ? `Payment method: ${paymentMethod}` : null, receivedAt ? `Received at: ${receivedAt}` : null].filter(Boolean).join(" | ");
  const externalPaymentReference = paymentReference || receiptNotes || null;

  const deposit = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const reference = await issueBusinessReference(tx, {
      trackCode: trackCodeForOpportunityTrack(opportunity.track),
      typeCode: REFERENCE_TYPE_CODES.PAYMENT,
      year: new Date().getFullYear(),
    });

    return tx.deposit.create({
      data: {
        reference,
        opportunityId,
        status: DepositStatus.SUBMITTED,
        expectedAmount: expected.toFixed(2),
        submittedAmount: amount,
        currency: "AED",
        paymentReference: externalPaymentReference,
        submittedById: user.id,
      },
    });
  });

  const financeUsers = await db.user.findMany({ where: { archivedAt: null, userRoles: { some: { role: { key: "FINANCE" } } } }, select: { id: true } });
  if (financeUsers.length) await db.notification.createMany({ data: financeUsers.map(({ id }) => ({ recipientId: id, type: NotificationType.APPROVAL_REQUIRED, title: `Deposit requires Finance confirmation · ${deposit.reference}`, body: `AED ${amount}`, entityType: "Opportunity", entityId: opportunityId })) });
  revalidatePath(`/opportunities/${opportunityId}`);
  return { success: `Deposit receipt ${deposit.reference ?? deposit.id.slice(0, 8).toUpperCase()} submitted to Finance for confirmation.` };
}

export async function confirmDepositAction(_previousState: DealActionState, formData: FormData): Promise<DealActionState> {
  const user = await requireUser();
  if (!user.permissions.includes(PERMISSIONS.DEPOSIT_CONFIRM)) return { error: "Only Finance can confirm deposits." };
  const depositId = String(formData.get("depositId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  try {
    const operationsUser = await db.user.findFirst({ where: { archivedAt: null, userRoles: { some: { role: { key: "ORDER_COORDINATOR" } } } }, orderBy: { displayName: "asc" } });
    if (!operationsUser) throw new Error("Operations / Order Coordinator user is not configured.");
    const result = await confirmDeposit({ depositId, financeUserId: user.id, financeUserName: user.displayName ?? user.email, orderCoordinatorUserId: operationsUser.id, reviewNotes: notes || undefined });
    revalidatePath(`/opportunities/${result.opportunityId}`);
    revalidatePath("/orders");
    return { success: result.alreadyConfirmed ? "Deposit was already confirmed." : "Deposit confirmed. Opportunity is Won and Operations handover was created." };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
