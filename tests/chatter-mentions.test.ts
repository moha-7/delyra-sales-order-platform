import { describe, expect, it } from "vitest";

import {
  compactMentionPreview,
  extractMentionTokens,
  normalizeMentionToken,
  splitMentionBody,
} from "../src/modules/chatter/mentions";

describe("chatter mentions", () => {
  it("extracts unique mention tokens from message bodies", () => {
    expect(extractMentionTokens("Please check @MH and @finance.dept. Also @mh")).toEqual([
      "mh",
      "finance.dept",
    ]);
  });

  it("normalizes user aliases for initials, email and display name", () => {
    expect(normalizeMentionToken("@Finance.Dept.")).toBe("finance.dept");
    expect(normalizeMentionToken(" Mohamed.Osama ")).toBe("mohamed.osama");
    expect(normalizeMentionToken("@MH")).toBe("mh");
  });

  it("splits chatter bodies into text and mention parts", () => {
    expect(splitMentionBody("Hi @finance.dept. Please check @MH")).toEqual([
      { kind: "text", value: "Hi " },
      { kind: "mention", value: "@finance.dept", token: "finance.dept" },
      { kind: "text", value: ". Please check " },
      { kind: "mention", value: "@MH", token: "mh" },
    ]);
  });

  it("does not create mention parts from emails", () => {
    expect(splitMentionBody("mail test@example.com then @MH")).toEqual([
      { kind: "text", value: "mail test@example.com then " },
      { kind: "mention", value: "@MH", token: "mh" },
    ]);
  });

  it("compacts long notification previews", () => {
    const preview = compactMentionPreview("hello ".repeat(20), 25);

    expect(preview).toHaveLength(25);
    expect(preview.endsWith("...")).toBe(true);
    expect(normalizeMentionToken("@Finance.Dept.")).toBe("finance.dept");
  });
});
