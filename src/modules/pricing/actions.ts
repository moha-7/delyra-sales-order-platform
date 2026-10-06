"use server";

import Decimal from "decimal.js";
import { revalidatePath } from "next/cache";
import {
  ActivityType,
  ApprovalStatus,
  ApprovalType,
  AuditAction,
  DocumentCategory,
  NotificationType,
  OpportunityStage,
  OpportunityTrack,
  PricingCaseType,
  PricingLineCategory,
  PricingStatus,
  RoleKey,
  type Prisma,
} from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { opportunityViewWhere } from "@/modules/crm/access";
import {
  canApprovePricingAsManager,
  canPrepareFinancePricing,
  canPrepareProjectPricing,
} from "@/modules/pricing/access";
import {
  calculateRetailFinancePricing,
  DEFAULT_FINANCE_CONVERSION_RATE,
} from "@/modules/pricing/retail-pricing";
import {
  managerDecisionSchema,
  managerRetailDecisionSchema,
  pricingCaseIdSchema,
  projectPricingSchema,
  retailFinancePricingSchema,
} from "@/modules/pricing/schemas";
import { getApprovalWorkflowSettings, getRetailPricingDefaults } from "@/modules/settings/workflow";

export type PricingActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

function value(formData: FormData, key: string): FormDataEntryValue | undefined {
  const entry = formData.get(key);
  return entry === null ? undefined : entry;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The pricing request could not be completed.";
}

function earlyStage(stage: OpportunityStage): boolean {
  return (
    stage === OpportunityStage.NEW_ENQUIRY ||
    stage === OpportunityStage.CONTACTED ||
    stage === OpportunityStage.QUALIFIED ||
    stage === OpportunityStage.PREPARATION
  );
}

async function accessibleOpportunity(opportunityId: string, user: Awaited<ReturnType<typeof requireUser>>) {
  return db.opportunity.findFirst({
    where: { AND: [{ id: opportunityId, archivedAt: null }, opportunityViewWhere(user)] },
    include: { designPackage: true },
  });
}

async function latestCase(opportunityId: string, type: PricingCaseType) {
  return db.pricingCase.findFirst({
    where: { opportunityId, type, status: { not: PricingStatus.SUPERSEDED } },
    include: { lines: { orderBy: { sortOrder: "asc" } } },
    orderBy: { revision: "desc" },
  });
}

async function managerRecipients() {
  return db.user.findMany({
    where: {
      archivedAt: null,
      userRoles: { some: { role: { key: RoleKey.MANAGER } } },
    },
    select: { id: true },
  });
}

async function ownerRecipient(opportunityId: string) {
  return db.opportunity.findUnique({
    where: { id: opportunityId },
    select: { ownerId: true },
  });
}

function lineAmount(lines: Array<{ description: string; costAed: { toString(): string } | null }>, description: string) {
  return lines.find((line) => line.description === description)?.costAed?.toString() ?? "0";
}

function lineSellingAmount(lines: Array<{ description: string; costAed: { toString(): string } | null; sellingPriceAed: { toString(): string } | null }>, description: string) {
  const line = lines.find((item) => item.description === description);
  return line?.sellingPriceAed?.toString() ?? line?.costAed?.toString() ?? "0";
}

function lineMetaString(lines: Array<{ description: string; metadata: unknown }>, description: string, key: string, fallback: string) {
  const metadata = lines.find((line) => line.description === description)?.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return fallback;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : fallback;
}

export async function saveRetailFinancePricingAction(
  _previousState: PricingActionState,
  formData: FormData,
): Promise<PricingActionState> {
  const user = await requireUser();
  if (!canPrepareFinancePricing(user)) return { error: "Only Finance can prepare Retail pricing." };

  const parsed = retailFinancePricingSchema.safeParse({
    opportunityId: value(formData, "opportunityId"),
    conversionRate: value(formData, "conversionRate"),
    kitchenSellingRate: value(formData, "kitchenSellingRate"),
    hlpSellingRate: value(formData, "hlpSellingRate"),
    applianceCostAed: value(formData, "applianceCostAed"),
    worktopCostAed: value(formData, "worktopCostAed"),
    worktopSellingPriceAed: value(formData, "worktopSellingPriceAed"),
    freightAed: value(formData, "freightAed"),
    clearanceAed: value(formData, "clearanceAed"),
    otherCostAed: value(formData, "otherCostAed"),
    otherSellingPriceAed: value(formData, "otherSellingPriceAed"),
    financeNotes: value(formData, "financeNotes"),
    sellingRateOverrideReason: value(formData, "sellingRateOverrideReason"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    const opportunity = await accessibleOpportunity(parsed.data.opportunityId, user);
    if (!opportunity || opportunity.track !== OpportunityTrack.RETAIL) throw new Error("Retail opportunity not found.");
    const design = opportunity.designPackage;
    if (!design?.designFurnitureEur || !design.designReference) {
      throw new Error("Designer must submit Design values and reference before Finance pricing.");
    }

    const existing = await latestCase(opportunity.id, PricingCaseType.RETAIL);
    if (existing?.status === PricingStatus.MANAGER_APPROVAL) throw new Error("Pricing is waiting for Branch Manager approval.");
    const defaults = await getRetailPricingDefaults();
    const existingDiscountPercent = existing?.companyMarkupPct?.toString() ?? "0";
    const existingDiscountReason = existing?.overrideReason ?? undefined;
    const result = calculateRetailFinancePricing({
      designFurnitureEur: design.designFurnitureEur.toString(),
      designAuxiliaryEur: design.designAuxiliaryEur?.toString() ?? "0",
      conversionRate: parsed.data.conversionRate ?? defaults.defaultCostingRateEurAed,
      kitchenSellingRate: parsed.data.kitchenSellingRate ?? defaults.kitchenSellingRate,
      hlpSellingRate: parsed.data.hlpSellingRate ?? defaults.hlpSellingRate,
      applianceCostAed: parsed.data.applianceCostAed,
      worktopCostAed: parsed.data.worktopCostAed,
      worktopSellingPriceAed: parsed.data.worktopSellingPriceAed,
      freightAed: parsed.data.freightAed,
      clearanceAed: parsed.data.clearanceAed,
      otherCostAed: parsed.data.otherCostAed,
      otherSellingPriceAed: parsed.data.otherSellingPriceAed,
      managerDiscountPercent: existingDiscountPercent,
      managerDiscountReason: existingDiscountReason,
    }, {
      eurCostRate: parsed.data.conversionRate ?? defaults.defaultCostingRateEurAed,
      kitchenSellingRate: parsed.data.kitchenSellingRate ?? defaults.kitchenSellingRate,
      hlpSellingRate: parsed.data.hlpSellingRate ?? defaults.hlpSellingRate,
      kitchenDiscountCascadePct: defaults.kitchenDiscountCascadePct,
      hlpDiscountPct: defaults.hlpDiscountPct,
      applianceMarkupPct: defaults.defaultAppliancesMarkupPct,
      customsPct: defaults.customsPct,
      defaultClearanceAed: defaults.defaultClearanceAed,
    });

    const pricingCase = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      let current = existing;
      if (current?.status === PricingStatus.APPROVED) {
        current = await tx.pricingCase.create({
          data: {
            opportunityId: opportunity.id,
            type: PricingCaseType.RETAIL,
            status: PricingStatus.DRAFT,
            revision: current.revision + 1,
            sourceCurrency: "EUR",
            sellingCurrency: "AED",
            createdById: user.id,
            preparedById: user.id,
          },
          include: { lines: true },
        });
      }

      const saved = current
        ? await tx.pricingCase.update({
            where: { id: current.id },
            data: {
              status: PricingStatus.DRAFT,
              exchangeRate: result.conversionRate,
              sellingRate: result.appliedKitchenSellingRate,
              companyMarkupPct: result.companyMarkupPct,
              priceBeforeDiscount: result.priceBeforeDiscountAed,
              customerDiscountAed: result.customerDiscountAed,
              formulaVersion: result.formulaVersion,
              estimatedCost: result.totalCostAed,
              approvedSellingPrice: result.finalSellingPriceAed,
              grossProfit: result.grossProfitAed,
              grossMarginPct: result.grossMarginPct,
              financeNotes: parsed.data.financeNotes,
              overrideReason: parsed.data.sellingRateOverrideReason,
              preparedById: user.id,
              financeConfirmedAt: null,
              managerApprovedAt: null,
            },
          })
        : await tx.pricingCase.create({
            data: {
              opportunityId: opportunity.id,
              type: PricingCaseType.RETAIL,
              status: PricingStatus.DRAFT,
              revision: 1,
              sourceCurrency: "EUR",
              sellingCurrency: "AED",
              exchangeRate: result.conversionRate,
              sellingRate: result.appliedKitchenSellingRate,
              companyMarkupPct: result.companyMarkupPct,
              priceBeforeDiscount: result.priceBeforeDiscountAed,
              customerDiscountAed: result.customerDiscountAed,
              formulaVersion: result.formulaVersion,
              estimatedCost: result.totalCostAed,
              approvedSellingPrice: result.finalSellingPriceAed,
              grossProfit: result.grossProfitAed,
              grossMarginPct: result.grossMarginPct,
              financeNotes: parsed.data.financeNotes,
              overrideReason: parsed.data.sellingRateOverrideReason,
              createdById: user.id,
              preparedById: user.id,
            },
          });

      await tx.pricingLine.deleteMany({ where: { pricingCaseId: saved.id } });
      await tx.pricingLine.createMany({
        data: [
          { pricingCaseId: saved.id, category: PricingLineCategory.DESIGN_FURNITURE, description: "Design Furniture EUR", supplierUnitPrice: design.designFurnitureEur, supplierCurrency: "EUR", appliedRate: result.conversionRate, costAed: result.materialCostAed, sellingPriceAed: result.sellingKitchenAed, sortOrder: 10, metadata: { supplierPointFactorReference: design.supplierPointFactor?.toString() ?? "6.75", netKitchenEur: result.netKitchenEur, appliedKitchenSellingRate: result.appliedKitchenSellingRate, discountCascade: defaults.kitchenDiscountCascadePct } },
          { pricingCaseId: saved.id, category: PricingLineCategory.TRADE_GOODS, description: "Design HLP EUR", supplierUnitPrice: design.designAuxiliaryEur ?? 0, supplierCurrency: "EUR", appliedRate: result.conversionRate, costAed: "0", sellingPriceAed: result.sellingHlpAed, sortOrder: 20, metadata: { netHlpEur: result.netHlpEur, appliedHlpSellingRate: result.appliedHlpSellingRate, hlpDiscountPct: defaults.hlpDiscountPct } },
          { pricingCaseId: saved.id, category: PricingLineCategory.APPLIANCE, description: "Appliances cost", costAed: result.applianceCostAed, sellingPriceAed: result.sellingAppliancesAed, isManual: true, sortOrder: 30, metadata: { markupPct: defaults.defaultAppliancesMarkupPct } },
          { pricingCaseId: saved.id, category: PricingLineCategory.WORKTOP, description: "Worktop cost", costAed: result.worktopCostAed, sellingPriceAed: result.sellingWorktopAed, isManual: true, sortOrder: 40 },
          { pricingCaseId: saved.id, category: PricingLineCategory.FREIGHT, description: "Freight", costAed: result.freightAed, isManual: true, sortOrder: 50 },
          { pricingCaseId: saved.id, category: PricingLineCategory.CUSTOMS, description: "Customs", costAed: result.customsAed, isManual: false, sortOrder: 60, metadata: { calculatedFrom: "Supplier material cost + freight", customsPct: defaults.customsPct } },
          { pricingCaseId: saved.id, category: PricingLineCategory.CLEARANCE, description: "Clearance", costAed: result.clearanceAed, isManual: true, sortOrder: 70 },
          { pricingCaseId: saved.id, category: PricingLineCategory.OTHER, description: "Other cost", costAed: result.otherCostAed, sellingPriceAed: result.sellingOtherAed, isManual: true, sortOrder: 80 },
          { pricingCaseId: saved.id, category: PricingLineCategory.OTHER, description: "Manager customer discount", sellingPriceAed: new Decimal(result.customerDiscountAed).negated().toFixed(2), isManual: true, sortOrder: 90, metadata: { kind: "CUSTOMER_DISCOUNT", percent: result.managerDiscountPercent, reason: result.managerDiscountReason ?? null } },
        ],
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: AuditAction.UPDATE,
          entityType: "PricingCase",
          entityId: saved.id,
          after: JSON.parse(JSON.stringify({
            type: "RETAIL",
            conversionRate: result.conversionRate,
            totalCostAed: result.totalCostAed,
            sellingBeforeDiscountAed: result.priceBeforeDiscountAed,
            pricingSnapshot: result.snapshot,
          })) as Prisma.InputJsonValue,
        },
      });
      return saved;
    });

    revalidatePath(`/opportunities/${opportunity.id}`);
    revalidatePath("/pricing");
    return { success: `Finance pricing draft saved (revision ${pricingCase.revision}).` };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function submitRetailFinancePricingAction(
  _previousState: PricingActionState,
  formData: FormData,
): Promise<PricingActionState> {
  const user = await requireUser();
  if (!canPrepareFinancePricing(user)) return { error: "Only Finance can submit pricing." };
  const parsed = pricingCaseIdSchema.safeParse({ pricingCaseId: value(formData, "pricingCaseId"), notes: value(formData, "notes") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    const pricingCase = await db.pricingCase.findUnique({ where: { id: parsed.data.pricingCaseId }, include: { opportunity: true } });
    if (!pricingCase || pricingCase.type !== PricingCaseType.RETAIL) throw new Error("Retail pricing not found.");
    if (pricingCase.status !== PricingStatus.DRAFT && pricingCase.status !== PricingStatus.CHANGES_REQUESTED) throw new Error("Pricing is not editable.");
    if (!pricingCase.approvedSellingPrice || new Decimal(pricingCase.approvedSellingPrice.toString()).lte(0)) throw new Error("A positive proposed selling price is required.");
    const approvedSellingPriceAed = pricingCase.approvedSellingPrice.toString();

    const workflow = await getApprovalWorkflowSettings();
    if (!workflow.managerFinalApprovalRequired) {
      const owner = await ownerRecipient(pricingCase.opportunityId);
      await db.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.pricingCase.update({ where: { id: pricingCase.id }, data: { status: PricingStatus.APPROVED, financeConfirmedAt: new Date(), managerApprovedAt: null, financeNotes: parsed.data.notes ?? pricingCase.financeNotes } });
        if (earlyStage(pricingCase.opportunity.stage)) await tx.opportunity.update({ where: { id: pricingCase.opportunityId }, data: { stage: OpportunityStage.QUOTATION } });
        if (owner) await tx.notification.create({ data: { recipientId: owner.ownerId, type: NotificationType.SYSTEM, title: "Pricing approved by Finance workflow", body: `AED ${approvedSellingPriceAed} pre-VAT`, entityType: "Opportunity", entityId: pricingCase.opportunityId } });
        await tx.auditLog.create({ data: { actorId: user.id, action: AuditAction.FINANCE_CONFIRM, entityType: "PricingCase", entityId: pricingCase.id, after: { status: "APPROVED", managerApprovalSkippedBySetting: true } } });
      });
      revalidatePath(`/opportunities/${pricingCase.opportunityId}`);
      revalidatePath("/pricing");
      return { success: "Retail pricing approved under the configured Finance workflow." };
    }

    const recipients = await managerRecipients();
    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.pricingCase.update({ where: { id: pricingCase.id }, data: { status: PricingStatus.MANAGER_APPROVAL, financeConfirmedAt: new Date(), financeNotes: parsed.data.notes ?? pricingCase.financeNotes } });
      await tx.approval.create({ data: { type: ApprovalType.RETAIL_EXCEPTION, status: ApprovalStatus.PENDING, opportunityId: pricingCase.opportunityId, pricingCaseId: pricingCase.id, requestedById: user.id, requestReason: "Final Retail pricing approval" } });
      if (recipients.length) await tx.notification.createMany({ data: recipients.map(({ id }) => ({ recipientId: id, type: NotificationType.APPROVAL_REQUIRED, title: "Retail pricing requires manager approval", body: pricingCase.opportunity.reference, entityType: "PricingCase", entityId: pricingCase.id })) });
      await tx.auditLog.create({ data: { actorId: user.id, action: AuditAction.FINANCE_CONFIRM, entityType: "PricingCase", entityId: pricingCase.id, after: { status: "MANAGER_APPROVAL" } } });
    });
    revalidatePath(`/opportunities/${pricingCase.opportunityId}`);
    revalidatePath("/pricing");
    return { success: "Pricing sent to Branch Manager for final approval." };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function managerDecisionRetailAction(
  _previousState: PricingActionState,
  formData: FormData,
): Promise<PricingActionState> {
  const user = await requireUser();
  if (!canApprovePricingAsManager(user)) return { error: "Only Branch Manager can decide final pricing." };
  const parsed = managerRetailDecisionSchema.safeParse({
    pricingCaseId: value(formData, "pricingCaseId"),
    decision: value(formData, "decision"),
    managerDiscountPercent: value(formData, "managerDiscountPercent"),
    notes: value(formData, "notes"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    const pricingCase = await db.pricingCase.findUnique({ where: { id: parsed.data.pricingCaseId }, include: { opportunity: { include: { designPackage: true } }, lines: true } });
    if (!pricingCase || pricingCase.type !== PricingCaseType.RETAIL || pricingCase.status !== PricingStatus.MANAGER_APPROVAL) throw new Error("Retail pricing is not awaiting manager approval.");

    if (parsed.data.decision === "RETURN") {
      await db.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.pricingCase.update({ where: { id: pricingCase.id }, data: { status: PricingStatus.CHANGES_REQUESTED, overrideReason: parsed.data.notes ?? "Returned by Branch Manager" } });
        await tx.approval.updateMany({ where: { pricingCaseId: pricingCase.id, status: ApprovalStatus.PENDING }, data: { status: ApprovalStatus.REJECTED, decidedById: user.id, decidedAt: new Date(), decisionNotes: parsed.data.notes } });
        await tx.auditLog.create({ data: { actorId: user.id, action: AuditAction.REJECT, entityType: "PricingCase", entityId: pricingCase.id, after: { status: "CHANGES_REQUESTED", notes: parsed.data.notes } } });
      });
      revalidatePath(`/opportunities/${pricingCase.opportunityId}`);
      revalidatePath("/pricing");
      return { success: "Pricing returned to Finance." };
    }

    const design = pricingCase.opportunity.designPackage;
    if (!design?.designFurnitureEur) throw new Error("Design values are missing.");
    const result = calculateRetailFinancePricing({
      designFurnitureEur: design.designFurnitureEur.toString(),
      designAuxiliaryEur: design.designAuxiliaryEur?.toString() ?? "0",
      conversionRate: pricingCase.exchangeRate?.toString() ?? DEFAULT_FINANCE_CONVERSION_RATE.toString(),
      applianceCostAed: lineAmount(pricingCase.lines, "Appliances cost"),
      worktopCostAed: lineAmount(pricingCase.lines, "Worktop cost"),
      freightAed: lineAmount(pricingCase.lines, "Freight"),
      clearanceAed: lineAmount(pricingCase.lines, "Clearance"),
      otherCostAed: lineAmount(pricingCase.lines, "Other cost"),
      otherSellingPriceAed: lineSellingAmount(pricingCase.lines, "Other cost"),
      worktopSellingPriceAed: lineSellingAmount(pricingCase.lines, "Worktop cost"),
      kitchenSellingRate: pricingCase.sellingRate?.toString() ?? lineMetaString(pricingCase.lines, "Design Furniture EUR", "appliedKitchenSellingRate", "6.75"),
      hlpSellingRate: lineMetaString(pricingCase.lines, "Design HLP EUR", "appliedHlpSellingRate", "6.25"),
      managerDiscountPercent: parsed.data.managerDiscountPercent,
      managerDiscountReason: parsed.data.notes,
    });

    const owner = await ownerRecipient(pricingCase.opportunityId);
    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.pricingCase.update({
        where: { id: pricingCase.id },
        data: { status: PricingStatus.APPROVED, companyMarkupPct: result.managerDiscountPercent, customerDiscountAed: result.customerDiscountAed, approvedSellingPrice: result.finalSellingPriceAed, grossProfit: result.grossProfitAed, grossMarginPct: result.grossMarginPct, managerApprovedAt: new Date(), overrideReason: parsed.data.notes },
      });
      await tx.pricingLine.updateMany({ where: { pricingCaseId: pricingCase.id, description: "Manager customer discount" }, data: { sellingPriceAed: new Decimal(result.customerDiscountAed).negated().toFixed(2), metadata: { kind: "CUSTOMER_DISCOUNT", percent: result.managerDiscountPercent, reason: parsed.data.notes ?? null } } });
      await tx.approval.updateMany({ where: { pricingCaseId: pricingCase.id, status: ApprovalStatus.PENDING }, data: { status: ApprovalStatus.APPROVED, decidedById: user.id, decidedAt: new Date(), decisionNotes: parsed.data.notes } });
      if (earlyStage(pricingCase.opportunity.stage)) await tx.opportunity.update({ where: { id: pricingCase.opportunityId }, data: { stage: OpportunityStage.QUOTATION } });
      if (owner) await tx.notification.create({ data: { recipientId: owner.ownerId, type: NotificationType.SYSTEM, title: "Pricing approved", body: `AED ${result.finalSellingPriceAed} pre-VAT`, entityType: "Opportunity", entityId: pricingCase.opportunityId } });
      await tx.activity.create({ data: { type: ActivityType.SYSTEM, subject: "Final pricing approved by Branch Manager", body: `AED ${result.finalSellingPriceAed} pre-VAT`, opportunityId: pricingCase.opportunityId, createdById: user.id } });
      await tx.auditLog.create({ data: { actorId: user.id, action: AuditAction.APPROVE, entityType: "PricingCase", entityId: pricingCase.id, after: { status: "APPROVED", discountAed: result.customerDiscountAed, finalSellingPriceAed: result.finalSellingPriceAed } } });
    });
    revalidatePath(`/opportunities/${pricingCase.opportunityId}`);
    revalidatePath("/pricing");
    return { success: "Retail pricing approved and locked." };
  } catch (error) { return { error: errorMessage(error) }; }
}

export async function saveProjectPricingAction(
  _previousState: PricingActionState,
  formData: FormData,
): Promise<PricingActionState> {
  const user = await requireUser();
  if (!canPrepareProjectPricing(user)) return { error: "Only Finance can prepare Project pricing." };
  const parsed = projectPricingSchema.safeParse({ opportunityId: value(formData, "opportunityId"), totalCostAed: value(formData, "totalCostAed"), proposedSellingPriceAed: value(formData, "proposedSellingPriceAed"), notes: value(formData, "notes") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const opportunity = await accessibleOpportunity(parsed.data.opportunityId, user);
    if (!opportunity || opportunity.track !== OpportunityTrack.PROJECT) throw new Error("Project opportunity not found.");
    const selling = new Decimal(parsed.data.proposedSellingPriceAed);
    const cost = new Decimal(parsed.data.totalCostAed);
    if (selling.lte(0)) throw new Error("Proposed selling price must be positive.");
    const profit = selling.minus(cost);
    const margin = selling.isZero() ? new Decimal(0) : profit.div(selling).mul(100);
    const existing = await latestCase(opportunity.id, PricingCaseType.PROJECT);
    const saved = existing && existing.status !== PricingStatus.APPROVED
      ? await db.pricingCase.update({ where: { id: existing.id }, data: { status: PricingStatus.DRAFT, estimatedCost: cost.toFixed(2), priceBeforeDiscount: selling.toFixed(2), approvedSellingPrice: selling.toFixed(2), grossProfit: profit.toFixed(2), grossMarginPct: margin.toFixed(4), sourceEvidenceNotes: parsed.data.notes, preparedById: user.id, financeConfirmedAt: null, managerApprovedAt: null } })
      : await db.pricingCase.create({ data: { opportunityId: opportunity.id, type: PricingCaseType.PROJECT, status: PricingStatus.DRAFT, revision: (existing?.revision ?? 0) + 1, sellingCurrency: "AED", estimatedCost: cost.toFixed(2), priceBeforeDiscount: selling.toFixed(2), approvedSellingPrice: selling.toFixed(2), grossProfit: profit.toFixed(2), grossMarginPct: margin.toFixed(4), sourceEvidenceNotes: parsed.data.notes, createdById: user.id, preparedById: user.id } });
    revalidatePath(`/opportunities/${opportunity.id}`);
    revalidatePath("/pricing");
    return { success: `Project pricing summary saved (revision ${saved.revision}).` };
  } catch (error) { return { error: errorMessage(error) }; }
}

export async function submitProjectPricingAction(
  _previousState: PricingActionState,
  formData: FormData,
): Promise<PricingActionState> {
  const user = await requireUser();
  if (!canPrepareProjectPricing(user)) return { error: "Only Finance can submit Project pricing." };
  const parsed = pricingCaseIdSchema.safeParse({ pricingCaseId: value(formData, "pricingCaseId"), notes: value(formData, "notes") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const pricingCase = await db.pricingCase.findUnique({ where: { id: parsed.data.pricingCaseId }, include: { opportunity: true } });
    if (!pricingCase || pricingCase.type !== PricingCaseType.PROJECT) throw new Error("Project pricing not found.");
    if (pricingCase.status !== PricingStatus.DRAFT && pricingCase.status !== PricingStatus.CHANGES_REQUESTED) throw new Error("Project pricing is not editable.");
    const costing = await db.document.findFirst({ where: { opportunityId: pricingCase.opportunityId, category: DocumentCategory.PROJECT_COSTING, archivedAt: null, currentVersion: { gt: 0 } } });
    if (!costing) throw new Error("Upload the Project Costing Excel before submission.");

    const workflow = await getApprovalWorkflowSettings();
    if (!workflow.managerFinalApprovalRequired) {
      await db.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.pricingCase.update({ where: { id: pricingCase.id }, data: { status: PricingStatus.APPROVED, financeConfirmedAt: new Date(), sourceEvidenceNotes: parsed.data.notes ?? pricingCase.sourceEvidenceNotes } });
        if (earlyStage(pricingCase.opportunity.stage)) await tx.opportunity.update({ where: { id: pricingCase.opportunityId }, data: { stage: OpportunityStage.QUOTATION } });
        await tx.auditLog.create({ data: { actorId: user.id, action: AuditAction.FINANCE_CONFIRM, entityType: "PricingCase", entityId: pricingCase.id, after: { status: "APPROVED", managerApprovalSkippedBySetting: true } } });
      });
      revalidatePath(`/opportunities/${pricingCase.opportunityId}`);
      revalidatePath("/pricing");
      return { success: "Project pricing approved under the configured Finance workflow." };
    }

    const recipients = await managerRecipients();
    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.pricingCase.update({ where: { id: pricingCase.id }, data: { status: PricingStatus.MANAGER_APPROVAL, financeConfirmedAt: new Date(), sourceEvidenceNotes: parsed.data.notes ?? pricingCase.sourceEvidenceNotes } });
      await tx.approval.create({ data: { type: ApprovalType.PROJECT_FINAL_PRICE, status: ApprovalStatus.PENDING, opportunityId: pricingCase.opportunityId, pricingCaseId: pricingCase.id, requestedById: user.id, requestReason: "Project final price approval" } });
      if (recipients.length) await tx.notification.createMany({ data: recipients.map(({ id }) => ({ recipientId: id, type: NotificationType.APPROVAL_REQUIRED, title: "Project pricing requires manager approval", body: pricingCase.opportunity.reference, entityType: "PricingCase", entityId: pricingCase.id })) });
    });
    revalidatePath(`/opportunities/${pricingCase.opportunityId}`);
    revalidatePath("/pricing");
    return { success: "Project pricing sent to Branch Manager." };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function managerDecisionProjectAction(
  _previousState: PricingActionState,
  formData: FormData,
): Promise<PricingActionState> {
  const user = await requireUser();
  if (!canApprovePricingAsManager(user)) return { error: "Only Branch Manager can decide Project pricing." };
  const parsed = managerDecisionSchema.safeParse({ pricingCaseId: value(formData, "pricingCaseId"), decision: value(formData, "decision"), notes: value(formData, "notes") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const pricingCase = await db.pricingCase.findUnique({ where: { id: parsed.data.pricingCaseId }, include: { opportunity: true } });
    if (!pricingCase || pricingCase.type !== PricingCaseType.PROJECT || pricingCase.status !== PricingStatus.MANAGER_APPROVAL) throw new Error("Project pricing is not awaiting approval.");
    const approved = parsed.data.decision === "APPROVE";
    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.pricingCase.update({ where: { id: pricingCase.id }, data: { status: approved ? PricingStatus.APPROVED : PricingStatus.CHANGES_REQUESTED, managerApprovedAt: approved ? new Date() : null, overrideReason: parsed.data.notes } });
      await tx.approval.updateMany({ where: { pricingCaseId: pricingCase.id, status: ApprovalStatus.PENDING }, data: { status: approved ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED, decidedById: user.id, decidedAt: new Date(), decisionNotes: parsed.data.notes } });
      if (approved && earlyStage(pricingCase.opportunity.stage)) await tx.opportunity.update({ where: { id: pricingCase.opportunityId }, data: { stage: OpportunityStage.QUOTATION } });
      await tx.auditLog.create({ data: { actorId: user.id, action: approved ? AuditAction.APPROVE : AuditAction.REJECT, entityType: "PricingCase", entityId: pricingCase.id, after: { status: approved ? "APPROVED" : "CHANGES_REQUESTED", notes: parsed.data.notes } } });
    });
    revalidatePath(`/opportunities/${pricingCase.opportunityId}`);
    revalidatePath("/pricing");
    return { success: approved ? "Project price approved." : "Project pricing returned to Finance." };
  } catch (error) { return { error: errorMessage(error) }; }
}
