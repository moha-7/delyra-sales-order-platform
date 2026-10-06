const FALLBACK_NOTIFICATION_HREF = "/notifications";

function isSafeInternalHref(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//") && !href.includes("\\");
}

export function notificationMessageIdFromHref(href: string | null | undefined): string | null {
  if (!href || !isSafeInternalHref(href)) return null;

  try {
    const parsed = new URL(href, "http://crm.local");
    return parsed.searchParams.get("message") ?? null;
  } catch {
    return null;
  }
}

export function safeNotificationRedirectHref(href: string | null | undefined): string {
  if (!href || !isSafeInternalHref(href)) {
    return FALLBACK_NOTIFICATION_HREF;
  }

  try {
    const parsed = new URL(href, "http://crm.local");

    if (parsed.pathname.startsWith("/opportunities/")) {
      const messageId = parsed.searchParams.get("message");
      if (messageId) {
        parsed.searchParams.set("section", "chatter");
        if (!parsed.hash) {
          parsed.hash = `message-${messageId}`;
        }
      }
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return FALLBACK_NOTIFICATION_HREF;
  }
}
