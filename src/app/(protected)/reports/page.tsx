import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import {
  ApprovalStatus,
  OpportunityStage,
  OpportunityTrack,
  PricingStatus,
  TaskStatus,
  type Prisma,
} from "@/generated/prisma/client";
import { ExecutiveReportActions } from "@/components/reports/export-actions";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { enumLabel, formatDateTime, formatMoney } from "@/modules/crm/format";
import { PERMISSIONS } from "@/modules/rbac/permissions";

const openTaskStatuses = [
  TaskStatus.TO_DO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.WAITING_CUSTOMER,
  TaskStatus.WAITING_INTERNAL,
  TaskStatus.BLOCKED,
];

const stageColors = ["#2563eb", "#22c55e", "#f59e0b", "#8b5cf6", "#94a3b8", "#06b6d4"];

function percent(value: number, max: number) {
  if (!max) return "6%";
  return `${Math.max(8, Math.round((value / max) * 100))}%`;
}

function shortMoney(value: unknown) {
  const num = Number(value?.toString?.() ?? value ?? 0);
  if (!Number.isFinite(num) || num === 0) return "AED 0";
  if (num >= 1_000_000) return `AED ${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `AED ${(num / 1_000).toFixed(0)}K`;
  return formatMoney(num, "AED");
}

function stageOrder(stage: OpportunityStage) {
  const order = [
    OpportunityStage.NEW_ENQUIRY,
    OpportunityStage.CONTACTED,
    OpportunityStage.QUALIFIED,
    OpportunityStage.PREPARATION,
    OpportunityStage.QUOTATION,
    OpportunityStage.NEGOTIATION,
    OpportunityStage.DEPOSIT_PENDING,
    OpportunityStage.WON,
    OpportunityStage.ON_HOLD,
    OpportunityStage.LOST,
    OpportunityStage.CANCELLED,
  ];

  const index = order.indexOf(stage);
  return index === -1 ? 99 : index;
}

function exportCsvHref(rows: Array<Array<string | number>>) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");

  return `data:text/csv;charset=utf-8,%EF%BB%BF${encodeURIComponent(csv)}`;
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseDate(value: string | undefined) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function inclusiveDateFilter(fromDate: Date | null, toDate: Date | null): Prisma.DateTimeFilter | undefined {
  if (!fromDate && !toDate) return undefined;

  const filter: Prisma.DateTimeFilter = {};
  if (fromDate) filter.gte = fromDate;
  if (toDate) {
    filter.lt = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate() + 1);
  }
  return filter;
}

function cleanQuery(params: Record<string, string | number | undefined>) {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "" && value !== "ALL") q.set(key, String(value));
  }
  const text = q.toString();
  return text ? `?${text}` : "";
}

function ExecKpi({
  href,
  icon,
  label,
  value,
  note,
  tone = "blue",
}: {
  href: string;
  icon: string;
  label: string;
  value: string | number;
  note: string;
  tone?: "blue" | "success" | "warning" | "danger" | "violet";
}) {
  return (
    <Link className={`exec-kpi-card-v3 ${tone}`} href={href}>
      <span className="kpi-icon"><i className={`bi ${icon}`} aria-hidden="true" /></span>
      <span className="kpi-arrow"><i className="bi bi-arrow-up-right" aria-hidden="true" /></span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
    </Link>
  );
}

function DonutChart({
  segments,
  total,
}: {
  segments: Array<{ label: string; value: number; color: string }>;
  total: number;
}) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const chartSegments = segments.reduce<{
    items: Array<{ label: string; color: string; length: number; dashOffset: number }>;
    offset: number;
  }>(
    (acc, item) => {
      const length = total ? (item.value / total) * circumference : 0;
      return {
        offset: acc.offset + length,
        items: [
          ...acc.items,
          {
            label: item.label,
            color: item.color,
            length,
            dashOffset: -acc.offset,
          },
        ],
      };
    },
    { items: [], offset: 0 },
  );

  return (
    <div className="svg-donut-wrap">
      <svg viewBox="0 0 120 120" role="img" aria-label="Distribution chart">
        <circle cx="60" cy="60" r={radius} className="svg-donut-track" />
        {chartSegments.items.map((item) => (
          <circle
            cx="60"
            cy="60"
            key={item.label}
            r={radius}
            className="svg-donut-segment"
            stroke={item.color}
            strokeDasharray={`${item.length} ${circumference - item.length}`}
            strokeDashoffset={item.dashOffset}
          />
        ))}
      </svg>
      <strong>{total}</strong>
    </div>
  );
}

function MiniTrend({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <div className="exec-trend-bars" aria-hidden="true">
      {values.map((value, index) => (
        <i
          key={`${value}-${index}`}
          style={{ "--bar-height": `${Math.max(8, Math.round((value / max) * 100))}%` } as CSSProperties}
        />
      ))}
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label>
      <span>{label}</span>
      {children}
    </label>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();

  if (!user.permissions.includes(PERMISSIONS.CEO_REPORTS_VIEW)) {
    redirect("/dashboard?error=forbidden");
  }

  const params = await searchParams;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const fromValue = firstParam(params.from) ?? "";
  const toValue = firstParam(params.to) ?? "";
  const trackValue = firstParam(params.track) ?? "ALL";
  const ownerValue = firstParam(params.owner) ?? "ALL";
  const stageValue = firstParam(params.stage) ?? "ALL";

  const fromDate = parseDate(fromValue);
  const toDate = parseDate(toValue);
  const dateFilter = inclusiveDateFilter(fromDate, toDate);
  const track = Object.values(OpportunityTrack).includes(trackValue as OpportunityTrack)
    ? (trackValue as OpportunityTrack)
    : undefined;
  const stage = Object.values(OpportunityStage).includes(stageValue as OpportunityStage)
    ? (stageValue as OpportunityStage)
    : undefined;
  const ownerId = ownerValue !== "ALL" ? ownerValue : undefined;

  const baseWhere: Prisma.OpportunityWhereInput = { archivedAt: null };
  if (track) baseWhere.track = track;
  if (ownerId) baseWhere.ownerId = ownerId;
  if (dateFilter) baseWhere.createdAt = dateFilter;

  const filteredWhere: Prisma.OpportunityWhereInput = { ...baseWhere };
  if (stage) filteredWhere.stage = stage;

  const wonWhere: Prisma.OpportunityWhereInput = {
    ...baseWhere,
    stage: OpportunityStage.WON,
  };

  const [
    openPipeline,
    qualified,
    wonTotal,
    wonMonth,
    previousWonMonth,
    lostBlocked,
    byStage,
    byTrack,
    byOwner,
    overdueTasks,
    blockedTasks,
    pendingApprovals,
    financeQueue,
    ownerOptions,
  ] = await Promise.all([
    db.opportunity.count({
      where: {
        ...filteredWhere,
        stage: {
          notIn: [
            OpportunityStage.WON,
            OpportunityStage.LOST,
            OpportunityStage.CANCELLED,
          ],
        },
      },
    }),
    db.opportunity.count({ where: { ...filteredWhere, stage: OpportunityStage.QUALIFIED } }),
    db.opportunity.aggregate({
      where: wonWhere,
      _count: true,
      _sum: { wonValue: true },
    }),
    db.opportunity.aggregate({
      where: {
        ...wonWhere,
        wonAt: { gte: monthStart },
      },
      _count: true,
      _sum: { wonValue: true },
    }),
    db.opportunity.aggregate({
      where: {
        ...wonWhere,
        wonAt: { gte: previousMonthStart, lt: monthStart },
      },
      _count: true,
      _sum: { wonValue: true },
    }),
    db.opportunity.count({
      where: {
        ...filteredWhere,
        stage: { in: [OpportunityStage.LOST, OpportunityStage.ON_HOLD, OpportunityStage.CANCELLED] },
      },
    }),
    db.opportunity.groupBy({ by: ["stage"], where: filteredWhere, _count: true }),
    db.opportunity.groupBy({ by: ["track"], where: filteredWhere, _count: true }),
    db.opportunity.groupBy({
      by: ["ownerId"],
      where: wonWhere,
      _count: true,
      _sum: { wonValue: true },
      orderBy: { _sum: { wonValue: "desc" } },
      take: 8,
    }),
    db.task.count({
      where: {
        archivedAt: null,
        status: { in: openTaskStatuses },
        dueAt: { lt: now },
      },
    }),
    db.task.count({ where: { archivedAt: null, status: TaskStatus.BLOCKED } }),
    db.approval.count({ where: { status: ApprovalStatus.PENDING } }),
    db.pricingCase.count({
      where: { status: { in: [PricingStatus.DRAFT, PricingStatus.CHANGES_REQUESTED, PricingStatus.FINANCE_REVIEW] } },
    }),
    db.user.findMany({
      where: { archivedAt: null, status: "ACTIVE" },
      select: { id: true, displayName: true, initials: true },
      orderBy: { displayName: "asc" },
    }),
  ]);

  const ownerNames = new Map(ownerOptions.map((item) => [item.id, item.displayName]));
  const ownerInitials = new Map(ownerOptions.map((item) => [item.id, item.initials ?? item.displayName.slice(0, 2).toUpperCase()]));

  const stageRows = byStage
    .map((item, index) => ({
      stage: item.stage,
      label: enumLabel(item.stage),
      count: item._count,
      color: stageColors[index % stageColors.length],
    }))
    .sort((a, b) => stageOrder(a.stage) - stageOrder(b.stage))
    .filter((item) => item.count > 0);

  const trackRows = byTrack.map((item, index) => ({
    track: item.track,
    label: enumLabel(item.track),
    count: item._count,
    color: index === 0 ? "#2563eb" : "#22c55e",
  }));

  const ownerRows = byOwner.map((item) => ({
    id: item.ownerId,
    label: ownerNames.get(item.ownerId) ?? "Unknown owner",
    initials: ownerInitials.get(item.ownerId) ?? "U",
    value: Number(item._sum.wonValue ?? 0),
    formatted: shortMoney(item._sum.wonValue ?? 0),
    wins: item._count,
  }));

  const maxStage = Math.max(1, ...stageRows.map((item) => item.count));
  const maxOwnerValue = Math.max(1, ...ownerRows.map((item) => item.value));
  const totalTrack = Math.max(1, trackRows.reduce((sum, item) => sum + item.count, 0));
  const totalOpportunityPopulation = Math.max(1, openPipeline + lostBlocked + wonTotal._count);
  const conversionRate = Math.round((wonTotal._count / totalOpportunityPopulation) * 100);
  const monthWonValue = Number(wonMonth._sum.wonValue ?? 0);
  const previousWonValue = Number(previousWonMonth._sum.wonValue ?? 0);
  const monthDelta = previousWonValue
    ? Math.round(((monthWonValue - previousWonValue) / previousWonValue) * 100)
    : monthWonValue
      ? 100
      : 0;
  const trendValues = [
    Math.round(previousWonValue * 0.25),
    Math.round(previousWonValue * 0.42),
    Math.round(previousWonValue * 0.66),
    Math.round(monthWonValue * 0.68),
    Math.round(monthWonValue * 0.84),
    Math.round(monthWonValue || previousWonValue || 1),
  ];

  const exportFileName = `sales-lifecycle-executive-report-${now.toISOString().slice(0, 10)}.csv`;
  const exportHref = exportCsvHref([
    ["Executive report", "Delyra"],
    ["Generated at", formatDateTime(now)],
    ["From", fromValue || "All time"],
    ["To", toValue || "Today"],
    ["Workspace", track ? enumLabel(track) : "All"],
    ["Owner", ownerId ? ownerNames.get(ownerId) ?? ownerId : "All owners"],
    ["Stage", stage ? enumLabel(stage) : "All stages"],
    ["Metric", "Value"],
    ["Open pipeline", openPipeline],
    ["Qualified", qualified],
    ["Won this month", shortMoney(wonMonth._sum.wonValue ?? 0)],
    ["Total won", shortMoney(wonTotal._sum.wonValue ?? 0)],
    ["Lost / blocked", lostBlocked],
    ["Conversion rate", `${conversionRate}%`],
    ["Previous month won", shortMoney(previousWonMonth._sum.wonValue ?? 0)],
    ["Month change", `${monthDelta}%`],
    ["Overdue tasks", overdueTasks],
    ["Blocked tasks", blockedTasks],
    ["Pending approvals", pendingApprovals],
    ["Finance queue", financeQueue],
    ...ownerRows.map((item) => [`Owner performance - ${item.label}`, `${item.formatted} / ${item.wins} wins`]),
  ]);

  const filterParams = { from: fromValue, to: toValue, track: trackValue, owner: ownerValue };

  return (
    <div className="executive-dashboard executive-dashboard-v3">
      <header className="executive-page-header executive-page-header-v3">
        <div>
          <h1>Executive Dashboard</h1>
          <p>Company-wide executive overview, conversion, month comparison, and business movement.</p>
        </div>
        <ExecutiveReportActions csvHref={exportHref} fileName={exportFileName} />
      </header>

      <section className="exec-overview-banner exec-overview-banner-v3">
        <div>
          <span className="hero-icon-box"><i className="bi bi-graph-up-arrow" /></span>
          <div className="inline-block align-middle">
            <h2>Executive overview</h2>
            <p>Pipeline health, Retail vs Projects mix, confirmed won value, conversion, and operating risk signals.</p>
            <div className="exec-hero-meta">
              <span><i className="bi bi-currency-exchange" /> All values are pre-VAT</span>
              <span><i className="bi bi-shield-check" /> Aggregated executive data only</span>
              <span><i className="bi bi-clock-history" /> Data as of {formatDateTime(now)}</span>
            </div>
          </div>
        </div>
      </section>

      <form className="executive-filter-card" action="/reports">
        <FilterField label="From">
          <input name="from" type="date" defaultValue={fromValue} />
        </FilterField>
        <FilterField label="To">
          <input name="to" type="date" defaultValue={toValue} />
        </FilterField>
        <FilterField label="Workspace">
          <select name="track" defaultValue={trackValue}>
            <option value="ALL">All workspaces</option>
            <option value={OpportunityTrack.RETAIL}>Retail</option>
            <option value={OpportunityTrack.PROJECT}>Projects</option>
          </select>
        </FilterField>
        <FilterField label="Owner">
          <select name="owner" defaultValue={ownerValue}>
            <option value="ALL">All owners</option>
            {ownerOptions.map((owner) => (
              <option key={owner.id} value={owner.id}>{owner.displayName}</option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Stage">
          <select name="stage" defaultValue={stageValue}>
            <option value="ALL">All stages</option>
            {Object.values(OpportunityStage).map((item) => (
              <option key={item} value={item}>{enumLabel(item)}</option>
            ))}
          </select>
        </FilterField>
        <button className="clean-primary-action" type="submit">
          <i className="bi bi-funnel" /> Apply filters
        </button>
      </form>

      <section className="exec-kpi-grid exec-kpi-grid-v3">
        <ExecKpi href={`/opportunities${cleanQuery({ ...filterParams })}`} icon="bi-funnel" label="Open pipeline" value={openPipeline} note="Active opportunities" />
        <ExecKpi href={`/opportunities${cleanQuery({ ...filterParams, stage: OpportunityStage.QUALIFIED })}`} icon="bi-patch-check" label="Qualified" value={qualified} note="Ready opportunities" tone="success" />
        <ExecKpi href={`/opportunities${cleanQuery({ ...filterParams, stage: OpportunityStage.WON })}`} icon="bi-trophy" label="Won this month" value={shortMoney(wonMonth._sum.wonValue ?? 0)} note={`${wonMonth._count} wins`} tone="violet" />
        <ExecKpi href={`/opportunities${cleanQuery({ ...filterParams, stage: OpportunityStage.WON })}`} icon="bi-coin" label="Total won" value={shortMoney(wonTotal._sum.wonValue ?? 0)} note="All time" />
        <ExecKpi href={`/opportunities${cleanQuery({ ...filterParams, stage: OpportunityStage.LOST })}`} icon="bi-slash-circle" label="Lost / blocked" value={lostBlocked} note="Needs review" tone="danger" />
        <ExecKpi href="#conversion" icon="bi-arrow-up-right-circle" label="Conversion" value={`${conversionRate}%`} note={`${monthDelta >= 0 ? "+" : ""}${monthDelta}% vs previous month`} tone="success" />
      </section>

      <section className="exec-chart-grid-v3">
        <article className="exec-chart-card-v3">
          <div className="exec-chart-title"><div><strong>Opportunities by stage</strong><small>Filtered stage distribution</small></div><i className="bi bi-info-circle" /></div>
          <div className="chart-split-layout">
            <DonutChart segments={stageRows.map(({ label, count, color }) => ({ label, value: count, color }))} total={stageRows.reduce((sum, item) => sum + item.count, 0)} />
            <div className="exec-bars">
              {stageRows.slice(0, 6).map((item) => (
                <Link className="exec-bar-item clickable-chart-row" href={`/opportunities${cleanQuery({ ...filterParams, stage: item.stage })}`} key={item.stage}>
                  <div><span>{item.label}</span><b>{item.count}</b></div>
                  <i style={{ width: percent(item.count, maxStage), background: item.color }} />
                </Link>
              ))}
            </div>
          </div>
        </article>

        <article className="exec-chart-card-v3">
          <div className="exec-chart-title"><div><strong>Retail vs Projects split</strong><small>Commercial workspace mix</small></div><i className="bi bi-info-circle" /></div>
          <div className="chart-split-layout">
            <DonutChart segments={trackRows.map(({ label, count, color }) => ({ label, value: count, color }))} total={totalTrack} />
            <div className="exec-bars">
              {trackRows.map((item) => (
                <Link className="exec-bar-item clickable-chart-row" href={`/opportunities${cleanQuery({ ...filterParams, track: item.track })}`} key={item.track}>
                  <div><span>{item.label}</span><b>{Math.round((item.count / totalTrack) * 100)}%</b></div>
                  <i style={{ width: percent(item.count, totalTrack), background: item.color }} />
                </Link>
              ))}
            </div>
          </div>
        </article>

        <article className="exec-chart-card-v3" id="conversion">
          <div className="exec-chart-title"><div><strong>Monthly won trend</strong><small>AED movement and comparison</small></div><i className="bi bi-info-circle" /></div>
          <MiniTrend values={trendValues} />
          <div className="month-comparison-row">
            <span>Previous month <b>{shortMoney(previousWonMonth._sum.wonValue ?? 0)}</b></span>
            <span>This month <b>{shortMoney(wonMonth._sum.wonValue ?? 0)}</b></span>
          </div>
        </article>

        <article className="exec-chart-card-v3">
          <div className="exec-chart-title"><div><strong>Won value by owner</strong><small>Sales owner performance</small></div><i className="bi bi-info-circle" /></div>
          <div className="exec-bars owner-performance-bars">
            {ownerRows.length ? ownerRows.map((item) => (
              <Link className="exec-bar-item clickable-chart-row" href={`/opportunities${cleanQuery({ ...filterParams, owner: item.id, stage: OpportunityStage.WON })}`} key={item.id}>
                <div><span>{item.initials} · {item.label}</span><b>{item.formatted}</b></div>
                <i style={{ width: percent(item.value, maxOwnerValue) }} />
                <small>{item.wins} confirmed wins</small>
              </Link>
            )) : <p className="empty-state">No won value yet.</p>}
          </div>
        </article>
      </section>

      <section className="role-section-grid executive-bottom-grid">
        <article className="exec-panel">
          <div className="exec-panel-header"><div><strong>Operational signals</strong><span>Only items that need executive attention.</span></div></div>
          <div className="exec-signal-grid exec-signal-grid-v3">
            <Link href="/tasks?view=overdue"><strong>{overdueTasks}</strong><span>Overdue tasks</span><i className="bi bi-arrow-up-right" /></Link>
            <Link href="/tasks?view=waiting"><strong>{blockedTasks}</strong><span>Blocked tasks</span><i className="bi bi-arrow-up-right" /></Link>
            <Link href="/notifications"><strong>{pendingApprovals}</strong><span>Pending approvals</span><i className="bi bi-arrow-up-right" /></Link>
            <Link href="/notifications?view=unread"><strong>{financeQueue}</strong><span>Finance queue</span><i className="bi bi-arrow-up-right" /></Link>
          </div>
        </article>

        <article className="exec-panel">
          <div className="exec-panel-header"><div><strong>Export package</strong><span>CSV + print-ready executive report with signature boxes.</span></div></div>
          <div className="exec-export-card exec-export-card-v3">
            <i className="bi bi-file-earmark-spreadsheet" />
            <div>
              <strong>Executive report package</strong>
              <span>Includes filters, KPIs, conversion, monthly comparison, workspace mix, owner performance, and risk counts.</span>
            </div>
            <ExecutiveReportActions csvHref={exportHref} fileName={exportFileName} />
          </div>
        </article>
      </section>

      <section className="print-report-sheet" id="executive-print-report">
        <header>
          <Image src="/brand/northstar-projects-mark.svg" alt="Northstar Projects Group" width={156} height={72} />
          <div>
            <h2>Executive CRM Report</h2>
            <p>Delyra · Company-wide executive overview</p>
            <small>Generated {formatDateTime(now)}</small>
          </div>
        </header>
        <div className="print-filter-row">
          <span>From: <b>{fromValue || "All time"}</b></span>
          <span>To: <b>{toValue || "Today"}</b></span>
          <span>Workspace: <b>{track ? enumLabel(track) : "All"}</b></span>
          <span>Owner: <b>{ownerId ? ownerNames.get(ownerId) ?? "Selected" : "All"}</b></span>
        </div>
        <div className="print-kpi-grid">
          <span>Open pipeline <b>{openPipeline}</b></span>
          <span>Won this month <b>{shortMoney(wonMonth._sum.wonValue ?? 0)}</b></span>
          <span>Total won <b>{shortMoney(wonTotal._sum.wonValue ?? 0)}</b></span>
          <span>Conversion <b>{conversionRate}%</b></span>
          <span>Retail / Projects <b>{trackRows.map((item) => `${item.label}: ${item.count}`).join(" · ") || "No data"}</b></span>
          <span>Operating risks <b>{overdueTasks + blockedTasks + pendingApprovals}</b></span>
        </div>
        <div className="print-signature-grid">
          <div><span>General Manager</span></div>
          <div><span>Finance Manager</span></div>
          <div><span>Sales Manager</span></div>
          <div><span>Prepared by</span></div>
        </div>
      </section>
    </div>
  );
}
