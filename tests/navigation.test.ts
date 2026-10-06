import { describe, expect, it } from "vitest";
import type { AuthenticatedUser } from "@/lib/auth/session";
import { navigationFor, navigationScopeFor } from "@/modules/auth/navigation";
import { PERMISSIONS } from "@/modules/rbac/permissions";

function user(
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser {
  return {
    id: "user-1",
    email: "user@northstar.example",
    displayName: "Test User",
    initials: "TU",
    department: "RETAIL_SALES",
    dataScope: "OWN",
    forcePasswordChange: false,
    accountType: "PERSONAL",
    roles: ["RETAIL_SALES"],
    permissions: [],
    ...overrides,
  };
}

function labelsFor(user: AuthenticatedUser): string[] {
  return navigationFor(user).map((item) => item.label);
}

function sectionsFor(user: AuthenticatedUser): string[] {
  return navigationFor(user).map((item) => item.section);
}

describe("role navigation", () => {
  it("shows retail workspace labels for retail sales", () => {
    expect(
      labelsFor(
        user({
          roles: ["RETAIL_SALES"],
          department: "RETAIL_SALES",
          permissions: [
            PERMISSIONS.LEADS_MANAGE_OWN,
            PERMISSIONS.OPPORTUNITIES_MANAGE_OWN,
          ],
        }),
      ),
    ).toEqual([
      "Dashboard",
      "Retail Leads",
      "Retail Pipeline",
      "Alerts / Mentions",
      "Settings",
    ]);
  });

  it("shows project workspace labels for project sales", () => {
    expect(
      labelsFor(
        user({
          roles: ["PROJECT_SALES"],
          department: "PROJECT_SALES",
          permissions: [
            PERMISSIONS.LEADS_MANAGE_OWN,
            PERMISSIONS.OPPORTUNITIES_MANAGE_OWN,
          ],
        }),
      ),
    ).toEqual([
      "Dashboard",
      "Project Leads",
      "Project Pipeline",
      "Alerts / Mentions",
      "Settings",
    ]);
  });

  it("keeps project opportunity label even without lead creation permission", () => {
    expect(
      labelsFor(
        user({
          roles: ["PROJECT_SALES"],
          department: "PROJECT_SALES",
          permissions: [PERMISSIONS.OPPORTUNITIES_MANAGE_OWN],
        }),
      ),
    ).toEqual([
      "Dashboard",
      "Project Pipeline",
      "Alerts / Mentions",
      "Settings",
    ]);
  });

  it("keeps retail opportunity label even without lead creation permission", () => {
    expect(
      labelsFor(
        user({
          roles: ["RETAIL_SALES"],
          department: "RETAIL_SALES",
          permissions: [PERMISSIONS.OPPORTUNITIES_MANAGE_OWN],
        }),
      ),
    ).toEqual([
      "Dashboard",
      "Retail Pipeline",
      "Alerts / Mentions",
      "Settings",
    ]);
  });

  it("uses generic labels for mixed management workspace", () => {
    expect(
      labelsFor(
        user({
          roles: ["MANAGER"],
          department: "MANAGEMENT",
          dataScope: "ALL",
          permissions: [
            PERMISSIONS.LEADS_VIEW_ALL,
            PERMISSIONS.OPPORTUNITIES_VIEW_ALL,
          ],
        }),
      ),
    ).toEqual([
      "Dashboard",
      "Leads",
      "Pipeline",
      "Alerts / Mentions",
      "Settings",
    ]);
  });

  it("shows customers when customer permission is loaded", () => {
    expect(
      labelsFor(
        user({
          permissions: [PERMISSIONS.CUSTOMERS_VIEW],
        }),
      ),
    ).toEqual([
      "Dashboard",
      "Customers",
      "Alerts / Mentions",
      "Settings",
    ]);
  });

  it("shows tasks and notifications as operational quick access", () => {
    expect(
      labelsFor(
        user({
          permissions: [PERMISSIONS.TASKS_MANAGE],
        }),
      ),
    ).toEqual([
      "Dashboard",
      "My Tasks",
      "Alerts / Mentions",
      "Settings",
    ]);
  });

  it("does not expose finance, audit, or admin navigation without permission", () => {
    expect(labelsFor(user())).toEqual([
      "Dashboard",
      "Alerts / Mentions",
      "Settings",
    ]);
  });

  it("shows finance navigation only with finance permission", () => {
    expect(
      labelsFor(
        user({
          permissions: [PERMISSIONS.FINANCE_PRICING_REVIEW],
        }),
      ),
    ).toEqual([
      "Dashboard",
      "Alerts / Mentions",
      "Pricing / Finance",
      "Settings",
    ]);
  });

  it("shows audit trail only with audit permission", () => {
    expect(
      labelsFor(
        user({
          permissions: [PERMISSIONS.AUDIT_VIEW],
        }),
      ),
    ).toEqual([
      "Dashboard",
      "Alerts / Mentions",
      "Audit",
      "Settings",
    ]);
  });

  it("shows administration only with system admin permission", () => {
    expect(
      labelsFor(
        user({
          roles: ["SYSTEM_ADMIN"],
          department: "IT",
          dataScope: "ALL",
          permissions: [PERMISSIONS.SYSTEM_ADMIN],
        }),
      ),
    ).toEqual([
      "Dashboard",
      "Alerts / Mentions",
      "Admin",
      "Settings",
    ]);
  });

  it("keeps operational work before control links", () => {
    expect(
      sectionsFor(
        user({
          roles: ["SYSTEM_ADMIN"],
          department: "IT",
          dataScope: "ALL",
          permissions: [
            PERMISSIONS.TASKS_MANAGE,
            PERMISSIONS.AUDIT_VIEW,
            PERMISSIONS.SYSTEM_ADMIN,
          ],
        }),
      ),
    ).toEqual(["workspace", "work", "work", "control", "control", "control"]);
  });

  it("describes own retail scope for focused sales users", () => {
    expect(
      navigationScopeFor(
        user({
          roles: ["RETAIL_SALES"],
          department: "RETAIL_SALES",
          dataScope: "OWN",
        }),
      ),
    ).toEqual({
      workspace: "retail",
      label: "Retail kitchen workspace",
      scopeLabel: "My assigned work",
      roleLabel: "Retail Sales",
      roleView: "sales",
    });
  });

  it("describes company scope for mixed management users", () => {
    expect(
      navigationScopeFor(
        user({
          roles: ["MANAGER"],
          department: "MANAGEMENT",
          dataScope: "ALL",
        }),
      ),
    ).toEqual({
      workspace: "mixed",
      label: "Mixed company workspace",
      scopeLabel: "Company-wide",
      roleLabel: "Manager",
      roleView: "sales",
    });
  });

  it("keeps finance users on finance queues instead of the sales pipeline", () => {
    expect(labelsFor(user({ roles: ["FINANCE"], department: "FINANCE", dataScope: "ALL", permissions: [PERMISSIONS.OPPORTUNITIES_VIEW_ALL, PERMISSIONS.CUSTOMERS_VIEW, PERMISSIONS.FINANCE_PRICING_REVIEW, PERMISSIONS.TASKS_MANAGE] }))).toEqual(["Dashboard", "My Tasks", "Alerts / Mentions", "Pricing / Finance", "Settings"]);
  });

  it("keeps Order Coordination users focused on handover work instead of the sales pipeline", () => {
    expect(labelsFor(user({ roles: ["ORDER_COORDINATOR"], department: "OPERATIONS", dataScope: "OWN", permissions: [PERMISSIONS.OPPORTUNITIES_VIEW_ALL, PERMISSIONS.ORDER_HANDOVER_MANAGE, PERMISSIONS.TASKS_MANAGE] }))).toEqual(["Dashboard", "Handover Tasks", "Alerts / Mentions", "Orders / Handover", "Settings"]);
  });

  it("routes CEO viewer navigation to the executive dashboard", () => {
    const ceo = user({ roles: ["CEO_VIEWER"], department: "MANAGEMENT", dataScope: "ALL", permissions: [PERMISSIONS.CEO_REPORTS_VIEW, PERMISSIONS.OPPORTUNITIES_VIEW_ALL] });
    expect(labelsFor(ceo)).toEqual(["Dashboard", "Alerts / Mentions", "Settings"]);
    expect(navigationFor(ceo)[0]?.href).toBe("/reports");
  });

});
