import { describe, expect, it } from "vitest";
import {
  formatOrderDateTime,
  formatOrderDateTimeLocal,
  parseOrderDateTimeLocal,
} from "../src/modules/orders/time";

describe("order ETA timezone", () => {
  it("converts Dubai wall time to the correct UTC instant", () => {
    expect(parseOrderDateTimeLocal("2026-11-20T10:00")?.toISOString()).toBe(
      "2026-11-20T06:00:00.000Z",
    );
  });

  it("round-trips UTC storage back to Dubai datetime-local", () => {
    expect(
      formatOrderDateTimeLocal(new Date("2026-11-20T06:00:00.000Z")),
    ).toBe("2026-11-20T10:00");
  });

  it("formats the visible ETA in Dubai business time", () => {
    expect(
      formatOrderDateTime(new Date("2026-11-20T06:00:00.000Z")),
    ).toContain("10:00");
  });
});
