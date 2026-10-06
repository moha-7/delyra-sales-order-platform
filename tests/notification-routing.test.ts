import { describe, expect, it } from "vitest";

import {
  notificationMessageIdFromHref,
  safeNotificationRedirectHref,
} from "../src/modules/notifications/routing";

describe("notification routing", () => {
  it("rejects unsafe or external notification links", () => {
    expect(safeNotificationRedirectHref(null)).toBe("/notifications");
    expect(safeNotificationRedirectHref("https://example.com")).toBe("/notifications");
    expect(safeNotificationRedirectHref("//example.com/path")).toBe("/notifications");
  });

  it("keeps safe internal links", () => {
    expect(safeNotificationRedirectHref("/tasks/123")).toBe("/tasks/123");
  });

  it("adds a message anchor for chatter mention links", () => {
    const href = safeNotificationRedirectHref("/opportunities/opp-1?message=msg-1");

    expect(href).toBe("/opportunities/opp-1?message=msg-1&section=chatter#message-msg-1");
    expect(notificationMessageIdFromHref(href)).toBe("msg-1");
  });
});
