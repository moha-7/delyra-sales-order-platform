import Link from "next/link";
import { redirect } from "next/navigation";
import {
  OpportunityStage,
  OpportunityTrack,
  TaskStatus,
  UserStatus,
  RoleKey,
  type Prisma,
} from "@/generated/prisma/client";
import { StatusPill } from "@/components/crm/status-pill";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import {
  canViewOpportunities,
  opportunityViewWhere,
} from "@/modules/crm/access";
import { enumLabel, formatDateTime, formatMoney } from "@/modules/crm/format";
import { navigationScopeFor } from "@/modules/auth/navigation";
import { reassignOpportunityOwnerFromPipelineAction } from "@/modules/crm/manager-actions";

const blockedStages: OpportunityStage[] = [
  OpportunityStage.ON_HOLD,
  OpportunityStage.CANCELLED,
  OpportunityStage.LOST,
];

const pipelineGroups = [
  {
    key: "intake",
    label: "Intake",
    hint: "New and contacted leads",
    icon: "bi-inbox",
    stages: [OpportunityStage.NEW_ENQUIRY, OpportunityStage.CONTACTED],
  },
  {
    key: "qualified",
    label: "Qualified",
    hint: "Ready for design or scope",
    icon: "bi-patch-check",
    stages: [OpportunityStage.QUALIFIED],
  },
  {
    key: "preparation",
    label: "Preparation",
    hint: "Design, files and Design",
    icon: "bi-rulers",
    stages: [OpportunityStage.PREPARATION],
  },
  {
    key: "commercial",
    label: "Commercial",
    hint: "Quotation and negotiation",
    icon: "bi-receipt",
    stages: [OpportunityStage.QUOTATION, OpportunityStage.NEGOTIATION],
  },
  {
    key: "deposit",
    label: "Deposit / Won",
    hint: "Finance confirmation",
    icon: "bi-cash-coin",
    stages: [OpportunityStage.DEPOSIT_PENDING, OpportunityStage.WON],
  },
  {
    key: "blocked",
    label: "Closed / blocked",
    hint: "Lost, on hold or cancelled",
    icon: "bi-slash-circle",
    stages: [OpportunityStage.ON_HOLD, OpportunityStage.LOST, OpportunityStage.CANCELLED],
  },
] as const;

function stageTone(stage: OpportunityStage) {
  if (stage === OpportunityStage.WON) return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (blockedStages.includes(stage)) return "bg-red-50 text-red-700 ring-red-100";
  return "bg-blue-50 text-blue-700 ring-blue-100";
}

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stage?: string; track?: string; managerAction?: string }>;
}) {
  const user = await requireUser();
  if (!canViewOpportunities(user)) redirect("/dashboard?error=forbidden");

  const scope = navigationScopeFor(user);
  const canSwitchMode = scope.workspace === "mixed";
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const stage = Object.values(OpportunityStage).includes(
    params.stage as OpportunityStage,
  )
    ? (params.stage as OpportunityStage)
    : undefined;
  const requestedTrack = Object.values(OpportunityTrack).includes(
    params.track as OpportunityTrack,
  )
    ? (params.track as OpportunityTrack)
    : undefined;
  const track = canSwitchMode ? requestedTrack : undefined;
  const managerAction =
    params.managerAction === "reassign" || params.managerAction === "return-to-sales"
      ? params.managerAction
      : undefined;
  const directAssignMode = managerAction === "reassign" && user.roles.includes(RoleKey.MANAGER);
  const financeOnlyView =
    user.roles.includes(RoleKey.FINANCE) &&
    !user.roles.includes(RoleKey.MANAGER) &&
    !user.roles.includes(RoleKey.DESIGNER) &&
    !user.roles.includes(RoleKey.ORDER_COORDINATOR);

  const filters: Prisma.OpportunityWhereInput[] = [
    { archivedAt: null },
    opportunityViewWhere(user),
  ];
  // Finance no longer works on Won opportunities; Won records continue with Order Coordination / Handover and the Sales owner.
  if (financeOnlyView) filters.push({ stage: { not: OpportunityStage.WON } });
  // Finance no longer works on Won opportunities; Won records continue with Order Coordination / Handover and the Sales owner.
  if (financeOnlyView) filters.push({ stage: { not: OpportunityStage.WON } });
  if (stage) filters.push({ stage });
  if (track) filters.push({ track });
  if (query) {
    filters.push({
      OR: [
        { reference: { contains: query, mode: "insensitive" } },
        { title: { contains: query, mode: "insensitive" } },
        { designReference: { contains: query, mode: "insensitive" } },
        { customer: { name: { contains: query, mode: "insensitive" } } },
      ],
    });
  }

  const opportunities = await db.opportunity.findMany({
    where: { AND: filters },
    include: {
      owner: { select: { displayName: true } },
      customer: { select: { id: true, reference: true, name: true } },
      tasks: {
        where: {
          archivedAt: null,
          status: { notIn: [TaskStatus.COMPLETED, TaskStatus.CANCELLED] },
        },
        select: { id: true, status: true },
        take: 5,
      },
    },
    orderBy: [{ nextFollowUpAt: "asc" }, { updatedAt: "desc" }],
    take: 120,
  });

  const salesOwners = directAssignMode
    ? await db.user.findMany({
        where: {
          status: UserStatus.ACTIVE,
          archivedAt: null,
          userRoles: {
            some: {
              role: { key: { in: [RoleKey.RETAIL_SALES, RoleKey.PROJECT_SALES] } },
            },
          },
        },
        select: {
          id: true,
          displayName: true,
          initials: true,
          department: true,
        },
        orderBy: { displayName: "asc" },
      })
    : [];
  const retailCount = opportunities.filter((item) => item.track === OpportunityTrack.RETAIL).length;
  const projectCount = opportunities.filter((item) => item.track === OpportunityTrack.PROJECT).length;
  const blockedCount = opportunities.filter((item) => blockedStages.includes(item.stage)).length;
  const stageColumns = pipelineGroups
    .map((group) => ({
      ...group,
      items: opportunities.filter((item) => (group.stages as readonly OpportunityStage[]).includes(item.stage)),
    }))
    .filter((column) => column.items.length || !stage);

  function opportunityCardHref(opportunityId: string) {
    if (managerAction === "reassign") {
      return `/opportunities/${opportunityId}?section=ownership&focus=reassign#ownership-reassignment`;
    }

    if (managerAction === "return-to-sales") {
      return `/opportunities/${opportunityId}?section=ownership&focus=return-to-sales#ownership-reassignment`;
    }

    return `/opportunities/${opportunityId}`;
  }

  const managerActionLabel =
    managerAction === "reassign"
      ? "Assign owner"
      : managerAction === "return-to-sales"
        ? "Return to sales"
        : null;

  return (
    <div className="ux-page content-page">
      <section className="ux-hero pipeline-hero">
        <div className="ux-hero-row">
          <div>
            <p className="ux-hero-kicker">Pipeline center</p>
            <h1>Pipeline</h1>
            <p>
              Compact CRM board grouped by the real operating stages: intake, qualification, preparation, commercial, deposit, and blockers.
            </p>
            <div className="ux-chip-row">
              <span className="ux-chip"><i className="bi bi-person-badge" /> Role: {scope.roleLabel}</span>
              <span className="ux-chip"><i className="bi bi-building" /> {scope.label}</span>
              <span className="ux-chip"><i className="bi bi-funnel" /> {scope.scopeLabel}</span>
            </div>
          </div>
          <div className="ux-hero-metrics">
            <article><span>Visible</span><strong>{opportunities.length}</strong></article>
            <article><span>Retail</span><strong>{retailCount}</strong></article>
            <article><span>Projects</span><strong>{projectCount}</strong></article>
            <article><span>Blocked</span><strong>{blockedCount}</strong></article>
          </div>
        </div>
      </section>

      <form className={canSwitchMode ? "filter-bar pipeline-filter-bar" : "filter-bar pipeline-filter-bar no-track-filter"} method="get">
        <input name="q" defaultValue={query} placeholder="Search reference, title, customer, or Design ref" />
        <select name="stage" defaultValue={stage ?? ""}>
          <option value="">All stages</option>
          {Object.values(OpportunityStage).map((value) => (
            <option value={value} key={value}>{enumLabel(value)}</option>
          ))}
        </select>
        {canSwitchMode ? (
          <select name="track" defaultValue={track ?? ""}>
            <option value="">All workspaces</option>
            {Object.values(OpportunityTrack).map((value) => (
              <option value={value} key={value}>{enumLabel(value)}</option>
            ))}
          </select>
        ) : null}
        <button className="secondary-button" type="submit">Filter</button>
      </form>

      {directAssignMode ? (
        <section className="manager-direct-assign-panel" id="manager-direct-assign">
          <header>
            <div>
              <p className="ux-panel-kicker">Manager assignment</p>
              <h2>Assign from Pipeline</h2>
              <p>Authorized managers can change the Sales owner directly here without opening the opportunity detail page.</p>
            </div>
            <span className="pipeline-pill">{salesOwners.length} sales users</span>
          </header>

          <div className="manager-direct-assign-grid">
            {opportunities.map((opportunity) => (
              <form
                action={reassignOpportunityOwnerFromPipelineAction}
                className="manager-direct-assign-card"
                key={`assign-${opportunity.id}`}
              >
                <input type="hidden" name="opportunityId" value={opportunity.id} />
                <div className="manager-direct-assign-body">
                  <strong>{opportunity.title}</strong>
                  <span>{opportunity.reference}</span>
                  <small>{opportunity.customer.name} · Current owner: {opportunity.owner.displayName}</small>
                </div>
                <label>
                  <span>Assign to Sales</span>
                  <select name="ownerId" defaultValue={opportunity.ownerId} required>
                    {salesOwners.map((owner) => (
                      <option value={owner.id} key={owner.id}>
                        {owner.displayName} · {enumLabel(owner.department)}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="primary-button" type="submit">
                  Assign
                </button>
              </form>
            ))}
          </div>
        </section>
      ) : null}
      <section className="ux-panel">
        <header className="ux-panel-header">
          <div>
            <p className="ux-panel-kicker">Operating board</p>
            <h2>{opportunities.length} visible opportunities</h2>
            <p>Grouped for scanning without clipping. Open the detailed list only when you need spreadsheet review.</p>
          </div>
          <span className="pipeline-pill">{scope.roleLabel}</span>
        </header>

        {opportunities.length ? (
          <div className="pipeline-board" aria-label="Opportunity pipeline board">
            {stageColumns.map((column) => (
              <section className="pipeline-column" key={column.key}>
                <header className="pipeline-column-header">
                  <div>
                    <strong><i className={`bi ${column.icon}`} aria-hidden="true" /> {column.label}</strong>
                    <small>{column.hint}</small>
                  </div>
                  <span>{column.items.length}</span>
                </header>
                <div className="pipeline-column-body">
                  {column.items.length ? (
                    column.items.map((opportunity) => (
                      <Link className="pipeline-card" href={opportunityCardHref(opportunity.id)} key={opportunity.id}>
                        <div className="pipeline-card-top">
                          <div>
                            <strong className="pipeline-card-title">{opportunity.title}</strong>
                            <span className="pipeline-card-ref">{opportunity.reference}</span>
                          </div>
                          <span className={`pipeline-pill ring-1 ${stageTone(opportunity.stage)}`}>
                            {enumLabel(opportunity.stage)}
                          </span>
                        </div>
                        <div className="pipeline-card-meta">
                          <span><i className="bi bi-person" /> {opportunity.customer.name}</span>
                          <span><i className="bi bi-person-check" /> {opportunity.owner.displayName}</span>
                          <span><i className="bi bi-cash" /> {formatMoney(opportunity.customerBudgetAed, opportunity.currency)}</span>
                          <span><i className="bi bi-calendar-event" /> {formatDateTime(opportunity.nextFollowUpAt)}</span>
                        </div>
                        <div className="pipeline-card-footer">
                          {canSwitchMode ? <span className="pipeline-pill">{enumLabel(opportunity.track)}</span> : null}
                          {managerActionLabel ? (
                            <span className="pipeline-action-pill"><i className="bi bi-arrow-up-right" /> {managerActionLabel}</span>
                          ) : opportunity.tasks.length ? (
                            <span className="pipeline-pill">{opportunity.tasks.length} open task{opportunity.tasks.length === 1 ? "" : "s"}</span>
                          ) : (
                            <span className="pipeline-pill">No open tasks</span>
                          )}
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="pipeline-empty">No cards in this stage.</div>
                  )}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="empty-state">No opportunities match the current filters.</div>
        )}
      </section>

      <details className="data-card collapsible-card">
        <summary>
          <div className="data-card-header">
            <strong>Detailed list</strong>
            <span>Open only when you need spreadsheet-style scanning.</span>
          </div>
        </summary>
        {opportunities.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Opportunity</th>
                  <th>Customer</th>
                  {canSwitchMode ? <th>Workspace</th> : null}
                  <th>Stage</th>
                  <th>Owner</th>
                  <th>Customer budget</th>
                  <th>Next follow-up</th>
                </tr>
              </thead>
              <tbody>
                {opportunities.map((opportunity) => (
                  <tr key={opportunity.id}>
                    <td><Link href={`/opportunities/${opportunity.id}`}>{opportunity.reference}</Link></td>
                    <td><strong>{opportunity.title}</strong></td>
                    <td>
                      <Link href={`/customers/${opportunity.customer.id}`}>{opportunity.customer.name}</Link>
                      <small>{opportunity.customer.reference}</small>
                    </td>
                    {canSwitchMode ? <td>{enumLabel(opportunity.track)}</td> : null}
                    <td><StatusPill value={opportunity.stage} /></td>
                    <td>{opportunity.owner.displayName}</td>
                    <td>{formatMoney(opportunity.customerBudgetAed, opportunity.currency)}</td>
                    <td>{formatDateTime(opportunity.nextFollowUpAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </details>
    </div>
  );
}
