import { describe, expect, it } from "vitest";
import type { Prisma } from "@/generated/prisma/client";
import {
  formatBusinessReference,
  issueBusinessReference,
  REFERENCE_TRACK_CODES,
  REFERENCE_TYPE_CODES,
  trackCodeForOpportunityTrack,
} from "@/modules/crm/references";

describe("CRM business references", () => {
  it("formats business-readable references with padded sequence", () => {
    expect(
      formatBusinessReference({
        trackCode: REFERENCE_TRACK_CODES.PROJECT,
        typeCode: REFERENCE_TYPE_CODES.LEAD,
        year: 2026,
        sequence: 7,
      }),
    ).toBe("NSG/OPS/PR/LEAD/2026/0007");
  });

  it("formats retail quotation references", () => {
    expect(
      formatBusinessReference({
        trackCode: REFERENCE_TRACK_CODES.RETAIL,
        typeCode: REFERENCE_TYPE_CODES.QUOTATION,
        year: 2026,
        sequence: 12,
      }),
    ).toBe("NSG/OPS/RK/QT/2026/0012");
  });

  it("formats task references", () => {
    expect(
      formatBusinessReference({
        trackCode: REFERENCE_TRACK_CODES.PROJECT,
        typeCode: REFERENCE_TYPE_CODES.TASK,
        year: 2026,
        sequence: 3,
      }),
    ).toBe("NSG/OPS/PR/TASK/2026/0003");
  });

  it("formats payment receipt references", () => {
    expect(
      formatBusinessReference({
        trackCode: REFERENCE_TRACK_CODES.RETAIL,
        typeCode: REFERENCE_TYPE_CODES.PAYMENT,
        year: 2026,
        sequence: 5,
      }),
    ).toBe("NSG/OPS/RK/PAY/2026/0005");
  });

  it("formats project tender references", () => {
    expect(
      formatBusinessReference({
        trackCode: REFERENCE_TRACK_CODES.PROJECT,
        typeCode: REFERENCE_TYPE_CODES.TENDER,
        year: 2026,
        sequence: 4,
      }),
    ).toBe("NSG/OPS/PR/TND/2026/0004");
  });

  it("maps opportunity tracks to compact business track codes", () => {
    expect(trackCodeForOpportunityTrack("PROJECT")).toBe("PR");
    expect(trackCodeForOpportunityTrack("RETAIL")).toBe("RK");
  });

  it("rejects invalid sequence values", () => {
    expect(() =>
      formatBusinessReference({
        trackCode: REFERENCE_TRACK_CODES.PROJECT,
        typeCode: REFERENCE_TYPE_CODES.LEAD,
        year: 2026,
        sequence: 0,
      }),
    ).toThrow("Reference sequence must be a positive integer.");
  });

  it("issues references through an atomic database-backed sequence", async () => {
    const calls: unknown[] = [];

    const tx = {
      referenceSequence: {
        upsert: async (args: unknown) => {
          calls.push(args);

          return { nextNumber: 8 };
        },
      },
    } as unknown as Prisma.TransactionClient;

    await expect(
      issueBusinessReference(tx, {
        trackCode: REFERENCE_TRACK_CODES.PROJECT,
        typeCode: REFERENCE_TYPE_CODES.OPPORTUNITY,
        year: 2026,
      }),
    ).resolves.toBe("NSG/OPS/PR/OPP/2026/0007");

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      where: {
        companyCode_brandCode_trackCode_typeCode_year: {
          companyCode: "NSG",
          brandCode: "OPS",
          trackCode: "PR",
          typeCode: "OPP",
          year: 2026,
        },
      },
      update: {
        nextNumber: {
          increment: 1,
        },
      },
      create: {
        companyCode: "NSG",
        brandCode: "OPS",
        trackCode: "PR",
        typeCode: "OPP",
        year: 2026,
        nextNumber: 2,
      },
      select: {
        nextNumber: true,
      },
    });
  });
});
