import Link from "next/link";
import { redirect } from "next/navigation";
import { TaskStatus } from "@/generated/prisma/client";
import { CreateTaskForm } from "@/components/tasks/create-task-form";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { formatDateTime } from "@/modules/crm/format";
import { canManageTasks, taskViewWhere } from "@/modules/tasks/access";

const closed: TaskStatus[] = [TaskStatus.COMPLETED, TaskStatus.CANCELLED];

function tabHref(key: string, q?: string) {
  const params = new URLSearchParams({ view: key });
  if (q) params.set("q", q);
  return `/tasks?${params.toString()}`;
}

function taskStatusLabel(status: TaskStatus) {
  return status.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (char) => char.toUpperCase());
}

function statusTone(status: TaskStatus) {
  if (status === TaskStatus.COMPLETED) return "success";
  const waitingStatuses: TaskStatus[] = [
    TaskStatus.BLOCKED,
    TaskStatus.WAITING_CUSTOMER,
    TaskStatus.WAITING_INTERNAL,
  ];
  if (waitingStatuses.includes(status)) return "warning";
  if (status === TaskStatus.CANCELLED) return "danger";
  return "blue";
}

function priorityTone(priority: string) {
  const value = priority.toLowerCase();
  if (value === "high" || value === "urgent") return "danger";
  if (value === "medium") return "warning";
  if (value === "low") return "success";
  return "blue";
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string }>;
}) {
  const user = await requireUser();
  if (!canManageTasks(user)) redirect("/dashboard?error=forbidden");
  const params = await searchParams;
  const now = new Date();
  const view = params.view ?? "mine";
  const q = params.q?.trim();
  const base = taskViewWhere(user);
  const where = {
    AND: [
      base,
      q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { reference: { contains: q, mode: "insensitive" as const } },
              {
                opportunity: {
                  title: { contains: q, mode: "insensitive" as const },
                },
              },
            ],
          }
        : {},
      view === "mine"
        ? { assignedToId: user.id, status: { notIn: closed } }
        : {},
      view === "today"
        ? {
            assignedToId: user.id,
            dueAt: {
              gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
              lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
            },
            status: { notIn: closed },
          }
        : {},
      view === "overdue"
        ? {
            assignedToId: user.id,
            dueAt: { lt: now },
            status: { notIn: closed },
          }
        : {},
      view === "waiting"
        ? {
            status: {
              in: [
                TaskStatus.WAITING_CUSTOMER,
                TaskStatus.WAITING_INTERNAL,
                TaskStatus.BLOCKED,
              ],
            },
          }
        : {},
      view === "completed" ? { status: TaskStatus.COMPLETED } : {},
    ],
  };
  const [tasks, users, counts] = await Promise.all([
    db.task.findMany({
      where,
      include: {
        assignedTo: true,
        createdBy: true,
        opportunity: { include: { customer: true } },
      },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
      take: 200,
    }),
    db.user.findMany({
      where: { archivedAt: null, status: "ACTIVE" },
      select: { id: true, displayName: true },
      orderBy: { displayName: "asc" },
    }),
    Promise.all([
      db.task.count({
        where: {
          AND: [base, { assignedToId: user.id, status: { notIn: closed } }],
        },
      }),
      db.task.count({
        where: {
          AND: [
            base,
            {
              assignedToId: user.id,
              dueAt: {
                gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
                lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
              },
              status: { notIn: closed },
            },
          ],
        },
      }),
      db.task.count({
        where: {
          AND: [
            base,
            {
              assignedToId: user.id,
              dueAt: { lt: now },
              status: { notIn: closed },
            },
          ],
        },
      }),
      db.task.count({
        where: {
          AND: [
            base,
            {
              status: {
                in: [
                  TaskStatus.WAITING_CUSTOMER,
                  TaskStatus.WAITING_INTERNAL,
                  TaskStatus.BLOCKED,
                ],
              },
            },
          ],
        },
      }),
      db.task.count({ where: { AND: [base, { status: TaskStatus.COMPLETED }] } }),
    ]),
  ]);
  const tabs = [
    { key: "mine", label: "My open tasks", count: counts[0] },
    { key: "today", label: "Due today", count: counts[1] },
    { key: "overdue", label: "Overdue", count: counts[2] },
    { key: "waiting", label: "Waiting / blocked", count: counts[3] },
    { key: "completed", label: "Completed", count: counts[4] },
    { key: "all", label: "All visible", count: tasks.length },
  ];

  return (
    <div className="tasks-page-v3">
      <header className="tasks-hero-v3">
        <div>
          <p className="eyebrow">Operations center</p>
          <h1>Tasks</h1>
          <p>Follow assigned work, due items, blockers, approvals, files, deposits, and handovers.</p>
        </div>
        <form className="tasks-search-v3" action="/tasks">
          <input type="hidden" name="view" value={view} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search task, customer, opportunity..."
          />
          <button className="clean-primary-action" type="submit">
            <i className="bi bi-search" aria-hidden="true" />
            Search
          </button>
        </form>
      </header>

      <section className="tasks-summary-grid-v3" aria-label="Task summary">
        <Link href={tabHref("mine", q)}><i className="bi bi-check2-square" /><span>My queue</span><strong>{counts[0]}</strong></Link>
        <Link href={tabHref("today", q)}><i className="bi bi-calendar-check" /><span>Due today</span><strong>{counts[1]}</strong></Link>
        <Link href={tabHref("overdue", q)}><i className="bi bi-exclamation-triangle" /><span>Overdue</span><strong>{counts[2]}</strong></Link>
        <Link href={tabHref("waiting", q)}><i className="bi bi-hourglass-split" /><span>Waiting / blocked</span><strong>{counts[3]}</strong></Link>
      </section>

      <nav className="task-tabs-v3" aria-label="Task views">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tabHref(tab.key, q)}
            className={view === tab.key ? "active" : ""}
          >
            {tab.label}
            <span>{tab.count}</span>
          </Link>
        ))}
      </nav>

      <section className="tasks-table-card-v3">
        <div className="tasks-table-head-v3">
          <div>
            <strong>{tasks.length} tasks</strong>
            <span>{q ? `Filtered by “${q}”` : "Current operational queue"}</span>
          </div>
          <Link className="clean-secondary-action" href="/notifications">
            Open alerts <i className="bi bi-arrow-right" />
          </Link>
        </div>
        <div className="tasks-table-wrap-v3">
          <table className="tasks-table-v3">
            <thead>
              <tr>
                <th>Task</th>
                <th>Opportunity</th>
                <th>Assignee</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Due</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const overdue = task.dueAt && task.dueAt < now && !closed.includes(task.status);
                const taskHref = task.actionUrl ?? `/tasks/${task.id}`;
                return (
                  <tr key={task.id}>
                    <td>
                      <Link href={taskHref} className="task-title-link-v3">
                        {task.title}
                      </Link>
                      <small>
                        {task.reference}
                        {task.autoCreated ? " · automated" : ""}
                      </small>
                    </td>
                    <td>
                      {task.opportunity ? (
                        <Link
                          className="task-record-link-v3"
                          href={`/opportunities/${task.opportunity.id}?section=${task.sectionKey ?? "tasks"}&task=${task.id}#tasks`}
                        >
                          {task.opportunity.reference}
                          <small>{task.opportunity.customer.name}</small>
                        </Link>
                      ) : (
                        <span className="muted-dash">—</span>
                      )}
                    </td>
                    <td>{task.assignedTo.displayName}</td>
                    <td>
                      <span className={`pill-v3 ${statusTone(task.status)}`}>
                        {taskStatusLabel(task.status)}
                      </span>
                    </td>
                    <td>
                      <span className={`pill-v3 ${priorityTone(task.priority)}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className={overdue ? "task-overdue-v3" : ""}>{formatDateTime(task.dueAt)}</td>
                    <td>
                      <Link className="table-action-button-v3" href={taskHref}>
                        Open <i className="bi bi-arrow-right" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!tasks.length ? (
          <div className="tasks-empty-v3">
            <i className="bi bi-check2-circle" />
            <strong>No tasks in this view.</strong>
            <span>Switch tabs, adjust search, or create a manual task.</span>
          </div>
        ) : null}
      </section>

      <details className="create-task-card-v3">
        <summary>
          <span><i className="bi bi-plus-circle" /> Create manual task</span>
          <i className="bi bi-chevron-down" />
        </summary>
        <div>
          <CreateTaskForm users={users} />
        </div>
      </details>
    </div>
  );
}
