import type { OpportunityTrack, Prisma } from "@/generated/prisma/client";

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
