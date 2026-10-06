import Link from "next/link";
import { StatusPill } from "@/components/crm/status-pill";
import { enumLabel, formatDateTime } from "@/modules/crm/format";

type StepState = "COMPLETED" | "CURRENT" | "WAITING" | "BLOCKED" | "NOT_STARTED";

export type WorkflowStep = {
  key: string;
  label: string;
  state: StepState;
  responsible: string;
  nextAction?: string;
  missing?: string[];
  task?: { label: string; href?: string };
  notification?: { label: string; href?: string };
  updatedAt?: Date | string | null;
  blockedReason?: string | null;
};

const stateIcon: Record<StepState, string> = {
  COMPLETED: "✓",
  CURRENT: "●",
  WAITING: "⏳",
  BLOCKED: "!",
  NOT_STARTED: "○",
};

export function WorkflowProgressPanel({
  title = "Workflow progress",
  subtitle,
  steps,
}: {
  title?: string;
  subtitle?: string;
  steps: WorkflowStep[];
}) {
  const current = steps.find((step) => step.state === "CURRENT") ?? steps.find((step) => step.state === "BLOCKED") ?? steps.find((step) => step.state === "WAITING");
  const completed = steps.filter((step) => step.state === "COMPLETED").length;
  const blocked = steps.find((step) => step.state === "BLOCKED");

  return (
    <section className="workflow-progress-card">
      <div className="workflow-progress-header">
        <div>
          <p className="eyebrow">Operational clarity</p>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        <div className="workflow-progress-summary">
          <article><span>Current step</span><strong>{current?.label ?? "Completed"}</strong></article>
          <article><span>Completed</span><strong>{completed}/{steps.length}</strong></article>
          <article><span>Blocked</span><strong>{blocked ? blocked.label : "None"}</strong></article>
        </div>
      </div>

      <div className="workflow-stepper" aria-label="Workflow progress">
        {steps.map((step, index) => (
          <article className={`workflow-step ${step.state.toLowerCase()}`} key={step.key}>
            <div className="workflow-step-marker"><span>{stateIcon[step.state]}</span><i>{index + 1}</i></div>
            <div className="workflow-step-body">
              <div className="workflow-step-title"><strong>{step.label}</strong><StatusPill value={step.state} /></div>
              <dl>
                <div><dt>Responsible</dt><dd>{step.responsible}</dd></div>
                {step.nextAction ? <div><dt>Next action</dt><dd>{step.nextAction}</dd></div> : null}
                {step.updatedAt ? <div><dt>Last update</dt><dd>{formatDateTime(step.updatedAt)}</dd></div> : null}
              </dl>
              {step.missing?.length ? <p className="workflow-missing">Missing: {step.missing.join(", ")}</p> : null}
              {step.blockedReason ? <p className="workflow-blocked">Blocked: {step.blockedReason}</p> : null}
              <div className="workflow-links">
                {step.task ? step.task.href ? <Link href={step.task.href}>{step.task.label}</Link> : <span>{step.task.label}</span> : null}
                {step.notification ? step.notification.href ? <Link href={step.notification.href}>{step.notification.label}</Link> : <span>{step.notification.label}</span> : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function checklistStepState(status: string): StepState {
  if (status === "COMPLETED" || status === "NOT_APPLICABLE") return "COMPLETED";
  if (status === "BLOCKED") return "BLOCKED";
  if (status === "IN_PROGRESS") return "CURRENT";
  return "NOT_STARTED";
}

export function stepStateLabel(state: StepState) {
  return enumLabel(state);
}
