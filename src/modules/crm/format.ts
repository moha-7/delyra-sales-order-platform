export function enumLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-AE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dubai",
  }).format(date);
}

export function dateTimeLocalValue(
  value: Date | string | null | undefined,
): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  const dubaiOffsetMs = 4 * 60 * 60 * 1000;
  return new Date(date.getTime() + dubaiOffsetMs).toISOString().slice(0, 16);
}

export function formatMoney(
  value: { toString(): string } | string | number | null | undefined,
  currency = "AED",
): string {
  if (value === null || value === undefined) return "—";
  const number = Number(value.toString());
  if (!Number.isFinite(number)) return "—";
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(number);
}
