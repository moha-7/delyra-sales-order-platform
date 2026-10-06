import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ApprovalStatus,
  DepositStatus,
  DesignJobStatus,
  HandoverStatus,
  LeadStatus,
  OpportunityStage,
  PricingStatus,
  RoleKey,
  TaskStatus,
} from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { formatDateTime, formatMoney } from "@/modules/crm/format";
import { canViewLeads, canViewOpportunities, leadViewWhere, opportunityViewWhere } from "@/modules/crm/access";
import { taskViewWhere } from "@/modules/tasks/access";

const closedTasks = [TaskStatus.COMPLETED, TaskStatus.CANCELLED];
const openTasks = [TaskStatus.TO_DO, TaskStatus.IN_PROGRESS, TaskStatus.WAITING_CUSTOMER, TaskStatus.WAITING_INTERNAL, TaskStatus.BLOCKED];

function hasRole(userRoles: readonly string[], role: RoleKey) {
  return userRoles.includes(role);
}

function primaryRole(userRoles: readonly string[]) {
  if (hasRole(userRoles, RoleKey.CEO_VIEWER)) return "ceo";
  if (hasRole(userRoles, RoleKey.FINANCE)) return "finance";
  if (hasRole(userRoles, RoleKey.ORDER_COORDINATOR)) return "orders";
  if (hasRole(userRoles, RoleKey.MANAGER)) return "manager";
  if (hasRole(userRoles, RoleKey.DESIGNER)) return "designer";
  return "sales";
}

function hero(role: string, userName: string) {
  if (role === "finance") return { title: "Finance Dashboard", subtitle: "Company-wide finance workspace.", icon: "bi-calculator", note: "Review pricing approvals, deposits, and finance queues without opening the sales pipeline." };
  if (role === "orders") return { title: "Orders / Handover Dashboard", subtitle: "Order Coordination and order coordination workspace.", icon: "bi-box-seam", note: "Track won handovers, PO status, ETA updates, and Supplier coordination." };
  if (role === "designer") return { title: "Designer Dashboard", subtitle: "Assigned design and design package workspace.", icon: "bi-pencil-square", note: "Focus on assigned designs, missing files, revisions, and design packages." };
  if (role === "manager") return { title: "Sales Manager Dashboard", subtitle: "Team oversight and control center.", icon: "bi-people", note: `${userName} can review team movement, export reports, and manage ownership changes.` };
  return { title: "Sales Dashboard", subtitle: "Operational workspace.", icon: "bi-speedometer2", note: "Start from open work, active opportunities, tasks, and customer follow-up." };
}

function Kpi({
  href,
  icon,
  label,
  value,
  note,
  tone = "blue",
}: {
  href?: string;
  icon: string;
  label: string;
  value: string | number;
  note: string;
  tone?: "blue" | "success" | "warning" | "danger" | "violet";
}) {
  const body = (
    <>
      <i className={`bi ${icon}`} />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
    </>
  );

  if (href) {
    return <Link className={`role-kpi-card ${tone} clickable-kpi`} href={href}>{body}</Link>;
  }

  return <article className={`role-kpi-card ${tone}`}>{body}</article>;
}

function ActionCard({ href, icon, title, note }: { href: string; icon: string; title: string; note: string }) {
  return <Link className="role-action-card" href={href}><i className={`bi ${icon}`} /><strong>{title}</strong><span>{note}</span><b>→</b></Link>;
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

export default async function DashboardPage() {
  const user = await requireUser();
  const role = primaryRole(user.roles);

  if (role === "ceo") redirect("/reports");

  const now = new Date();
  const taskBase = taskViewWhere(user);
  const leadAccess = canViewLeads(user);
  const opportunityAccess = canViewOpportunities(user);
  const heroCopy = hero(role, user.displayName);

  const [myTasks, overdueTasks, unreadNotifications] = await Promise.all([
    db.task.count({ where: { AND: [taskBase, { assignedToId: user.id, status: { notIn: closedTasks } }] } }),
    db.task.count({ where: { AND: [taskBase, { dueAt: { lt: now }, status: { in: openTasks } }] } }),
    db.notification.count({ where: { recipientId: user.id, readAt: null } }),
  ]);

  if (role === "finance") {
    const [pricingApprovals, deposits, recentApprovals, financeTasks] = await Promise.all([
      db.pricingCase.count({ where: { status: { in: [PricingStatus.FINANCE_REVIEW, PricingStatus.CHANGES_REQUESTED, PricingStatus.DRAFT] } } }),
      db.deposit.count({ where: { status: DepositStatus.SUBMITTED } }),
      db.pricingCase.findMany({
        where: { status: { in: [PricingStatus.FINANCE_CONFIRMED, PricingStatus.APPROVED] } },
        include: { opportunity: { include: { customer: true } } },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      db.task.findMany({
        where: { AND: [taskBase, { status: { in: openTasks } }] },
        include: { opportunity: { include: { customer: true } } },
        orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
        take: 5,
      }),
    ]);

    return (
      <div className="role-dashboard">
        <header className="role-dashboard-header"><div><h1>{heroCopy.title}</h1><p>{heroCopy.subtitle}</p></div></header>
        <section className="dashboard-hero-card"><div><span className="hero-icon-box"><i className={`bi ${heroCopy.icon}`} /></span><div className="inline-block align-middle"><h2>Finance focus</h2><p>{heroCopy.note}</p></div></div></section>
        <section className="role-kpi-grid">
          <Kpi href="/pricing" icon="bi-cash-stack" label="Pending pricing approvals" value={pricingApprovals} note="Requires Finance review" />
          <Kpi href="/notifications" icon="bi-wallet2" label="Deposits awaiting confirmation" value={deposits} note="Payment proof review" tone="success" />
          <Kpi href="/tasks?view=mine" icon="bi-list-check" label="My open tasks" value={myTasks} note="Across finance queues" tone="violet" />
          <Kpi href="/tasks?view=overdue" icon="bi-exclamation-circle" label="Overdue" value={overdueTasks} note="Past due tasks" tone="danger" />
          <Kpi href="/notifications" icon="bi-bell" label="Unread notifications" value={unreadNotifications} note="Alerts and updates" tone="warning" />
        </section>
        <section className="role-section-grid">
          <article className="role-panel"><div className="role-panel-header"><div><strong>Priority actions</strong><span>No sales pipeline shortcut here. Finance starts from review queues.</span></div></div><div className="role-action-grid"><ActionCard href="/pricing" icon="bi-cash-coin" title="Approve pricing" note="Review and approve pricing requests." /><ActionCard href="/tasks?view=mine" icon="bi-list-check" title="Open finance tasks" note="Work on assigned finance tasks." /><ActionCard href="/notifications" icon="bi-bell" title="Open alerts" note="Review unread finance signals." /><ActionCard href="/reports" icon="bi-graph-up" title="Finance report" note="Open summarized performance view." /></div></article>
          <article className="role-panel"><div className="role-panel-header"><div><strong>Recent finance approvals</strong><span>Latest pricing confirmations.</span></div><Link href="/pricing">View all →</Link></div><div className="role-list">{recentApprovals.map((item) => <div className="role-list-row" key={item.id}><span className="row-icon"><i className="bi bi-check2-circle" /></span><div><strong>{item.opportunity.customer.name}</strong><small>{item.opportunity.reference} · {item.status}</small></div><b>{formatMoney(item.approvedSellingPrice, "AED")}</b></div>)}{!recentApprovals.length ? <p className="empty-state">No approvals yet.</p> : null}</div></article>
        </section>
        <article className="role-panel mt-5"><div className="role-panel-header"><div><strong>Needs finance action</strong><span>Items requiring review or follow-up.</span></div><Link href="/tasks?view=mine">View tasks →</Link></div><div className="role-list">{financeTasks.map((task) => <div className="role-list-row" key={task.id}><span className="row-icon"><i className="bi bi-bell" /></span><div><strong>{task.title}</strong><small>{task.opportunity?.customer.name ?? "No opportunity"} · {formatDateTime(task.dueAt)}</small></div><Link className="alert-action-button" href={`/tasks/${task.id}`}>Open</Link></div>)}{!financeTasks.length ? <p className="empty-state">No finance tasks in this view.</p> : null}</div></article>
      </div>
    );
  }

  if (role === "designer") {
    const [designTasks, activeDesignJobs, revisions, assignedOpportunities] = await Promise.all([
      db.task.count({ where: { AND: [taskBase, { assignedToId: user.id, status: { notIn: closedTasks } }] } }),
      db.designJob.count({ where: { assignedToId: user.id, status: { in: [DesignJobStatus.NOT_STARTED, DesignJobStatus.IN_PROGRESS] } } }),
      db.designJob.count({ where: { assignedToId: user.id, status: DesignJobStatus.REVISION_REQUESTED } }),
      db.opportunity.findMany({
        where: { AND: [opportunityViewWhere(user), { archivedAt: null }] },
        include: { customer: true, owner: true },
        orderBy: [{ nextFollowUpAt: "asc" }, { updatedAt: "desc" }],
        take: 6,
      }),
    ]);

    return (
      <div className="role-dashboard">
        <header className="role-dashboard-header"><div><h1>{heroCopy.title}</h1><p>{heroCopy.subtitle}</p></div></header>
        <section className="designer-hero-card"><div><span className="hero-icon-box"><i className={`bi ${heroCopy.icon}`} /></span><div className="inline-block align-middle"><h2>Welcome back</h2><p>{heroCopy.note}</p></div></div></section>
        <section className="role-kpi-grid">
          <Kpi href="/tasks?view=mine" icon="bi-file-earmark-text" label="My design tasks" value={designTasks} note="Active tasks assigned" />
          <Kpi href="/opportunities#files" icon="bi-trophy" label="design packages" value={activeDesignJobs} note="Being prepared" tone="success" />
          <Kpi href="/tasks?view=waiting" icon="bi-folder-x" label="Missing files" value={activeDesignJobs} note="Need your attention" tone="warning" />
          <Kpi href="/notifications?filter=mentions" icon="bi-chat-square-text" label="Revisions requested" value={revisions} note="Awaiting update" tone="violet" />
          <Kpi href="/tasks?view=today" icon="bi-clock" label="Due today" value={overdueTasks} note="Due / overdue work" />
        </section>
        <section className="role-section-grid">
          <article className="role-panel"><div className="role-panel-header"><div><strong>Assigned opportunities</strong><span>Design work you can open directly.</span></div><Link href="/opportunities">View all →</Link></div><div className="role-list">{assignedOpportunities.map((item) => <div className="role-list-row" key={item.id}><span className="row-icon"><i className={item.track === "RETAIL" ? "bi bi-shop" : "bi bi-buildings"} /></span><div><strong>{item.title}</strong><small>{item.customer.name} · Owner {item.owner.displayName}</small></div><Link className="alert-action-button" href={`/opportunities/${item.id}#files`}>Open</Link></div>)}</div></article>
          <article className="role-panel"><div className="role-panel-header"><div><strong>design package to prepare</strong><span>Upload or revise required files from the opportunity file workspace.</span></div></div><div className="role-action-grid"><ActionCard href="/tasks?view=mine" icon="bi-upload" title="Upload files" note="Go to assigned file tasks." /><ActionCard href="/notifications?filter=mentions" icon="bi-at" title="Review mentions" note="Open internal updates." /><ActionCard href="/opportunities" icon="bi-kanban" title="Open assigned work" note="View opportunities assigned to you." /><ActionCard href="/tasks?view=today" icon="bi-clock" title="Due today" note="Focus on urgent design work." /></div></article>
        </section>
      </div>
    );
  }

  if (role === "manager") {
    const [openLeads, opportunities, pendingApprovals, overdue, wonMonth, managerQueue] = await Promise.all([
      leadAccess ? db.lead.count({ where: { AND: [leadViewWhere(user), { status: { not: LeadStatus.CONVERTED } }] } }) : 0,
      opportunityAccess ? db.opportunity.count({ where: { AND: [opportunityViewWhere(user), { archivedAt: null }] } }) : 0,
      db.approval.count({ where: { status: ApprovalStatus.PENDING } }),
      db.task.count({ where: { AND: [taskBase, { dueAt: { lt: now }, status: { in: openTasks } }] } }),
      db.opportunity.aggregate({ where: { archivedAt: null, stage: OpportunityStage.WON }, _sum: { wonValue: true }, _count: true }),
      db.opportunity.findMany({ where: { archivedAt: null }, include: { customer: true, owner: true }, orderBy: { updatedAt: "desc" }, take: 5 }),
    ]);

    const managerExportHref = exportCsvHref([
      ["Metric", "Value"],
      ["Team open leads", openLeads],
      ["Active opportunities", opportunities],
      ["Pending approvals", pendingApprovals],
      ["Overdue follow-ups", overdue],
      ["Team won value", formatMoney(wonMonth._sum.wonValue, "AED")],
      ["Exported at", formatDateTime(now)],
    ]);

    return (
      <div className="role-dashboard">
        <header className="role-dashboard-header"><div><h1>{heroCopy.title}</h1><p>{heroCopy.subtitle}</p></div><a className="clean-primary-action" href={managerExportHref} download="sales-lifecycle-manager-report.csv"><i className="bi bi-download" /> Export report</a></header>
        <section className="manager-hero-card"><div><span className="hero-icon-box"><i className={`bi ${heroCopy.icon}`} /></span><div className="inline-block align-middle"><h2>Welcome back, {user.displayName}</h2><p>{heroCopy.note}</p></div></div></section>
        <section className="role-kpi-grid"><Kpi href="/leads" icon="bi-people" label="Team open leads" value={openLeads} note="Visible lead queue" /><Kpi href="/opportunities" icon="bi-funnel" label="Active opportunities" value={opportunities} note="Team pipeline" tone="success" /><Kpi href="/notifications" icon="bi-arrow-left-right" label="Reassignment requests" value={0} note="Manager decision" tone="violet" /><Kpi href="/notifications" icon="bi-lock" label="Pending approvals" value={pendingApprovals} note="Awaiting action" tone="warning" /><Kpi icon="bi-exclamation-circle" label="Overdue follow-ups" value={overdue} note="Needs attention" tone="danger" /></section>
        <section className="role-section-grid"><article className="role-panel"><div className="role-panel-header"><div><strong>Manager controls</strong><span>Only authorized managers can reassign ownership or return work to Sales.</span></div></div><div className="role-action-grid"><ActionCard href="/opportunities?managerAction=reassign" icon="bi-person-check" title="Reassign owner" note="Choose the exact opportunity, then jump to ownership reassignment." /><ActionCard href="/opportunities?managerAction=return-to-sales" icon="bi-arrow-return-left" title="Return to sales" note="Choose an opportunity and open the return-to-sales control." /><ActionCard href="/notifications" icon="bi-list-check" title="Review changes" note="Review stage and workflow requests." /><a className="role-action-card" href={managerExportHref} download="sales-lifecycle-manager-report.csv"><i className="bi bi-download" /><strong>Export report</strong><span>Export team activity summary.</span><b>→</b></a></div></article><article className="role-panel"><div className="role-panel-header"><div><strong>Team won value</strong><span>{wonMonth._count} confirmed wins</span></div><b>{formatMoney(wonMonth._sum.wonValue, "AED")}</b></div><div className="role-list">{managerQueue.map((item) => <div className="role-list-row" key={item.id}><span className="row-icon"><i className="bi bi-kanban" /></span><div><strong>{item.customer.name}</strong><small>{item.reference} · {item.owner.displayName}</small></div><Link className="alert-action-button" href={`/opportunities/${item.id}?section=ownership&focus=reassign#ownership-reassignment`}>Review</Link></div>)}</div></article></section>
      </div>
    );
  }

  if (role === "orders") {
    const [handovers, waitingPo, etaNeeded] = await Promise.all([
      db.orderHandover.count({ where: { status: { notIn: [HandoverStatus.COMPLETED, HandoverStatus.CANCELLED] } } }),
      db.orderHandover.count({ where: { status: HandoverStatus.PO_PENDING } }),
      db.orderHandover.count({ where: { currentEta: null, status: { notIn: [HandoverStatus.COMPLETED, HandoverStatus.CANCELLED] } } }),
    ]);

    return (
      <div className="role-dashboard"><header className="role-dashboard-header"><div><h1>{heroCopy.title}</h1><p>{heroCopy.subtitle}</p></div></header><section className="dashboard-hero-card"><div><span className="hero-icon-box"><i className={`bi ${heroCopy.icon}`} /></span><div className="inline-block align-middle"><h2>Handover focus</h2><p>{heroCopy.note}</p></div></div></section><section className="role-kpi-grid"><Kpi icon="bi-box-seam" label="Active handovers" value={handovers} note="Open order work" /><Kpi icon="bi-file-earmark-check" label="PO pending" value={waitingPo} note="Needs follow-up" tone="warning" /><Kpi icon="bi-calendar-event" label="ETA missing" value={etaNeeded} note="Update required" tone="danger" /><Kpi icon="bi-list-check" label="My tasks" value={myTasks} note="Assigned handover work" tone="violet" /><Kpi icon="bi-bell" label="Unread alerts" value={unreadNotifications} note="Operational updates" /></section><section className="role-section-grid"><article className="role-panel"><div className="role-panel-header"><div><strong>Handover actions</strong><span>No sales pipeline board. Order Coordination works from orders and tasks.</span></div></div><div className="role-action-grid"><ActionCard href="/orders" icon="bi-box-arrow-up-right" title="Open handovers" note="Review won handover records." /><ActionCard href="/tasks?view=mine" icon="bi-list-check" title="Work tasks" note="Open assigned handover tasks." /><ActionCard href="/notifications" icon="bi-bell" title="Open alerts" note="Review ETA and PO signals." /><ActionCard href="/settings" icon="bi-gear" title="Settings" note="Check profile and preferences." /></div></article></section></div>
    );
  }

  const [openLeads, opportunities, recentOpportunities] = await Promise.all([
    leadAccess ? db.lead.count({ where: { AND: [leadViewWhere(user), { status: { not: LeadStatus.CONVERTED } }] } }) : 0,
    opportunityAccess ? db.opportunity.count({ where: { AND: [opportunityViewWhere(user), { archivedAt: null }] } }) : 0,
    opportunityAccess
      ? db.opportunity.findMany({ where: { AND: [opportunityViewWhere(user), { archivedAt: null }] }, include: { customer: true, owner: true }, orderBy: { updatedAt: "desc" }, take: 6 })
      : [],
  ]);

  return (
    <div className="role-dashboard">
      <header className="role-dashboard-header"><div><h1>{heroCopy.title}</h1><p>{heroCopy.subtitle}</p></div></header>
      <section className="dashboard-hero-card"><div><span className="hero-icon-box"><i className={`bi ${heroCopy.icon}`} /></span><div className="inline-block align-middle"><h2>Operational focus</h2><p>{heroCopy.note}</p></div></div></section>
      <section className="role-kpi-grid"><Kpi icon="bi-person-lines-fill" label="Open leads" value={openLeads} note="Active intake" /><Kpi icon="bi-kanban" label="Opportunities" value={opportunities} note="Visible pipeline" tone="success" /><Kpi icon="bi-list-check" label="My tasks" value={myTasks} note="Assigned work" tone="violet" /><Kpi href="/tasks?view=overdue" icon="bi-exclamation-circle" label="Overdue" value={overdueTasks} note="Needs attention" tone="danger" /><Kpi icon="bi-bell" label="Unread alerts" value={unreadNotifications} note="Updates" tone="warning" /></section>
      <section className="role-section-grid"><article className="role-panel"><div className="role-panel-header"><div><strong>Fast actions</strong><span>Start from action, not navigation.</span></div></div><div className="role-action-grid"><ActionCard href="/leads/new" icon="bi-person-plus" title="Create lead" note="Start a new customer case." /><ActionCard href="/opportunities" icon="bi-kanban" title="Open pipeline" note="Review active opportunities." /><ActionCard href="/tasks?view=mine" icon="bi-list-check" title="Work today" note="Open your assigned work." /><ActionCard href="/notifications" icon="bi-bell" title="Open alerts" note="Follow routed updates." /></div></article><article className="role-panel"><div className="role-panel-header"><div><strong>Priority work</strong><span>Recently updated opportunities.</span></div></div><div className="role-list">{recentOpportunities.map((item) => <div className="role-list-row" key={item.id}><span className="row-icon"><i className={item.track === "RETAIL" ? "bi bi-shop" : "bi bi-buildings"} /></span><div><strong>{item.customer.name}</strong><small>{item.reference} · {item.owner.displayName}</small></div><Link className="alert-action-button" href={`/opportunities/${item.id}`}>Open</Link></div>)}</div></article></section>
    </div>
  );
}
