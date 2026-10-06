import { describe, expect, it } from "vitest";

import {
  demoReadinessScore,
  manualQaScenarios,
  manualQaSummary,
  releaseCandidateCheckpoints,
  releaseCandidateProgress,
  workflowScenarioCards,
} from "../src/modules/workflow/release-candidate";

describe("release candidate workflow QA", () => {
  it("keeps the core CRM workflow checkpoints mapped", () => {
    expect(releaseCandidateCheckpoints.map((checkpoint) => checkpoint.key)).toEqual([
      "lead-intake",
      "opportunity-scope",
      "quotation-reference",
      "deposit-confirmation",
      "internal-collaboration",
      "activity-timeline",
      "task-ownership",
      "notification-routing",
    ]);
  });

  it("calculates release candidate progress from completed checkpoint keys", () => {
    expect(
      releaseCandidateProgress(["lead-intake", "activity-timeline", "notification-routing"]),
    ).toEqual({
      completed: 3,
      total: 8,
      percent: 38,
      isComplete: false,
    });

    expect(
      releaseCandidateProgress(releaseCandidateCheckpoints.map((checkpoint) => checkpoint.key))
        .isComplete,
    ).toBe(true);
  });

  it("routes manual QA shortcuts to internal workflow areas", () => {
    expect(
      workflowScenarioCards({
        createLeadHref: "/leads/new/project",
        workspaceLabel: "Projects / villas workspace",
      }).map((scenario) => scenario.href),
    ).toEqual(["/leads/new/project", "/opportunities", "/notifications?filter=unread"]);
  });

  it("defines the required internal demo readiness scenarios", () => {
    expect(manualQaScenarios.map((scenario) => scenario.key)).toEqual([
      "retail-case",
      "project-case",
      "deposit-approval",
      "mention-notification",
      "activity-timeline",
      "scope-permissions",
    ]);
  });

  it("keeps every manual QA scenario actionable with steps and pass criteria", () => {
    for (const scenario of manualQaScenarios) {
      expect(scenario.entryHref.startsWith("/")).toBe(true);
      expect(scenario.steps.length).toBeGreaterThanOrEqual(3);
      expect(scenario.passCriteria.length).toBeGreaterThanOrEqual(3);
      expect(scenario.estimatedMinutes).toBeGreaterThan(0);
    }
  });

  it("summarizes demo readiness for planning and sign-off", () => {
    expect(manualQaSummary()).toMatchObject({
      totalScenarios: 6,
      totalSteps: 18,
      estimatedMinutes: 44,
    });

    expect(demoReadinessScore({ passedScenarios: 6 })).toEqual({
      passedScenarios: 6,
      totalScenarios: 6,
      percent: 100,
      ready: true,
    });

    expect(demoReadinessScore({ passedScenarios: 2 })).toMatchObject({
      percent: 33,
      ready: false,
    });
  });
});
