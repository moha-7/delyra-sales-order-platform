import Link from "next/link";
import { StatusPill } from "@/components/crm/status-pill";
import { db } from "@/lib/db";
import {
  type ActivityTimelineItem,
  compactTimelineBody,
  sortTimelineItems,
  timelineKindClassName,
  timelineKindLabel,
} from "@/modules/activity/timeline";
import { enumLabel, formatDateTime, formatMoney } from "@/modules/crm/format";
import { documentCategoryLabel } from "@/modules/documents/options";

function itemAnchorId(item: ActivityTimelineItem): string {
  return `timeline-${item.kind}-${item.id}`;
}

function ActivityTimelineCard({ item }: { item: ActivityTimelineItem }) {
  const body = compactTimelineBody(item.body, 180);
  const cardClassName = timelineKindClassName(item.kind);

  return (
    <article
      className={`activity-card scroll-mt-28 ${cardClassName}`}
      id={itemAnchorId(item)}
    >
      <span className="activity-card-icon">
        <i className={`bi ${item.kind === "audit" ? "bi-shield-check" : item.kind === "chatter" ? "bi-chat-dots" : item.kind === "task" ? "bi-check2-square" : item.kind === "document" ? "bi-file-earmark-text" : item.kind === "deposit" ? "bi-cash-coin" : "bi-activity"}`} />
      </span>
      <div className="activity-card-body">
        <div className="activity-card-head">
          <div>
            <strong>{item.title}</strong>
            <small>
              {item.actorName ? `${item.actorName} - ` : ""}
              {formatDateTime(item.occurredAt)}
            </small>
          </div>
          <div className="activity-card-badges">
            <StatusPill value={timelineKindLabel(item.kind)} />
            {item.status ? <StatusPill value={item.status} /> : null}
          </div>
        </div>
        {item.secondary ? <p className="activity-secondary">{item.secondary}</p> : null}
        {body ? <p className="activity-body">{body}</p> : null}
      </div>
      {item.href ? (
        <Link className="activity-open" href={item.href}>
          Open
        </Link>
      ) : null}
    </article>
  );
}

export async function ActivityTimelinePanel({
  opportunityId,
}: {
  opportunityId: string;
}) {
  const [
    chatterMessages,
    tasks,
    documents,
    quotations,
    deposits,
    activities,
    auditLogs,
  ] = await Promise.all([
    db.chatterMessage.findMany({
      where: { opportunityId, archivedAt: null },
      include: { author: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    db.task.findMany({
      where: { opportunityId, archivedAt: null },
      include: {
        assignedTo: { select: { displayName: true } },
        createdBy: { select: { displayName: true } },
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: 12,
    }),
    db.document.findMany({
      where: { opportunityId, archivedAt: null },
      include: {
        versions: {
          orderBy: { versionNo: "desc" },
          take: 1,
          include: { uploadedBy: { select: { displayName: true } } },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 12,
    }),
    db.quotation.findMany({
      where: { opportunityId, archivedAt: null },
      include: {
        createdBy: { select: { displayName: true } },
        versions: {
          orderBy: { versionNo: "desc" },
          take: 1,
          include: {
            createdBy: { select: { displayName: true } },
            sentBy: { select: { displayName: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 12,
    }),
    db.deposit.findMany({
      where: { opportunityId },
      include: {
        submittedBy: { select: { displayName: true } },
        reviewedBy: { select: { displayName: true } },
      },
      orderBy: { submittedAt: "desc" },
      take: 12,
    }),
    db.activity.findMany({
      where: { opportunityId },
      include: { createdBy: { select: { displayName: true } } },
      orderBy: { occurredAt: "desc" },
      take: 12,
    }),
    db.auditLog.findMany({
      where: { opportunityId },
      include: { actor: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  const timelineItems = sortTimelineItems<ActivityTimelineItem>([
    ...chatterMessages.map((message) => ({
      id: message.id,
      kind: "chatter" as const,
      title: "Internal chatter update",
      occurredAt: message.createdAt,
      actorName: message.author.displayName,
      body: message.body,
      href: `#message-${message.id}`,
      secondary: "Internal collaboration note",
    })),
    ...tasks.map((task) => ({
      id: task.id,
      kind: "task" as const,
      title: task.title,
      occurredAt: task.updatedAt,
      actorName: task.createdBy.displayName,
      body: task.description ?? task.blockedReason,
      href: task.actionUrl ?? `/tasks/${task.id}`,
      status: enumLabel(task.status),
      secondary: `${task.reference} - assigned to ${task.assignedTo.displayName} - priority ${enumLabel(task.priority)}`,
    })),
    ...documents.map((document) => {
      const currentVersion = document.versions[0] ?? null;

      return {
        id: document.id,
        kind: "document" as const,
        title: documentCategoryLabel(document.category),
        occurredAt: currentVersion?.createdAt ?? document.updatedAt,
        actorName: currentVersion?.uploadedBy.displayName ?? null,
        body: currentVersion?.originalName ?? document.title,
        href: currentVersion ? `/api/documents/${currentVersion.id}/download` : null,
        status: enumLabel(document.confidentiality),
        secondary: currentVersion ? `v${currentVersion.versionNo}` : "No uploaded version",
      };
    }),
    ...quotations.map((quotation) => {
      const currentVersion = quotation.versions[0] ?? null;

      return {
        id: quotation.id,
        kind: "quotation" as const,
        title: quotation.businessReference,
        occurredAt: currentVersion?.createdAt ?? quotation.updatedAt,
        actorName:
          currentVersion?.sentBy?.displayName ??
          currentVersion?.createdBy.displayName ??
          quotation.createdBy.displayName,
        body: currentVersion?.notes ?? null,
        href: currentVersion
          ? `/quotations/${quotation.id}/preview?version=${currentVersion.id}`
          : null,
        status: enumLabel(currentVersion?.status ?? quotation.status),
        secondary: currentVersion
          ? `v${currentVersion.versionNo} - ${formatMoney(currentVersion.preVatAmount, currentVersion.currency)}`
          : "No quotation version",
      };
    }),
    ...deposits.map((deposit) => ({
      id: deposit.id,
      kind: "deposit" as const,
      title: deposit.reference ?? "Deposit receipt",
      occurredAt: deposit.reviewedAt ?? deposit.submittedAt,
      actorName: deposit.reviewedBy?.displayName ?? deposit.submittedBy.displayName,
      body: deposit.reviewNotes ?? deposit.paymentReference,
      href: `/deposits/${deposit.id}/receipt`,
      status: enumLabel(deposit.status),
      secondary: formatMoney(deposit.submittedAmount, deposit.currency),
    })),
    ...activities.map((activity) => ({
      id: activity.id,
      kind: "activity" as const,
      title: activity.subject,
      occurredAt: activity.occurredAt,
      actorName: activity.createdBy.displayName,
      body: activity.body,
      href: activity.actionUrl,
      status: enumLabel(activity.type),
      secondary: "Operational activity",
    })),
    ...auditLogs.map((auditLog) => ({
      id: auditLog.id,
      kind: "audit" as const,
      title: `${enumLabel(auditLog.action)} ${auditLog.entityType}`,
      occurredAt: auditLog.createdAt,
      actorName: auditLog.actor?.displayName ?? "System",
      body: auditLog.actionUrl ?? null,
      href: auditLog.actionUrl,
      status: enumLabel(auditLog.action),
      secondary: `Entity ${auditLog.entityId}`,
    })),
  ]).slice(0, 35);

  const counts = timelineItems.reduce(
    (accumulator, item) => {
      accumulator[item.kind] = (accumulator[item.kind] ?? 0) + 1;
      return accumulator;
    },
    {} as Partial<Record<ActivityTimelineItem["kind"], number>>,
  );


  return (
    <section className="activity-panel" id="activity">
      <header className="activity-panel-header">
        <div>
          <p className="ux-panel-kicker">Activity / audit</p>
          <h2>Timeline</h2>
          <p>Latest operational trace, kept at the end of the workspace for review and audit.</p>
        </div>
        <div className="activity-counts">
          <span>{timelineItems.length} events</span>
          <span>{counts.chatter ?? 0} chatter</span>
          <span>{counts.task ?? 0} tasks</span>
          <span>{counts.audit ?? 0} audit</span>
        </div>
      </header>

      {timelineItems.length ? (
        <div className="activity-timeline-list">
          {timelineItems.map((item) => (
            <ActivityTimelineCard item={item} key={`${item.kind}-${item.id}`} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          No operational activity has been recorded for this opportunity yet.
        </div>
      )}
    </section>
  );
}