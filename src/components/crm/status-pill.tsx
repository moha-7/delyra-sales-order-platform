import { enumLabel } from "@/modules/crm/format";

export function StatusPill({ value }: { value: string }) {
  const tone = ["WON", "VERIFIED", "QUALIFIED", "COMPLETED"].includes(value)
    ? "positive"
    : ["LOST", "DISQUALIFIED", "CANCELLED", "BLOCKED"].includes(value)
      ? "negative"
      : ["DEPOSIT_PENDING", "NEGOTIATION", "NEEDS_VERIFICATION"].includes(value)
        ? "warning"
        : "neutral";

  return <span className={`status-pill status-${tone}`}>{enumLabel(value)}</span>;
}
