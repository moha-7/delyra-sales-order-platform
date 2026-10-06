import { db } from "@/lib/db";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export type RetailPricingDefaults = {
  formulaVersion: string;
  supplierPointFactorReference: string;
  defaultCostingRateEurAed: string;
  kitchenSellingRate: string;
  hlpSellingRate: string;
  kitchenDiscountCascadePct: string[];
  hlpDiscountPct: string;
  defaultAppliancesMarkupPct: string;
  customsPct: string;
  defaultClearanceAed: string;
  vatCalculatedByCrm: boolean;
};

export type ApprovalWorkflowSettings = {
  financePreparesRetail: boolean;
  financePreparesProject: boolean;
  managerFinalApprovalRequired: boolean;
  managerApprovesAnyCustomerDiscount: boolean;
};

export type QuotationDefaults = {
  validityDays: number;
  paymentTerms: string;
  showVat: boolean;
};

export async function getRetailPricingDefaults(): Promise<RetailPricingDefaults> {
  const setting = await db.systemSetting.findUnique({ where: { key: "retail.pricing.v3" } });
  const value = record(setting?.value);
  return {
    formulaVersion: text(value.formulaVersion, "DEMO_PRICING_V1"),
    supplierPointFactorReference: text(value.supplierPointFactorReference, "6.75"),
    defaultCostingRateEurAed: text(value.defaultCostingRateEurAed, "4.25"),
    kitchenSellingRate: text(value.kitchenSellingRate, "6.75"),
    hlpSellingRate: text(value.hlpSellingRate, "6.25"),
    kitchenDiscountCascadePct: Array.isArray(value.kitchenDiscountCascadePct)
      ? value.kitchenDiscountCascadePct.map((item) => text(item, "0"))
      : ["40", "5", "3"],
    hlpDiscountPct: text(value.hlpDiscountPct, "25"),
    defaultAppliancesMarkupPct: text(value.defaultAppliancesMarkupPct, "10"),
    customsPct: text(value.customsPct, "4"),
    defaultClearanceAed: text(value.defaultClearanceAed, "2500"),
    vatCalculatedByCrm: bool(value.vatCalculatedByCrm, false),
  };
}

export async function getApprovalWorkflowSettings(): Promise<ApprovalWorkflowSettings> {
  const setting = await db.systemSetting.findUnique({ where: { key: "approval.workflow" } });
  const value = record(setting?.value);
  return {
    financePreparesRetail: bool(value.financePreparesRetail, true),
    financePreparesProject: bool(value.financePreparesProject, true),
    managerFinalApprovalRequired: bool(value.managerFinalApprovalRequired, true),
    managerApprovesAnyCustomerDiscount: bool(value.managerApprovesAnyCustomerDiscount, true),
  };
}

export async function getQuotationDefaults(): Promise<QuotationDefaults> {
  const setting = await db.systemSetting.findUnique({ where: { key: "quotation.defaults" } });
  const value = record(setting?.value);
  return {
    validityDays: Math.max(1, Math.round(numberValue(value.validityDays, 30))),
    paymentTerms: text(value.paymentTerms, "30% demo deposit with order; remaining balance follows the configured payment schedule."),
    showVat: bool(value.showVat, false),
  };
}
