import { describe, expect, it } from "vitest";
import {
  CONTACT_DATA_QUALITY,
  contactDataQuality,
} from "@/modules/crm/domain";

describe("CRM contact data quality", () => {
  it("keeps missing contact values for verification", () => {
    expect(contactDataQuality({ mobile: null, email: null })).toBe(
      CONTACT_DATA_QUALITY.NEEDS_VERIFICATION,
    );
  });

  it("marks the record verified when at least one contact method exists", () => {
    expect(contactDataQuality({ mobile: "+971500000000", email: null })).toBe(
      CONTACT_DATA_QUALITY.VERIFIED,
    );
  });
});
