export type ActivityTimelineKind =
  | "activity"
  | "audit"
  | "chatter"
  | "deposit"
  | "document"
  | "quotation"
  | "task";

export type ActivityTimelineItem = {
  id: string;
  kind: ActivityTimelineKind;
  title: string;
  occurredAt: Date | string;
  actorName?: string | null;
  body?: string | null;
  href?: string | null;
  status?: string | null;
  secondary?: string | null;
};

export function compactTimelineBody(body: string | null | undefined, maxLength = 140): string | null {
  const normalizedBody = body?.replace(/\s+/g, " ").trim() ?? "";

  if (!normalizedBody) {
    return null;
  }

  if (maxLength <= 0) {
    return "";
  }

  if (normalizedBody.length <= maxLength) {
    return normalizedBody;
  }

  const suffix = "...";

  if (maxLength <= suffix.length) {
    return suffix.slice(0, maxLength);
  }

  return `${normalizedBody.slice(0, maxLength - suffix.length)}${suffix}`;
}

export function sortTimelineItems<T extends { occurredAt: Date | string }>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    const rightTime = new Date(right.occurredAt).getTime();
    const leftTime = new Date(left.occurredAt).getTime();

    return rightTime - leftTime;
  });
}

export function timelineKindLabel(kind: ActivityTimelineKind): string {
  const labels: Record<ActivityTimelineKind, string> = {
    activity: "Activity",
    audit: "Audit",
    chatter: "Chatter",
    deposit: "Deposit",
    document: "Document",
    quotation: "Quotation",
    task: "Task",
  };

  return labels[kind];
}

export function timelineKindClassName(kind: ActivityTimelineKind): string {
  const classNames: Record<ActivityTimelineKind, string> = {
    activity: "border-slate-200 bg-white",
    audit: "border-purple-200 bg-purple-50/70",
    chatter: "border-blue-200 bg-blue-50/70",
    deposit: "border-emerald-200 bg-emerald-50/70",
    document: "border-sky-200 bg-sky-50/70",
    quotation: "border-amber-200 bg-amber-50/70",
    task: "border-rose-200 bg-rose-50/70",
  };

  return classNames[kind];
}
