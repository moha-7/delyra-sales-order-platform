export const ORDER_TIME_ZONE = "Asia/Dubai";

const ORDER_TIME_ZONE_OFFSET = "+04:00";
const LOCAL_DATE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/;

function asDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

export function parseOrderDateTimeLocal(value: string): Date | null {
  const trimmed = value.trim();
  if (!LOCAL_DATE_TIME_PATTERN.test(trimmed)) return null;

  const withSeconds =
    trimmed.length === 16 ? `${trimmed}:00` : trimmed;

  const date = new Date(`${withSeconds}${ORDER_TIME_ZONE_OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatOrderDateTimeLocal(
  value: Date | string | null | undefined,
) {
  if (!value) return "";

  const date = asDate(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ORDER_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";

  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export function formatOrderDateTime(
  value: Date | string | null | undefined,
) {
  if (!value) return "—";

  const date = asDate(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: ORDER_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}
