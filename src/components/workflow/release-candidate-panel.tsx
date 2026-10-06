import Link from "next/link";
import {
  manualQaScenarios,
  manualQaSummary,
  releaseCandidateCheckpoints,
  releaseCandidateProgress,
  workflowScenarioCards,
} from "@/modules/workflow/release-candidate";

type ReleaseCandidatePanelProps = {
  workspaceLabel: string;
  createLeadHref: string;
  pipelineLabel: string;
  metrics: {
    openLeads: number;
    opportunities: number;
    openTasks: number;
    unreadNotifications: number;
  };
};

export function ReleaseCandidatePanel({
  workspaceLabel,
  createLeadHref,
  pipelineLabel,
  metrics,
}: ReleaseCandidatePanelProps) {
  const progress = releaseCandidateProgress(
    releaseCandidateCheckpoints.map((checkpoint) => checkpoint.key),
  );
  const scenarios = workflowScenarioCards({
    createLeadHref,
    pipelineHref: "/opportunities",
    workspaceLabel,
  });
  const qaSummary = manualQaSummary();

  return (
    <details className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <summary className="cursor-pointer list-none">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.16em] text-blue-600">
              Workflow QA
            </p>
            <h2 className="mt-1 text-lg font-black text-slate-950">
              Release readiness checklist
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Collapsed by default. Open only during release validation.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-black">
            <span className="rounded-full bg-slate-950 px-3 py-1.5 text-white">
              Coverage {progress.completed}/{progress.total}
            </span>
            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-blue-700 ring-1 ring-blue-100">
              {qaSummary.totalScenarios} scenarios / {qaSummary.estimatedMinutes} min
            </span>
          </div>
        </div>
      </summary>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <span className="text-xs font-black uppercase text-slate-500">Open leads</span>
          <strong className="mt-2 block text-2xl font-black text-slate-950">
            {metrics.openLeads}
          </strong>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <span className="text-xs font-black uppercase text-slate-500">
            {pipelineLabel}
          </span>
          <strong className="mt-2 block text-2xl font-black text-slate-950">
            {metrics.opportunities}
          </strong>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <span className="text-xs font-black uppercase text-slate-500">Open tasks</span>
          <strong className="mt-2 block text-2xl font-black text-slate-950">
            {metrics.openTasks}
          </strong>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <span className="text-xs font-black uppercase text-slate-500">Unread alerts</span>
          <strong className="mt-2 block text-2xl font-black text-slate-950">
            {metrics.unreadNotifications}
          </strong>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <h3 className="text-sm font-black text-slate-950">Operational checkpoints</h3>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {releaseCandidateCheckpoints.map((checkpoint) => (
              <Link
                className="rounded-2xl border border-white bg-white p-3 text-sm shadow-sm transition hover:border-blue-200"
                href={checkpoint.route}
                key={checkpoint.key}
              >
                <strong className="text-slate-950">{checkpoint.label}</strong>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                  {checkpoint.description}
                </p>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
          <h3 className="text-sm font-black text-slate-950">Manual QA shortcuts</h3>
          <div className="mt-3 space-y-2">
            {scenarios.map((scenario) => (
              <Link
                className="block rounded-2xl border border-blue-100 bg-white p-4 shadow-sm transition hover:border-blue-300"
                href={scenario.href}
                key={scenario.title}
              >
                <strong className="text-sm text-slate-950">{scenario.title}</strong>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {scenario.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[.16em] text-emerald-700">
              Release readiness scenarios
            </p>
            <h3 className="mt-1 text-lg font-black text-slate-950">
              Manual user journeys to run before release
            </h3>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase text-emerald-700 ring-1 ring-emerald-100">
            {qaSummary.totalSteps} checks
          </span>
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-3">
          {manualQaScenarios.map((scenario) => (
            <article
              className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm"
              key={scenario.key}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-black text-slate-950">{scenario.title}</h4>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{scenario.goal}</p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-600">
                  {scenario.estimatedMinutes} min
                </span>
              </div>
              <Link
                className="mt-3 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-100"
                href={scenario.entryHref}
              >
                Start scenario
              </Link>
            </article>
          ))}
        </div>
      </div>
    </details>
  );
}
