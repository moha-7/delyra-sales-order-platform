import { describe, expect, it } from "vitest";
import { calculateRetailFinancePricing } from "@/modules/pricing/retail-pricing";

describe("Retail cascade pricing engine", () => {
  it("calculates a fictional demo retail pricing scenario", () => {
    const result = calculateRetailFinancePricing({
      designFurnitureEur: "10000",
      designAuxiliaryEur: "2000",
      freightAed: "1000",
      managerDiscountPercent: "5",
      managerDiscountReason: "Fictional demo commercial adjustment",
    });
    expect(result.netKitchenEur).toBe("3686.00");
    expect(result.netHlpEur).toBe("1500.00");
    expect(result.totalDesignEur).toBe("5186.00");
    expect(result.totalCostAed).toBe("26462.12");
    expect(result.priceBeforeDiscountAed).toBe("34255.50");
    expect(result.customerDiscountAed).toBe("1712.78");
    expect(result.finalSellingPriceAed).toBe("32542.73");
  });

  it("uses Finance cost rate for material cost and separate selling rates", () => {
    const result = calculateRetailFinancePricing({
      designFurnitureEur: "10000",
      designAuxiliaryEur: "1000",
      conversionRate: "3.2",
      kitchenSellingRate: "6.75",
      hlpSellingRate: "6.25",
      clearanceAed: "0",
    });
    expect(result.conversionRate).toBe("3.200000");
    expect(result.appliedKitchenSellingRate).toBe("6.750000");
    expect(result.appliedHlpSellingRate).toBe("6.250000");
    expect(result.designCostAed).toBe("14195.20");
  });

  it("adds appliances markup and local worktop selling value", () => {
    const result = calculateRetailFinancePricing({
      designFurnitureEur: "0",
      designAuxiliaryEur: "0",
      applianceCostAed: "5000",
      worktopCostAed: "8000",
      worktopSellingPriceAed: "12000",
      clearanceAed: "0",
    });
    expect(result.sellingAppliancesAed).toBe("5500.00");
    expect(result.sellingWorktopAed).toBe("12000.00");
    expect(result.finalSellingPriceAed).toBe("17500.00");
  });

  it("requires a reason when a Branch Manager discount percentage is used", () => {
    expect(() => calculateRetailFinancePricing({
      designFurnitureEur: "10000",
      managerDiscountPercent: "2",
    })).toThrow("Manager discount reason is required");
  });
});
