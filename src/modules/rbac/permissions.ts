export const PERMISSIONS = {
  LEADS_MANAGE_OWN: "crm.leads.manage_own",
  LEADS_MANAGE_ALL: "crm.leads.manage_all",
  LEADS_VIEW_ALL: "crm.leads.view_all",
  LEADS_CONVERT: "crm.leads.convert",
  CUSTOMERS_VIEW: "crm.customers.view",
  CUSTOMERS_MANAGE: "crm.customers.manage",
  OPPORTUNITIES_MANAGE_OWN: "crm.opportunities.manage_own",
  OPPORTUNITIES_MANAGE_ALL: "crm.opportunities.manage_all",
  OPPORTUNITIES_VIEW_ALL: "crm.opportunities.view_all",
  TASKS_MANAGE: "tasks.manage",
  DOCUMENTS_UPLOAD: "documents.upload",
  DESIGN_ASSIGN: "design.assign",
  DESIGN_PACKAGE_PREPARE: "pricing.design.prepare",
  FINANCE_PRICING_PREPARE: "pricing.finance.prepare",
  FINANCE_PRICING_REVIEW: "pricing.finance.review",
  RETAIL_DISCOUNT_MANAGE: "pricing.retail.discount",
  PRICING_MANAGER_APPROVE: "pricing.manager.approve",
  PROJECT_PRICING_PREPARE: "pricing.project.prepare",
  FINANCE_COST_VIEW: "finance.cost.view",
  FINANCE_MARGIN_VIEW: "finance.margin.view",
  DEPOSIT_CONFIRM: "finance.deposit.confirm",
  QUOTATION_GENERATE: "quotation.generate",
  QUOTATION_SEND: "quotation.send",
  CHECKLIST_UPDATE: "checklist.update",
  CHECKLIST_ADMIN: "checklist.admin",
  ORDER_HANDOVER_MANAGE: "orders.handover.manage",
  CEO_REPORTS_VIEW: "reports.ceo.view",
  SYSTEM_ADMIN: "admin.system.manage",
  RBAC_ADMIN: "admin.rbac.manage",
  APPROVAL_SETTINGS_ADMIN: "admin.approvals.manage",
  AUDIT_VIEW: "audit.view",
} as const;

export type PermissionKey =
  (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const FINANCIAL_FIELD_PERMISSIONS = {
  supplierCost: PERMISSIONS.FINANCE_COST_VIEW,
  supplierDiscount: PERMISSIONS.FINANCE_COST_VIEW,
  grossProfit: PERMISSIONS.FINANCE_MARGIN_VIEW,
  grossMarginPct: PERMISSIONS.FINANCE_MARGIN_VIEW,
  projectCosting: PERMISSIONS.FINANCE_COST_VIEW,
} as const;
