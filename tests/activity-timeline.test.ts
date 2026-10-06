import { describe, expect, it } from "vitest";

import {
  compactTimelineBody,
  sortTimelineItems,
  timelineKindLabel,
} from "../src/modules/activity/timeline";

describe("activity timeline helpers", () => {
  it("sorts timeline items newest first", () => {
    const items = sortTimelineItems([
      { id: "old", occurredAt: "2026-07-01T10:00:00.000Z" },
      { id: "new", occurredAt: "2026-07-03T10:00:00.000Z" },
      { id: "middle", occurredAt: "2026-07-02T10:00:00.000Z" },
    ]);

    expect(items.map((item) => item.id)).toEqual(["new", "middle", "old"]);
  });

  it("compacts long body text with ascii suffix", () => {
    expect(compactTimelineBody("hello ".repeat(20), 25)).toHaveLength(25);
    expect(compactTimelineBody("hello ".repeat(20), 25)?.endsWith("...")).toBe(true);
    expect(compactTimelineBody("   ")).toBeNull();
  });

  it("labels timeline event kinds for operational users", () => {
    expect(timelineKindLabel("chatter")).toBe("Chatter");
    expect(timelineKindLabel("audit")).toBe("Audit");
    expect(timelineKindLabel("quotation")).toBe("Quotation");
  });
});
