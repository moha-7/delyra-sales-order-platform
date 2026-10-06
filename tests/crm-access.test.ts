import { describe, expect, it } from "vitest";
import type { AuthenticatedUser } from "@/lib/auth/session";
import {
  canCreateProjectLead,
  canCreateRetailLead,
  customerViewWhere,
  leadManageWhere,
  leadViewWhere,
  opportunityManageWhere,
  opportunityViewWhere,
} from "@/modules/crm/access";
import { PERMISSIONS } from "@/modules/rbac/permissions";

const USER_ID = "11111111-1111-1111-1111-111111111111";
const EMPTY_ACCESS_ID = "00000000-0000-0000-0000-000000000000";

function user(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: USER_ID,
    email: "sales@northstar.example",
    displayName: "Sales User",
    initials: "SU",
    department: "RETAIL_SALES",
    dataScope: "OWN",
    forcePasswordChange: false,
    accountType: "PERSONAL",
    roles: ["RETAIL_SALES"],
    permissions: [],
    ...overrides,
  };
}

describe("CRM scope filters", () => {
  it("limits own lead access to the owner", () => {
    expect(
      leadViewWhere(
        user({ permissions: [PERMISSIONS.LEADS_MANAGE_OWN] }),
      ),
    ).toEqual({ ownerId: USER_ID });
  });

  it("limits own lead management to the owner", () => {
    expect(
      leadManageWhere(
        user({ permissions: [PERMISSIONS.LEADS_MANAGE_OWN] }),
      ),
    ).toEqual({ ownerId: USER_ID });
  });

  it("denies lead visibility when no lead permission exists", () => {
    expect(leadViewWhere(user())).toEqual({ id: EMPTY_ACCESS_ID });
  });

  it("allows all lead visibility only with all/view-all permission", () => {
    expect(
      leadViewWhere(
        user({ permissions: [PERMISSIONS.LEADS_VIEW_ALL] }),
      ),
    ).toEqual({});

    expect(
      leadViewWhere(
        user({ permissions: [PERMISSIONS.LEADS_MANAGE_ALL] }),
      ),
    ).toEqual({});
  });

  it("limits own opportunity access to the owner", () => {
    expect(
      opportunityViewWhere(
        user({ permissions: [PERMISSIONS.OPPORTUNITIES_MANAGE_OWN] }),
      ),
    ).toEqual({ ownerId: USER_ID });
  });

  it("limits own opportunity management to the owner", () => {
    expect(
      opportunityManageWhere(
        user({ permissions: [PERMISSIONS.OPPORTUNITIES_MANAGE_OWN] }),
      ),
    ).toEqual({ ownerId: USER_ID });
  });

  it("allows assigned opportunity access through membership", () => {
    expect(
      opportunityViewWhere(
        user({
          dataScope: "ASSIGNED",
          permissions: [PERMISSIONS.OPPORTUNITIES_MANAGE_OWN],
        }),
      ),
    ).toEqual({
      OR: [
        { ownerId: USER_ID },
        {
          members: {
            some: { userId: USER_ID },
          },
        },
      ],
    });
  });

  it("denies opportunity visibility when no opportunity permission exists", () => {
    expect(opportunityViewWhere(user())).toEqual({ id: EMPTY_ACCESS_ID });
  });

  it("allows all opportunity visibility only with all/view-all permission", () => {
    expect(
      opportunityViewWhere(
        user({ permissions: [PERMISSIONS.OPPORTUNITIES_VIEW_ALL] }),
      ),
    ).toEqual({});

    expect(
      opportunityViewWhere(
        user({ permissions: [PERMISSIONS.OPPORTUNITIES_MANAGE_ALL] }),
      ),
    ).toEqual({});
  });

  it("allows all-scope customer viewing when permission is present", () => {
    expect(
      customerViewWhere(
        user({
          dataScope: "ALL",
          permissions: [PERMISSIONS.CUSTOMERS_VIEW],
        }),
      ),
    ).toEqual({});
  });

  it("denies customer visibility without customer permission", () => {
    expect(customerViewWhere(user())).toEqual({ id: EMPTY_ACCESS_ID });
  });
});

describe("CRM lead creation by role", () => {
  it("allows retail sales to create retail leads only", () => {
    const retailSales = user({
      roles: ["RETAIL_SALES"],
      department: "RETAIL_SALES",
      permissions: [PERMISSIONS.LEADS_MANAGE_OWN],
    });

    expect(canCreateRetailLead(retailSales)).toBe(true);
    expect(canCreateProjectLead(retailSales)).toBe(false);
  });

  it("allows project sales to create project leads only", () => {
    const projectSales = user({
      roles: ["PROJECT_SALES"],
      department: "PROJECT_SALES",
      permissions: [PERMISSIONS.LEADS_MANAGE_OWN],
    });

    expect(canCreateProjectLead(projectSales)).toBe(true);
    expect(canCreateRetailLead(projectSales)).toBe(false);
  });

  it("does not allow lead creation from role alone without lead permission", () => {
    const projectSales = user({
      roles: ["PROJECT_SALES"],
      department: "PROJECT_SALES",
      permissions: [],
    });

    expect(canCreateProjectLead(projectSales)).toBe(false);
    expect(canCreateRetailLead(projectSales)).toBe(false);
  });

  it("allows system admin to create both retail and project leads when lead permission exists", () => {
    const admin = user({
      roles: ["SYSTEM_ADMIN"],
      department: "IT",
      dataScope: "ALL",
      permissions: [PERMISSIONS.LEADS_MANAGE_ALL],
    });

    expect(canCreateRetailLead(admin)).toBe(true);
    expect(canCreateProjectLead(admin)).toBe(true);
  });
});
