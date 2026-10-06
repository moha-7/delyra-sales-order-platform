export type WorkflowCheckpointKey =
  | "lead-intake"
  | "opportunity-scope"
  | "quotation-reference"
  | "deposit-confirmation"
  | "internal-collaboration"
  | "activity-timeline"
  | "task-ownership"
  | "notification-routing";

export type WorkflowCheckpoint = {
  key: WorkflowCheckpointKey;
  label: string;
  description: string;
  route: string;
  owner: "Sales" | "Finance" | "Design" | "Operations" | "System";
};

export type WorkflowScenarioCard = {
  title: string;
  description: string;
  href: string;
};

export type ManualQaScenarioKey =
  | "retail-case"
  | "project-case"
  | "deposit-approval"
  | "mention-notification"
  | "activity-timeline"
  | "scope-permissions";

export type ManualQaStep = {
  label: string;
  expected: string;
  href: string;
};

export type ManualQaScenario = {
  key: ManualQaScenarioKey;
  title: string;
  actor: "Sales" | "Finance" | "Manager" | "Operations" | "System Admin";
  goal: string;
  entryHref: string;
  estimatedMinutes: number;
  steps: ManualQaStep[];
  passCriteria: string[];
};

export const releaseCandidateCheckpoints: WorkflowCheckpoint[] = [
  {
    key: "lead-intake",
    label: "Lead intake",
    description: "Retail and Project lead creation routes remain separated by workspace.",
    route: "/leads/new",
    owner: "Sales",
  },
  {
    key: "opportunity-scope",
    label: "Opportunity scope",
    description: "Direct links must still respect role scope and assigned ownership.",
    route: "/opportunities",
    owner: "System",
  },
  {
    key: "quotation-reference",
    label: "Quotation references",
    description: "Quotation records use database-backed business references.",
    route: "/opportunities",
    owner: "Sales",
  },
  {
    key: "deposit-confirmation",
    label: "Deposit confirmation",
    description: "Sales requests and Finance confirmation stay visible in the workflow.",
    route: "/pricing",
    owner: "Finance",
  },
  {
    key: "internal-collaboration",
    label: "Internal collaboration",
    description: "Chatter and mentions keep communication inside the opportunity workspace.",
    route: "/notifications?filter=mentions",
    owner: "Operations",
  },
  {
    key: "activity-timeline",
    label: "Activity timeline",
    description: "Users can understand who did what and when from the opportunity page.",
    route: "/opportunities",
    owner: "System",
  },
  {
    key: "task-ownership",
    label: "Task ownership",
    description: "Assigned work, blockers, due dates, and overdue items remain actionable.",
    route: "/tasks",
    owner: "Operations",
  },
  {
    key: "notification-routing",
    label: "Notification routing",
    description: "Notification links remain internal and open the required action context.",
    route: "/notifications",
    owner: "System",
  },
];

export const manualQaScenarios: ManualQaScenario[] = [
  {
    key: "retail-case",
    title: "Retail kitchen full path",
    actor: "Sales",
    goal: "Create a retail lead, convert it, prepare quotation context, request deposit, and verify the opportunity workspace remains readable.",
    entryHref: "/leads/new/retail",
    estimatedMinutes: 8,
    steps: [
      {
        label: "Create a retail lead",
        expected: "Lead reference uses NSG/OPS/RK/LEAD and no manual track selector is shown.",
        href: "/leads/new/retail",
      },
      {
        label: "Convert to opportunity",
        expected: "Opportunity keeps RK scope and direct URL access follows the signed-in user's permissions.",
        href: "/leads",
      },
      {
        label: "Review workspace",
        expected: "Quotation, deposit, chatter, timeline, tasks, and alerts are reachable from the opportunity page.",
        href: "/opportunities",
      },
    ],
    passCriteria: [
      "Retail references stay RK from lead to opportunity.",
      "Dashboard quick action routes to the retail lead form for retail-only users.",
      "Opportunity page shows chatter and activity timeline without leaving the record.",
    ],
  },
  {
    key: "project-case",
    title: "Project / tender full path",
    actor: "Sales",
    goal: "Create a project lead with external tender context, convert it, and confirm internal project references and tender visibility.",
    entryHref: "/leads/new/project",
    estimatedMinutes: 10,
    steps: [
      {
        label: "Create a project lead",
        expected: "Lead reference uses NSG/OPS/PR/LEAD and client tender / BOQ reference is stored as external context.",
        href: "/leads/new/project",
      },
      {
        label: "Convert to project opportunity",
        expected: "Opportunity reference uses PR scope and project tender system reference is available where relevant.",
        href: "/leads",
      },
      {
        label: "Check project pipeline",
        expected: "Project pipeline label, owner, blockers, and activity timeline stay visible.",
        href: "/opportunities",
      },
    ],
    passCriteria: [
      "Project references stay PR from lead to opportunity.",
      "Client tender / BOQ reference remains separate from generated CRM references.",
      "Project-only users do not see retail-first navigation copy.",
    ],
  },
  {
    key: "deposit-approval",
    title: "Deposit request and Finance confirmation",
    actor: "Finance",
    goal: "Validate that Sales can request a deposit and Finance can verify payment context without CRM-side VAT calculation.",
    entryHref: "/pricing",
    estimatedMinutes: 7,
    steps: [
      {
        label: "Open finance queue",
        expected: "Finance sees pricing/deposit work from allowed scope only.",
        href: "/pricing",
      },
      {
        label: "Review deposit record",
        expected: "Internal payment reference and external bank/payment reference remain separate.",
        href: "/opportunities",
      },
      {
        label: "Confirm downstream visibility",
        expected: "Deposit action appears in opportunity timeline and dashboard workflow QA remains covered.",
        href: "/dashboard",
      },
    ],
    passCriteria: [
      "Deposit workflow does not calculate VAT in the CRM.",
      "Finance confirmation is visible to Sales after approval.",
      "Payment reference naming is not confused with bank receipt references.",
    ],
  },
  {
    key: "mention-notification",
    title: "Mention and notification routing",
    actor: "Operations",
    goal: "Verify that internal collaboration can replace side chats for opportunity decisions.",
    entryHref: "/opportunities",
    estimatedMinutes: 5,
    steps: [
      {
        label: "Post a chatter message with a mention",
        expected: "The mentioned user receives an internal alert and the mention is highlighted in the message body.",
        href: "/opportunities",
      },
      {
        label: "Open mention alert",
        expected: "Notification opens the opportunity and focuses the exact chatter message.",
        href: "/notifications?filter=mentions",
      },
      {
        label: "Mark as read",
        expected: "Notification and chatter mention read state are updated safely.",
        href: "/notifications?filter=unread",
      },
    ],
    passCriteria: [
      "No external WhatsApp or email integration is required for the test.",
      "Unsafe external notification URLs are not used.",
      "The user lands on the correct record/action context.",
    ],
  },
  {
    key: "activity-timeline",
    title: "Activity timeline traceability",
    actor: "Manager",
    goal: "Check that opportunity users can understand what changed, who did it, and where to open the related object.",
    entryHref: "/opportunities",
    estimatedMinutes: 5,
    steps: [
      {
        label: "Open an active opportunity",
        expected: "Timeline counters and recent items are visible near the operational workspace.",
        href: "/opportunities",
      },
      {
        label: "Open linked timeline entries",
        expected: "Chatter, task, document, quotation, deposit, activity, and audit links route internally.",
        href: "/opportunities",
      },
      {
        label: "Validate audit context",
        expected: "Manager/admin users can cross-check audit records without losing opportunity context.",
        href: "/audit",
      },
    ],
    passCriteria: [
      "Timeline supports operational review without database changes.",
      "Record links use safe internal routes.",
      "The opportunity remains the user's main source of truth.",
    ],
  },
  {
    key: "scope-permissions",
    title: "Role scope and navigation smoke test",
    actor: "System Admin",
    goal: "Confirm each role sees a focused navigation and cannot bypass scope through direct URLs.",
    entryHref: "/dashboard",
    estimatedMinutes: 9,
    steps: [
      {
        label: "Check role-specific dashboard labels",
        expected: "Retail-only, project-only, and mixed users see the correct workspace labels and create-lead routes.",
        href: "/dashboard",
      },
      {
        label: "Open protected lists",
        expected: "Leads, opportunities, tasks, and notifications only show allowed records.",
        href: "/opportunities",
      },
      {
        label: "Try a direct record URL outside scope",
        expected: "Access is blocked or redirected to dashboard with a clear forbidden message.",
        href: "/dashboard?error=forbidden",
      },
    ],
    passCriteria: [
      "Navigation copy matches the user's workspace.",
      "Direct URL access remains protected.",
      "Tasks and alerts guide users to action instead of exposing irrelevant modules.",
    ],
  },
];

export function releaseCandidateProgress(completedKeys: Iterable<WorkflowCheckpointKey | string>) {
  const completedSet = new Set(completedKeys);
  const completed = releaseCandidateCheckpoints.filter((checkpoint) =>
    completedSet.has(checkpoint.key),
  ).length;
  const total = releaseCandidateCheckpoints.length;

  return {
    completed,
    total,
    percent: total ? Math.round((completed / total) * 100) : 0,
    isComplete: completed === total,
  };
}

export function manualQaSummary(scenarios: readonly ManualQaScenario[] = manualQaScenarios) {
  const totalScenarios = scenarios.length;
  const totalSteps = scenarios.reduce((sum, scenario) => sum + scenario.steps.length, 0);
  const estimatedMinutes = scenarios.reduce(
    (sum, scenario) => sum + scenario.estimatedMinutes,
    0,
  );
  const actors = [...new Set(scenarios.map((scenario) => scenario.actor))];

  return {
    totalScenarios,
    totalSteps,
    estimatedMinutes,
    actors,
  };
}

export function demoReadinessScore(options: {
  passedScenarios: number;
  totalScenarios?: number;
}) {
  const totalScenarios = options.totalScenarios ?? manualQaScenarios.length;
  const passedScenarios = Math.max(0, Math.min(options.passedScenarios, totalScenarios));

  return {
    passedScenarios,
    totalScenarios,
    percent: totalScenarios ? Math.round((passedScenarios / totalScenarios) * 100) : 0,
    ready: totalScenarios > 0 && passedScenarios === totalScenarios,
  };
}

export function workflowScenarioCards(options: {
  createLeadHref: string;
  pipelineHref?: string;
  workspaceLabel: string;
}): WorkflowScenarioCard[] {
  return [
    {
      title: "Start a new case",
      description: `Open the correct ${options.workspaceLabel.toLowerCase()} intake route before creating data.`,
      href: options.createLeadHref,
    },
    {
      title: "Review active workflow",
      description: "Check stage, pricing, deposit, chatter, timeline, tasks, and blockers from the opportunity.",
      href: options.pipelineHref ?? "/opportunities",
    },
    {
      title: "Follow internal alerts",
      description: "Use Alerts / Mentions to jump back to the required record instead of searching manually.",
      href: "/notifications?filter=unread",
    },
  ];
}
