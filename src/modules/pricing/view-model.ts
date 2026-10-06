import type { PricingCase, PricingLine } from "@/generated/prisma/client";
import type { RetailPricingDefaults } from "@/modules/settings/workflow";

type CaseWithLines = PricingCase & { lines: PricingLine[] };

function line(caseData: CaseWithLines | null | undefined, description: string) {
  return caseData?.lines.find((item) => item.description === description);
}
function metaString(lineData: PricingLine | undefined, key: string, fallback = "0") {
  const value = lineData?.metadata;
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const record = value as Record<string, unknown>;
  const item = record[key];
  return typeof item === "string" || typeof item === "number" ? String(item) : fallback;
}

export function retailFinanceValues(
  caseData: CaseWithLines | null | undefined,
  defaults?: Pick<RetailPricingDefaults, "defaultCostingRateEurAed" | "kitchenSellingRate" | "hlpSellingRate">,
) {
  const furniture = line(caseData, "Design Furniture EUR");
  const hlp = line(caseData, "Design HLP EUR");
  const appliances = line(caseData, "Appliances cost");
  const worktop = line(caseData, "Worktop cost");
  const freight = line(caseData, "Freight");
  const clearance = line(caseData, "Clearance");
  const other = line(caseData, "Other cost");

  return {
    conversionRate: caseData?.exchangeRate?.toString() ?? defaults?.defaultCostingRateEurAed ?? "4.25",
    kitchenSellingRate: metaString(furniture, "appliedKitchenSellingRate", defaults?.kitchenSellingRate ?? "6.75"),
    hlpSellingRate: metaString(hlp, "appliedHlpSellingRate", defaults?.hlpSellingRate ?? "6.25"),
    applianceCostAed: appliances?.costAed?.toString() ?? "0",
    worktopCostAed: worktop?.costAed?.toString() ?? "0",
    worktopSellingPriceAed: worktop?.sellingPriceAed?.toString() ?? worktop?.costAed?.toString() ?? "0",
    freightAed: freight?.costAed?.toString() ?? "0",
    clearanceAed: clearance?.costAed?.toString() ?? "3000",
    otherCostAed: other?.costAed?.toString() ?? "0",
    otherSellingPriceAed: other?.sellingPriceAed?.toString() ?? other?.costAed?.toString() ?? "0",
    managerDiscountPercent: caseData?.companyMarkupPct?.toString() ?? "0",
    customerDiscountAed: caseData?.customerDiscountAed?.toString() ?? "0",
    financeNotes: caseData?.financeNotes ?? "",
    sellingRateOverrideReason: caseData?.overrideReason ?? "",
  };
}
