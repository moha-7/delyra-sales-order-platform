import Decimal from "decimal.js";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export const RETAIL_PRICING_VERSION = "DEMO_PRICING_V1";
export const DEFAULT_EUR_COST_RATE = new Decimal("4.25");
export const DEFAULT_FINANCE_CONVERSION_RATE = DEFAULT_EUR_COST_RATE;
export const DEFAULT_COMPANY_MARKUP_PCT = new Decimal("0");
export const DEFAULT_KITCHEN_SELLING_RATE = new Decimal("6.75");
export const DEFAULT_HLP_SELLING_RATE = new Decimal("6.25");
export const DEFAULT_HLP_DISCOUNT_PCT = new Decimal("25");
export const DEFAULT_APPLIANCE_MARKUP_PCT = new Decimal("10");
export const DEFAULT_CUSTOMS_PCT = new Decimal("4");
export const DEFAULT_CLEARANCE_AED = new Decimal("2500");
export const DEFAULT_KITCHEN_DISCOUNT_CASCADE = ["40", "5", "3"];

export type RetailPricingConfig = {
  eurCostRate: Decimal.Value;
  kitchenSellingRate: Decimal.Value;
  hlpSellingRate: Decimal.Value;
  kitchenDiscountCascadePct: Decimal.Value[];
  hlpDiscountPct: Decimal.Value;
  applianceMarkupPct: Decimal.Value;
  customsPct: Decimal.Value;
  defaultClearanceAed: Decimal.Value;
};

export const DEFAULT_RETAIL_CONFIG: RetailPricingConfig = {
  eurCostRate: DEFAULT_EUR_COST_RATE,
  kitchenSellingRate: DEFAULT_KITCHEN_SELLING_RATE,
  hlpSellingRate: DEFAULT_HLP_SELLING_RATE,
  kitchenDiscountCascadePct: DEFAULT_KITCHEN_DISCOUNT_CASCADE,
  hlpDiscountPct: DEFAULT_HLP_DISCOUNT_PCT,
  applianceMarkupPct: DEFAULT_APPLIANCE_MARKUP_PCT,
  customsPct: DEFAULT_CUSTOMS_PCT,
  defaultClearanceAed: DEFAULT_CLEARANCE_AED,
};

export type RetailFinanceInput = {
  designFurnitureEur?: Decimal.Value;
  designAuxiliaryEur?: Decimal.Value;
  kitchenLinesEur?: Decimal.Value[];
  hlpLinesEur?: Decimal.Value[];
  conversionRate?: Decimal.Value;
  kitchenSellingRate?: Decimal.Value;
  hlpSellingRate?: Decimal.Value;
  applianceCostAed?: Decimal.Value;
  worktopCostAed?: Decimal.Value;
  worktopSellingPriceAed?: Decimal.Value;
  freightAed?: Decimal.Value;
  clearanceAed?: Decimal.Value;
  otherCostAed?: Decimal.Value;
  otherSellingPriceAed?: Decimal.Value;
  managerDiscountPercent?: Decimal.Value;
  managerDiscountReason?: string;
  // Backward compatibility with v0.3 forms/actions. These are no longer source-of-truth.
  customsAed?: Decimal.Value;
  companyMarkupPct?: Decimal.Value;
  proposedSellingPriceAed?: Decimal.Value;
  customerDiscountAed?: Decimal.Value;
};

export type RetailFinanceResult = {
  formulaVersion: string;
  supplierPointFactorReference: string;
  conversionRate: string;
  totalDesignEur: string;
  designCostAed: string;
  applianceCostAed: string;
  worktopCostAed: string;
  freightAed: string;
  customsAed: string;
  clearanceAed: string;
  otherCostAed: string;
  totalCostAed: string;
  companyMarkupPct: string;
  recommendedSellingPriceAed: string;
  priceBeforeDiscountAed: string;
  customerDiscountAed: string;
  finalSellingPriceAed: string;
  grossProfitAed: string;
  grossMarginPct: string;
  netKitchenEur: string;
  netHlpEur: string;
  materialCostAed: string;
  sellingKitchenAed: string;
  sellingHlpAed: string;
  sellingAppliancesAed: string;
  sellingWorktopAed: string;
  sellingOtherAed: string;
  managerDiscountPercent: string;
  managerDiscountReason?: string;
  markupPct: string;
  appliedKitchenSellingRate: string;
  appliedHlpSellingRate: string;
  snapshot: Record<string, unknown>;
};

function d(value: Decimal.Value | undefined, fallback: Decimal.Value = 0) {
  return new Decimal(value ?? fallback);
}
function money(value: Decimal) {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
}
function rate(value: Decimal) {
  return value.toDecimalPlaces(6, Decimal.ROUND_HALF_UP).toFixed(6);
}
function pct(value: Decimal) {
  return value.toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toFixed(4);
}
function pctFactor(value: Decimal.Value) {
  return new Decimal(value).div(100);
}
function sum(values: Decimal[]) {
  return values.reduce((total, value) => total.plus(value), new Decimal(0));
}

function applyCascade(listEur: Decimal, cascadePct: Decimal.Value[]): Decimal {
  return cascadePct.reduce<Decimal>((value, step, index) => {
    const factor = pctFactor(step);
    return index === 0 ? value.mul(factor) : value.mul(new Decimal(1).minus(factor));
  }, listEur);
}

function assertDiscount(percent: Decimal, reason?: string) {
  if (percent.lt(0) || percent.gt(100)) {
    throw new Error("Manager discount percent must be between 0 and 100.");
  }
  if (percent.gt(0) && !reason?.trim()) {
    throw new Error("Manager discount reason is required when discount is greater than 0%.");
  }
}

function asLines(primary?: Decimal.Value, lines?: Decimal.Value[]): Decimal[] {
  const list = lines?.length ? lines : primary === undefined ? [] : [primary];
  return list.map((value) => d(value));
}

export function calculateRetailFinancePricing(
  input: RetailFinanceInput,
  config: RetailPricingConfig = DEFAULT_RETAIL_CONFIG,
): RetailFinanceResult {
  const eurCostRate = d(input.conversionRate, config.eurCostRate);
  const kitchenSellingRate = d(input.kitchenSellingRate, config.kitchenSellingRate);
  const hlpSellingRate = d(input.hlpSellingRate, config.hlpSellingRate);
  const applianceMarkup = pctFactor(config.applianceMarkupPct);
  const customsPct = pctFactor(config.customsPct);
  const clearance = d(input.clearanceAed, config.defaultClearanceAed);
  const managerDiscountPercent = d(input.managerDiscountPercent, 0);

  if (eurCostRate.lte(0)) throw new Error("Finance EUR cost rate must be positive.");
  if (kitchenSellingRate.lte(0) || hlpSellingRate.lte(0)) throw new Error("Selling rates must be positive.");
  assertDiscount(managerDiscountPercent, input.managerDiscountReason);

  const kitchenLines = asLines(input.designFurnitureEur, input.kitchenLinesEur);
  const hlpLines = asLines(input.designAuxiliaryEur, input.hlpLinesEur);
  const netKitchen = sum(kitchenLines.map((line) => applyCascade(line, config.kitchenDiscountCascadePct)));
  const netHlp = sum(hlpLines.map((line) => line.mul(new Decimal(1).minus(pctFactor(config.hlpDiscountPct)))));
  const netEur = netKitchen.plus(netHlp);

  const applianceCost = d(input.applianceCostAed);
  const worktopCost = d(input.worktopCostAed);
  const freight = d(input.freightAed);
  const otherCost = d(input.otherCostAed);
  const materialCost = netEur.mul(eurCostRate);
  const customs = materialCost.plus(freight).mul(customsPct);
  const landing = freight.plus(customs).plus(clearance);
  const totalCost = materialCost.plus(landing).plus(applianceCost).plus(worktopCost).plus(otherCost);

  const sellingKitchen = netKitchen.mul(kitchenSellingRate);
  const sellingHlp = netHlp.mul(hlpSellingRate);
  const sellingAppliances = applianceCost.mul(new Decimal(1).plus(applianceMarkup));
  const sellingWorktop = d(input.worktopSellingPriceAed, input.worktopCostAed ?? 0);
  const sellingOther = d(input.otherSellingPriceAed, input.otherCostAed ?? 0);
  const sellingBeforeDiscount = sellingKitchen.plus(sellingHlp).plus(sellingAppliances).plus(sellingWorktop).plus(sellingOther);
  const managerDiscountAed = sellingBeforeDiscount.mul(managerDiscountPercent).div(100);
  const finalSelling = Decimal.max(sellingBeforeDiscount.minus(managerDiscountAed), 0);
  const grossProfit = finalSelling.minus(totalCost);
  const margin = finalSelling.isZero() ? new Decimal(0) : grossProfit.div(finalSelling).mul(100);
  const markup = totalCost.isZero() ? new Decimal(0) : grossProfit.div(totalCost).mul(100);

  const snapshot = {
    version: RETAIL_PRICING_VERSION,
    input,
    config: {
      eurCostRate: eurCostRate.toString(),
      kitchenSellingRate: kitchenSellingRate.toString(),
      hlpSellingRate: hlpSellingRate.toString(),
      kitchenDiscountCascadePct: config.kitchenDiscountCascadePct.map(String),
      hlpDiscountPct: String(config.hlpDiscountPct),
      applianceMarkupPct: String(config.applianceMarkupPct),
      customsPct: String(config.customsPct),
      defaultClearanceAed: String(config.defaultClearanceAed),
    },
  };

  return {
    formulaVersion: RETAIL_PRICING_VERSION,
    supplierPointFactorReference: rate(DEFAULT_KITCHEN_SELLING_RATE),
    conversionRate: rate(eurCostRate),
    totalDesignEur: money(netEur),
    designCostAed: money(materialCost),
    applianceCostAed: money(applianceCost),
    worktopCostAed: money(worktopCost),
    freightAed: money(freight),
    customsAed: money(customs),
    clearanceAed: money(clearance),
    otherCostAed: money(otherCost),
    totalCostAed: money(totalCost),
    companyMarkupPct: pct(managerDiscountPercent),
    recommendedSellingPriceAed: money(sellingBeforeDiscount),
    priceBeforeDiscountAed: money(sellingBeforeDiscount),
    customerDiscountAed: money(managerDiscountAed),
    finalSellingPriceAed: money(finalSelling),
    grossProfitAed: money(grossProfit),
    grossMarginPct: pct(margin),
    netKitchenEur: money(netKitchen),
    netHlpEur: money(netHlp),
    materialCostAed: money(materialCost),
    sellingKitchenAed: money(sellingKitchen),
    sellingHlpAed: money(sellingHlp),
    sellingAppliancesAed: money(sellingAppliances),
    sellingWorktopAed: money(sellingWorktop),
    sellingOtherAed: money(sellingOther),
    managerDiscountPercent: pct(managerDiscountPercent),
    managerDiscountReason: input.managerDiscountReason?.trim() || undefined,
    markupPct: pct(markup),
    appliedKitchenSellingRate: rate(kitchenSellingRate),
    appliedHlpSellingRate: rate(hlpSellingRate),
    snapshot,
  };
}

export function buildRetailPricingSnapshot(
  input: RetailFinanceInput,
  config: RetailPricingConfig = DEFAULT_RETAIL_CONFIG,
  version = 1,
) {
  return {
    version,
    at: new Date().toISOString(),
    input,
    config,
    result: calculateRetailFinancePricing(input, config),
  };
}
