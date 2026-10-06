import fs from "node:fs";

const schemaFile = "prisma/schema.prisma";
let schema = fs.readFileSync(schemaFile, "utf8");

if (!schema.includes("model ReferenceSequence")) {
  const model = `
model ReferenceSequence {
  id          String   @id @default(uuid()) @db.Uuid
  companyCode String   @db.VarChar(16)
  brandCode   String   @db.VarChar(32)
  trackCode   String   @db.VarChar(8)
  typeCode    String   @db.VarChar(16)
  year        Int
  nextNumber  Int      @default(1)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([companyCode, brandCode, trackCode, typeCode, year])
  @@index([year, trackCode, typeCode])
}
`;

  schema = schema.replace("model Lead {", `${model}\nmodel Lead {`);
  fs.writeFileSync(schemaFile, schema, "utf8");
}

fs.mkdirSync("src/modules/crm", { recursive: true });

fs.writeFileSync("src/modules/crm/references.ts", `import type { OpportunityTrack, Prisma } from "@/generated/prisma/client";

export const REFERENCE_COMPANY_CODE = "NSG";
export const REFERENCE_BRAND_CODE = "OPS";

export const REFERENCE_TRACK_CODES = {
  PROJECT: "PR",
  RETAIL: "RK",
} as const;

export const REFERENCE_TYPE_CODES = {
  LEAD: "LEAD",
  OPPORTUNITY: "OPP",
  QUOTATION: "QT",
  TENDER: "TND",
  PAYMENT: "PAY",
  DOCUMENT: "DOC",
  TASK: "TASK",
  APPROVAL: "APR",
  CUSTOMER: "CUST",
} as const;

export type ReferenceTrackCode =
  (typeof REFERENCE_TRACK_CODES)[keyof typeof REFERENCE_TRACK_CODES];

export type ReferenceTypeCode =
  (typeof REFERENCE_TYPE_CODES)[keyof typeof REFERENCE_TYPE_CODES];

export type ReferenceInput = {
  companyCode?: string;
  brandCode?: string;
  trackCode: ReferenceTrackCode;
  typeCode: ReferenceTypeCode;
  year: number;
  sequence: number;
};

export type IssueReferenceInput = Omit<ReferenceInput, "sequence">;

export function trackCodeForOpportunityTrack(
  track: OpportunityTrack,
): ReferenceTrackCode {
  if (track === "PROJECT") return REFERENCE_TRACK_CODES.PROJECT;

  return REFERENCE_TRACK_CODES.RETAIL;
}

export function normalizeReferenceSegment(segment: string): string {
  return segment.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function formatBusinessReference(input: ReferenceInput): string {
  const companyCode = normalizeReferenceSegment(
    input.companyCode ?? REFERENCE_COMPANY_CODE,
  );
  const brandCode = normalizeReferenceSegment(
    input.brandCode ?? REFERENCE_BRAND_CODE,
  );
  const trackCode = normalizeReferenceSegment(input.trackCode);
  const typeCode = normalizeReferenceSegment(input.typeCode);

  if (!companyCode || !brandCode || !trackCode || !typeCode) {
    throw new Error("Reference segments cannot be empty.");
  }

  if (!Number.isInteger(input.year) || input.year < 2000) {
    throw new Error("Reference year must be a valid integer year.");
  }

  if (!Number.isInteger(input.sequence) || input.sequence < 1) {
    throw new Error("Reference sequence must be a positive integer.");
  }

  return [
    companyCode,
    brandCode,
    trackCode,
    typeCode,
    String(input.year),
    String(input.sequence).padStart(4, "0"),
  ].join("/");
}

export async function issueBusinessReference(
  tx: Prisma.TransactionClient,
  input: IssueReferenceInput,
): Promise<string> {
  const companyCode = normalizeReferenceSegment(
    input.companyCode ?? REFERENCE_COMPANY_CODE,
  );
  const brandCode = normalizeReferenceSegment(
    input.brandCode ?? REFERENCE_BRAND_CODE,
  );
  const trackCode = normalizeReferenceSegment(input.trackCode);
  const typeCode = normalizeReferenceSegment(input.typeCode);

  const sequence = await tx.referenceSequence.upsert({
    where: {
      companyCode_brandCode_trackCode_typeCode_year: {
        companyCode,
        brandCode,
        trackCode,
        typeCode,
        year: input.year,
      },
    },
    update: {
      nextNumber: {
        increment: 1,
      },
    },
    create: {
      companyCode,
      brandCode,
      trackCode,
      typeCode,
      year: input.year,
      nextNumber: 2,
    },
    select: {
      nextNumber: true,
    },
  });

  return formatBusinessReference({
    companyCode,
    brandCode,
    trackCode: trackCode as ReferenceTrackCode,
    typeCode: typeCode as ReferenceTypeCode,
    year: input.year,
    sequence: sequence.nextNumber - 1,
  });
}
`, "utf8");

fs.writeFileSync("tests/crm-references.test.ts", `import { describe, expect, it } from "vitest";
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
`, "utf8");

console.log("Applied v0.5.3 reference sequence model, module, and tests.");
