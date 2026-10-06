import { z } from "zod";

const money = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? "0" : value),
  z.string().trim().regex(/^\d{1,15}(?:\.\d{1,2})?$/, "Enter a valid amount with up to 2 decimals."),
);

const rate = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().regex(/^\d{1,4}(?:\.\d{1,6})?$/, "Enter a valid positive rate.").optional(),
);

const percent = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().regex(/^\d{1,3}(?:\.\d{1,4})?$/, "Enter a valid percentage.").optional(),
);

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max).optional(),
  );

export const retailFinancePricingSchema = z.object({
  opportunityId: z.string().uuid(),
  conversionRate: rate,
  kitchenSellingRate: rate,
  hlpSellingRate: rate,
  applianceCostAed: money,
  worktopCostAed: money,
  worktopSellingPriceAed: money,
  freightAed: money,
  clearanceAed: money,
  otherCostAed: money,
  otherSellingPriceAed: money,
  financeNotes: optionalText(4000),
  sellingRateOverrideReason: optionalText(2000),
});

export const managerRetailDecisionSchema = z.object({
  pricingCaseId: z.string().uuid(),
  decision: z.enum(["APPROVE", "RETURN"]),
  managerDiscountPercent: percent.default("0"),
  notes: optionalText(2000),
}).refine((data) => data.decision === "RETURN" || data.managerDiscountPercent === "0" || Boolean(data.notes?.trim()), {
  message: "Discount reason is required when discount is greater than 0%.",
  path: ["notes"],
});

export const projectPricingSchema = z.object({
  opportunityId: z.string().uuid(),
  totalCostAed: money,
  proposedSellingPriceAed: money,
  notes: optionalText(4000),
});

export const pricingCaseIdSchema = z.object({
  pricingCaseId: z.string().uuid(),
  notes: optionalText(2000),
});

export const financeDecisionSchema = pricingCaseIdSchema.extend({
  decision: z.enum(["APPROVE", "RETURN"]),
});

export const managerDecisionSchema = pricingCaseIdSchema.extend({
  decision: z.enum(["APPROVE", "RETURN"]),
});
