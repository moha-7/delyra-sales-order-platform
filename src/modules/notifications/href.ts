export type NotificationLinkInput = {
  href: string | null;
  entityType: string | null;
  entityId: string | null;
};

export function notificationHref(input: NotificationLinkInput): string {
  if (input.href) return input.href;
  if (!input.entityId) return "/notifications";
  switch (input.entityType) {
    case "Opportunity":
      return `/opportunities/${input.entityId}`;
    case "OrderHandover":
      return `/orders/${input.entityId}`;
    case "Task":
      return `/tasks/${input.entityId}`;
    case "Quotation":
      return `/quotations/${input.entityId}/preview`;
    default:
      return "/notifications";
  }
}
