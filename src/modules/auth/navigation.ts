import type { AuthenticatedUser } from "@/lib/auth/session";
import { PERMISSIONS } from "@/modules/rbac/permissions";

export type NavigationSection = "workspace" | "work" | "control";

export type NavigationItem = {
  label: string;
  href: string;
  available: boolean;
  section: NavigationSection;
  icon: string;
  priority: number;
};

export type NavigationScope = {
  workspace: "retail" | "project" | "mixed";
  label: string;
  scopeLabel: string;
  roleLabel: string;
  roleView: "sales" | "design" | "finance" | "orders" | "ceo" | "admin" | "management" | "general";
};

function hasRole(user: AuthenticatedUser, role: string): boolean { return user.roles.includes(role); }
function hasAnyRole(user: AuthenticatedUser, roles: readonly string[]): boolean { return roles.some((role) => hasRole(user, role)); }
function can(user: AuthenticatedUser, permission: string): boolean { return user.permissions.includes(permission); }
function canAccessLeads(user: AuthenticatedUser): boolean { return can(user, PERMISSIONS.LEADS_MANAGE_OWN) || can(user, PERMISSIONS.LEADS_MANAGE_ALL) || can(user, PERMISSIONS.LEADS_VIEW_ALL); }
function canAccessOpportunities(user: AuthenticatedUser): boolean { return can(user, PERMISSIONS.OPPORTUNITIES_MANAGE_OWN) || can(user, PERMISSIONS.OPPORTUNITIES_MANAGE_ALL) || can(user, PERMISSIONS.OPPORTUNITIES_VIEW_ALL); }
function isAdminUser(user: AuthenticatedUser): boolean { return hasRole(user, "SYSTEM_ADMIN") || can(user, PERMISSIONS.SYSTEM_ADMIN); }
function hasPipelineRole(user: AuthenticatedUser): boolean { return hasAnyRole(user, ["RETAIL_SALES", "PROJECT_SALES", "PROJECT_MANAGER", "MANAGER"]) || isAdminUser(user); }
function roleViewFor(user: AuthenticatedUser): NavigationScope["roleView"] {
  if (isAdminUser(user)) return "admin";
  if (hasRole(user, "CEO_VIEWER")) return "ceo";
  if (hasRole(user, "FINANCE")) return "finance";
  if (hasRole(user, "ORDER_COORDINATOR")) return "orders";
  if (hasRole(user, "DESIGNER")) return "design";
  if (hasPipelineRole(user)) return "sales";
  if (hasAnyRole(user, ["MANAGER", "PROJECT_MANAGER"])) return "management";
  return "general";
}

export function workspaceKind(user: AuthenticatedUser): "retail" | "project" | "mixed" {
  const retailRole = hasRole(user, "RETAIL_SALES");
  const projectRole = hasAnyRole(user, ["PROJECT_SALES", "PROJECT_MANAGER"]);
  if (retailRole && !projectRole) return "retail";
  if (projectRole && !retailRole) return "project";
  return "mixed";
}

export function navigationScopeFor(user: AuthenticatedUser): NavigationScope {
  const workspace = workspaceKind(user);
  const roleView = roleViewFor(user);
  const roleLabel = user.roles.map((role) => role.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (char) => char.toUpperCase())).join(" / ") || "User";
  if (roleView === "finance") return { workspace: "mixed", label: "Finance workspace", scopeLabel: user.dataScope === "ALL" ? "Company-wide finance" : "Assigned finance work", roleLabel, roleView };
  if (roleView === "orders") return { workspace: "mixed", label: "Orders / handover workspace", scopeLabel: user.dataScope === "ALL" ? "Company handovers" : "Assigned handovers", roleLabel, roleView };
  if (roleView === "ceo") return { workspace: "mixed", label: "Executive overview", scopeLabel: "Company-wide", roleLabel, roleView };
  return { workspace, label: workspace === "retail" ? "Retail kitchen workspace" : workspace === "project" ? "Projects / villas workspace" : "Mixed company workspace", scopeLabel: user.dataScope === "ALL" ? "Company-wide" : "My assigned work", roleLabel, roleView };
}

function leadLabelFor(user: AuthenticatedUser): string { const workspace = workspaceKind(user); if (workspace === "retail") return "Retail Leads"; if (workspace === "project") return "Project Leads"; return "Leads"; }
function opportunityLabelFor(user: AuthenticatedUser): string { const workspace = workspaceKind(user); if (workspace === "retail") return "Retail Pipeline"; if (workspace === "project") return "Project Pipeline"; return "Pipeline"; }
function item(options: Omit<NavigationItem, "available"> & { available?: boolean }) { return { ...options, available: options.available ?? true }; }

export function navigationFor(user: AuthenticatedUser): NavigationItem[] {
  const roleView = roleViewFor(user);
  const pipelineVisible = hasPipelineRole(user) && canAccessOpportunities(user);
  const leadsVisible = hasPipelineRole(user) && canAccessLeads(user);
  const customersVisible = can(user, PERMISSIONS.CUSTOMERS_VIEW) && !["finance", "orders", "ceo"].includes(roleView);
  return [
    item({ label: "Dashboard", href: roleView === "ceo" ? "/reports" : "/dashboard", section: "workspace", icon: roleView === "ceo" ? "bi-bar-chart-line" : "bi-speedometer2", priority: 10 }),
    item({ label: leadLabelFor(user), href: "/leads", available: leadsVisible, section: "workspace", icon: "bi-person-lines-fill", priority: 20 }),
    item({ label: opportunityLabelFor(user), href: "/opportunities", available: pipelineVisible, section: "workspace", icon: "bi-kanban", priority: 30 }),
    item({ label: "Customers", href: "/customers", available: customersVisible, section: "workspace", icon: "bi-people", priority: 40 }),
    item({ label: roleView === "orders" ? "Handover Tasks" : "My Tasks", href: "/tasks", available: can(user, PERMISSIONS.TASKS_MANAGE), section: "work", icon: "bi-list-check", priority: 50 }),
    item({ label: "Alerts / Mentions", href: "/notifications", section: "work", icon: "bi-bell", priority: 60 }),
    item({ label: "Pricing / Finance", href: "/pricing", available: roleView !== "ceo" && (can(user, PERMISSIONS.FINANCE_PRICING_PREPARE) || can(user, PERMISSIONS.FINANCE_PRICING_REVIEW) || can(user, PERMISSIONS.PROJECT_PRICING_PREPARE) || can(user, PERMISSIONS.PRICING_MANAGER_APPROVE) || can(user, PERMISSIONS.FINANCE_COST_VIEW)), section: "work", icon: "bi-calculator", priority: 70 }),
    item({ label: "Orders / Handover", href: "/orders", available: can(user, PERMISSIONS.ORDER_HANDOVER_MANAGE) || hasRole(user, "ORDER_COORDINATOR"), section: "work", icon: "bi-box-seam", priority: 80 }),
    item({ label: "Reports", href: "/reports", available: can(user, PERMISSIONS.CEO_REPORTS_VIEW) && roleView !== "ceo", section: "control", icon: "bi-graph-up-arrow", priority: 90 }),
    item({ label: "Audit", href: "/audit", available: can(user, PERMISSIONS.AUDIT_VIEW), section: "control", icon: "bi-shield-lock", priority: 100 }),
    item({ label: "Admin", href: "/admin", available: can(user, PERMISSIONS.SYSTEM_ADMIN), section: "control", icon: "bi-sliders", priority: 110 }),
    item({ label: "Settings", href: "/settings", section: "control", icon: "bi-gear", priority: 120 }),
  ].filter((navigationItem) => navigationItem.available).sort((a, b) => a.priority - b.priority);
}
