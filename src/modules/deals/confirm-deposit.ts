import Decimal from "decimal.js";
import { AuditAction, DepositStatus, HandoverStatus, NotificationType, OpportunityStage, PricingStatus, TaskPriority, type Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { completeAutomationTask, dueInHours, recordOperationalEvent } from "@/modules/operations/events";

type ConfirmDepositInput = { depositId: string; financeUserId: string; financeUserName: string; orderCoordinatorUserId: string; reviewNotes?: string };

export async function confirmDeposit(input: ConfirmDepositInput) {
  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    const deposit = await tx.deposit.findUniqueOrThrow({ where: { id: input.depositId }, include: { opportunity: { select: { id: true, reference: true, stage: true, pricingCases: { where: { status: PricingStatus.APPROVED }, orderBy: { revision: "desc" }, take: 1, select: { approvedSellingPrice: true } }, ownerId: true, financeInvoiceReference: true, financeInvoiceTotal: true, handover: { select: { id: true } } } } } });
    if (deposit.status === DepositStatus.CONFIRMED && deposit.opportunity.stage === OpportunityStage.WON) return { alreadyConfirmed: true, opportunityId: deposit.opportunityId };
    const wonValue = deposit.opportunity.pricingCases[0]?.approvedSellingPrice;
    if (!wonValue) throw new Error("An approved pricing case is required before deposit confirmation.");
    if (!deposit.opportunity.financeInvoiceReference || !deposit.opportunity.financeInvoiceTotal) throw new Error("Finance invoice reference and total are required before deposit confirmation.");
    const expectedDeposit = new Decimal(deposit.opportunity.financeInvoiceTotal.toString()).mul("0.3");
    if (new Decimal(deposit.submittedAmount.toString()).lessThan(expectedDeposit)) throw new Error(`The confirmed deposit must be at least 30% (${expectedDeposit.toFixed(2)} AED).`);
    const now = new Date();
    await tx.deposit.update({ where: { id: deposit.id }, data: { status: DepositStatus.CONFIRMED, reviewedById: input.financeUserId, reviewedAt: now, reviewNotes: input.reviewNotes } });
    await tx.opportunity.update({ where: { id: deposit.opportunityId }, data: { stage: OpportunityStage.WON, wonAt: now, wonValue, version: { increment: 1 } } });
    let handoverId = deposit.opportunity.handover?.id;
    if (!handoverId) {
      const handover = await tx.orderHandover.create({ data: { opportunityId: deposit.opportunityId, assignedToId: input.orderCoordinatorUserId, status: HandoverStatus.PACKAGE_RECEIVED } });
      handoverId = handover.id;
    }
    await completeAutomationTask(tx, `confirm-deposit:${deposit.opportunityId}`);
    await recordOperationalEvent(tx, {
      actorId: input.financeUserId, actorName: input.financeUserName, action: AuditAction.DEPOSIT_CONFIRM,
      entityType: "Deposit", entityId: deposit.id, opportunityId: deposit.opportunityId,
      actionUrl: `/opportunities/${deposit.opportunityId}?section=deposit`,
      subject: `Deposit confirmed — ${deposit.reference ?? "receipt"} marked Won`,
      body: `Confirmed ${deposit.reference ?? "deposit"} · AED ${deposit.submittedAmount.toString()} · Won value AED ${wonValue.toString()}`,
      before: { stage: deposit.opportunity.stage, depositStatus: deposit.status },
      after: { stage: OpportunityStage.WON, depositStatus: DepositStatus.CONFIRMED, wonAt: now.toISOString(), wonValue: wonValue.toString() },
      metadata: { depositReference: deposit.reference ?? null, financeInvoiceReference: deposit.opportunity.financeInvoiceReference, reviewNotes: input.reviewNotes ?? null },
      notifications: [
        { recipientId: deposit.opportunity.ownerId, type: NotificationType.DEPOSIT_CONFIRMED, title: `Won · ${deposit.opportunity.reference}`, body: `Finance confirmed the deposit. The opportunity is now Won.`, href: `/opportunities/${deposit.opportunityId}?section=deposit`, actionLabel: "Open opportunity" },
        { recipientId: input.orderCoordinatorUserId, type: NotificationType.ASSIGNMENT, title: `New Won handover · ${deposit.opportunity.reference}`, body: "Review the package and continue the Supplier ordering workflow.", href: `/orders/${handoverId}`, actionLabel: "Open handover" },
      ],
      task: { automationKey: `order-handover:${deposit.opportunityId}`, title: `Review Won package · ${deposit.opportunity.reference}`, description: "Validate Design files, checklist, invoice and deposit before sending the order to Supplier.", assignedToId: input.orderCoordinatorUserId, dueAt: dueInHours(24), priority: TaskPriority.URGENT, sectionKey: "files", actionUrl: `/orders/${handoverId}`, metadata: { workflow: "ORDER_HANDOVER", handoverId } },
    });
    await tx.auditLog.create({ data: { actorId: input.financeUserId, action: AuditAction.WON_CONVERSION, entityType: "Opportunity", entityId: deposit.opportunityId, opportunityId: deposit.opportunityId, actionUrl: `/opportunities/${deposit.opportunityId}`, before: { stage: deposit.opportunity.stage }, after: { stage: OpportunityStage.WON, wonAt: now.toISOString() } } });
    return { alreadyConfirmed: false, opportunityId: deposit.opportunityId };
  });
}
