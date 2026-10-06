import type { Prisma } from "@/generated/prisma/client";

type TransactionClient = Prisma.TransactionClient;
type TrackCode = "RT" | "PR";

function formatSequence(value: bigint, padding: number): string {
  return value.toString().padStart(padding, "0");
}

async function incrementSequence(
  tx: TransactionClient,
  key: string,
): Promise<{ value: bigint; padding: number }> {
  const sequence = await tx.numberSequence.update({
    where: { key },
    data: { currentValue: { increment: 1 } },
    select: { currentValue: true, padding: true },
  });

  return {
    value: sequence.currentValue,
    padding: sequence.padding,
  };
}

export async function nextInternalReference(
  tx: TransactionClient,
  sequenceKey:
    | "LEAD_INTERNAL"
    | "CUSTOMER_INTERNAL"
    | "OPPORTUNITY_INTERNAL"
    | "TASK_INTERNAL"
    | "QUOTATION_INTERNAL",
  prefix: "LEAD" | "CUS" | "OPP" | "TASK" | "QUO",
  year = new Date().getUTCFullYear(),
): Promise<string> {
  const sequence = await incrementSequence(tx, sequenceKey);
  return `${prefix}-${year}-${formatSequence(sequence.value, sequence.padding)}`;
}

export async function nextQuotationBusinessReference(
  tx: TransactionClient,
  track: TrackCode,
  salesInitials: string,
): Promise<string> {
  const initials = salesInitials.trim().toUpperCase();

  if (!/^[A-Z]{2,4}$/.test(initials)) {
    throw new Error("Sales initials must contain 2 to 4 English letters");
  }

  const sequence = await incrementSequence(tx, "QUOTATION_BUSINESS");
  return `NS/SO/${track}/${initials}/${formatSequence(
    sequence.value,
    sequence.padding,
  )}`;
}
