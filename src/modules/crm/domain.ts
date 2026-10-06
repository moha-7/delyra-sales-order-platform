export const CONTACT_DATA_QUALITY = {
  VERIFIED: "VERIFIED",
  NEEDS_VERIFICATION: "NEEDS_VERIFICATION",
} as const;

export type ContactDataQuality =
  (typeof CONTACT_DATA_QUALITY)[keyof typeof CONTACT_DATA_QUALITY];

export function contactDataQuality(input: {
  mobile?: string | null;
  email?: string | null;
}): ContactDataQuality {
  return input.mobile?.trim() || input.email?.trim()
    ? CONTACT_DATA_QUALITY.VERIFIED
    : CONTACT_DATA_QUALITY.NEEDS_VERIFICATION;
}

export function toOptionalDate(value?: string): Date | null {
  if (!value) return null;
  const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value);
  return new Date(hasTimeZone ? value : `${value}:00+04:00`);
}

export function toOptionalDecimalString(value?: string): string | null {
  return value?.trim() ? value.trim() : null;
}
