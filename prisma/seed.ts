import "dotenv/config";
import { randomBytes } from "node:crypto";
import argon2 from "argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  AccountType,
  DataScope,
  Department,
  DocumentCategory,
  OpportunityTrack,
  PrismaClient,
  RoleKey,
} from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

const roles = [
  [RoleKey.MANAGER, "Manager"],
  [RoleKey.FINANCE, "Finance"],
  [RoleKey.ORDER_COORDINATOR, "Order Coordinator"],
  [RoleKey.PROJECT_MANAGER, "Project Manager"],
  [RoleKey.PROJECT_SALES, "Project Sales"],
  [RoleKey.RETAIL_SALES, "Retail Sales"],
  [RoleKey.DESIGNER, "Designer"],
  [RoleKey.CEO_VIEWER, "CEO Viewer"],
  [RoleKey.SYSTEM_ADMIN, "System Admin"],
] as const;

const permissionDefinitions = [
  ["crm.leads.manage_own", "CRM", "Create and manage owned leads"],
  ["crm.leads.manage_all", "CRM", "Create, assign, and manage all leads"],
  ["crm.leads.view_all", "CRM", "View all leads"],
  ["crm.leads.convert", "CRM", "Convert qualified leads to customers and opportunities"],
  ["crm.customers.view", "CRM", "View customers within data scope"],
  ["crm.customers.manage", "CRM", "Manage customer contacts within data scope"],
  ["crm.opportunities.manage_own", "CRM", "Manage owned or assigned opportunities"],
  ["crm.opportunities.manage_all", "CRM", "Assign and manage all opportunities"],
  ["crm.opportunities.view_all", "CRM", "View all opportunities"],
  ["tasks.manage", "Tasks", "Create, assign, comment, and complete tasks"],
  ["documents.upload", "Documents", "Upload operational documents"],
  ["design.assign", "Design", "Assign design work to a designer"],
  ["pricing.design.prepare", "Design", "Enter Design values and submit the design package"],
  ["pricing.finance.prepare", "Pricing", "Prepare Retail finance pricing and final conversion rate"],
  ["pricing.finance.review", "Pricing", "Review and confirm finance pricing"],
  ["pricing.retail.discount", "Pricing", "Set manager-approved customer discount"],
  ["pricing.manager.approve", "Pricing", "Approve or return final Retail and Project pricing"],
  ["pricing.project.prepare", "Pricing", "Prepare Project costing summary from approved Excel evidence"],
  ["finance.cost.view", "Finance", "View supplier cost and internal cost lines"],
  ["finance.margin.view", "Finance", "View gross profit and margin"],
  ["finance.deposit.confirm", "Finance", "Confirm customer deposits"],
  ["quotation.generate", "Quotations", "Generate and preview quotation versions"],
  ["quotation.send", "Quotations", "Mark approved quotation versions as sent"],
  ["checklist.update", "Checklist", "Complete assigned digital readiness checklist items"],
  ["checklist.admin", "Checklist", "Configure checklist definitions"],
  ["orders.handover.manage", "Orders", "Manage supplier handover, order confirmation, ERP PO reference, and ETA"],
  ["reports.ceo.view", "Reports", "View executive dashboards"],
  ["admin.system.manage", "Admin", "Manage system settings and audit"],
  ["admin.rbac.manage", "Admin", "Manage user roles, scopes, and role permissions"],
  ["admin.approvals.manage", "Admin", "Manage approval workflow settings"],
  ["audit.view", "Audit", "View audit logs"],
] as const;

const rolePermissionMap: Record<RoleKey, string[]> = {
  MANAGER: [
    "crm.leads.manage_all", "crm.leads.view_all", "crm.leads.convert",
    "crm.customers.view", "crm.customers.manage",
    "crm.opportunities.manage_all", "crm.opportunities.view_all",
    "tasks.manage", "design.assign", "pricing.retail.discount",
    "pricing.manager.approve", "finance.cost.view", "finance.margin.view",
    "quotation.generate", "quotation.send", "checklist.update", "audit.view",
  ],
  FINANCE: [
    "crm.customers.view", "crm.opportunities.view_all", "tasks.manage",
    "documents.upload", "pricing.finance.prepare", "pricing.finance.review",
    "pricing.project.prepare", "finance.cost.view", "finance.margin.view",
    "finance.deposit.confirm", "checklist.update",
  ],
  ORDER_COORDINATOR: [
    "tasks.manage", "documents.upload", "checklist.update", "orders.handover.manage",
  ],
  PROJECT_MANAGER: [
    "crm.leads.manage_own", "crm.leads.convert", "crm.customers.view",
    "crm.customers.manage", "crm.opportunities.manage_own", "tasks.manage",
    "documents.upload", "quotation.generate", "quotation.send", "checklist.update",
  ],
  PROJECT_SALES: [
    "crm.leads.manage_own", "crm.leads.convert", "crm.customers.view",
    "crm.customers.manage", "crm.opportunities.manage_own", "tasks.manage",
    "documents.upload", "quotation.generate", "quotation.send", "checklist.update",
  ],
  RETAIL_SALES: [
    "crm.leads.manage_own", "crm.leads.convert", "crm.customers.view",
    "crm.customers.manage", "crm.opportunities.manage_own", "tasks.manage",
    "documents.upload", "quotation.generate", "quotation.send", "checklist.update",
  ],
  DESIGNER: [
    "crm.customers.view", "crm.opportunities.manage_own", "tasks.manage",
    "documents.upload", "pricing.design.prepare", "checklist.update",
  ],
  CEO_VIEWER: [
    "crm.leads.view_all", "crm.customers.view", "crm.opportunities.view_all",
    "finance.cost.view", "finance.margin.view", "reports.ceo.view",
  ],
  SYSTEM_ADMIN: [
    "admin.system.manage", "admin.rbac.manage", "admin.approvals.manage",
    "checklist.admin", "audit.view",
  ],
};

const users = [
  {
    email: "alex.morgan@northstar.example",
    displayName: "Alex Morgan",
    initials: "AM",
    department: Department.MANAGEMENT,
    scope: DataScope.ALL,
    role: RoleKey.MANAGER,
    accountType: AccountType.PERSONAL,
  },
  {
    email: "finance@northstar.example",
    displayName: "Nora Bennett",
    initials: null,
    department: Department.FINANCE,
    scope: DataScope.ALL,
    role: RoleKey.FINANCE,
    accountType: AccountType.SHARED_TEMPORARY,
  },
  {
    email: "jordan.lee@northstar.example",
    displayName: "Jordan Lee",
    initials: "RP",
    department: Department.ORDER_COORDINATION,
    scope: DataScope.ASSIGNED,
    role: RoleKey.ORDER_COORDINATOR,
    accountType: AccountType.PERSONAL,
  },
  {
    email: "daniel.reed@northstar.example",
    displayName: "Daniel Reed",
    initials: "KA",
    department: Department.PROJECT_SALES,
    scope: DataScope.OWN,
    role: RoleKey.PROJECT_MANAGER,
    accountType: AccountType.PERSONAL,
  },
  {
    email: "samir.khan@northstar.example",
    displayName: "Samir Khan",
    initials: "SS",
    department: Department.PROJECT_SALES,
    scope: DataScope.OWN,
    role: RoleKey.PROJECT_SALES,
    accountType: AccountType.PERSONAL,
  },
  {
    email: "sara.haddad@northstar.example",
    displayName: "Sara Haddad",
    initials: "AB",
    department: Department.RETAIL_SALES,
    scope: DataScope.OWN,
    role: RoleKey.RETAIL_SALES,
    extraRole: RoleKey.DESIGNER,
    accountType: AccountType.PERSONAL,
  },
  {
    email: "omar.nasser@northstar.example",
    displayName: "Omar Nasser",
    initials: "MH",
    department: Department.RETAIL_SALES,
    scope: DataScope.OWN,
    role: RoleKey.RETAIL_SALES,
    extraRole: RoleKey.DESIGNER,
    accountType: AccountType.PERSONAL,
  },
  {
    email: "maya.chen@northstar.example",
    displayName: "Maya Chen",
    initials: "JN",
    department: Department.DESIGN,
    scope: DataScope.ASSIGNED,
    role: RoleKey.DESIGNER,
    accountType: AccountType.PERSONAL,
  },
  {
    email: "ceo@northstar.example",
    displayName: "CEO Viewer",
    initials: null,
    department: Department.MANAGEMENT,
    scope: DataScope.ALL,
    role: RoleKey.CEO_VIEWER,
    accountType: AccountType.SHARED_TEMPORARY,
  },
  {
    email: "admin@northstar.example",
    displayName: "System Admin",
    initials: null,
    department: Department.IT,
    scope: DataScope.ALL,
    role: RoleKey.SYSTEM_ADMIN,
    accountType: AccountType.SHARED_TEMPORARY,
  },
] as const;

function createTemporaryPassword(): string {
  return randomBytes(12).toString("base64url");
}

async function main() {
  for (const [key, name] of roles) {
    await db.role.upsert({
      where: { key },
      create: { key, name },
      update: { name, isActive: true },
    });
  }

  const permissionByKey = new Map<string, string>();
  for (const [key, category, description] of permissionDefinitions) {
    const permission = await db.permission.upsert({
      where: { key },
      create: { key, category, description },
      update: { category, description },
    });
    permissionByKey.set(key, permission.id);
  }

  for (const [roleKey, permissionKeys] of Object.entries(rolePermissionMap) as [RoleKey, string[]][]) {
    const role = await db.role.findUniqueOrThrow({ where: { key: roleKey } });
    // The seed is authoritative for baseline role permissions. Removing stale rows
    // prevents users retaining permissions from older development patches.
    await db.rolePermission.deleteMany({ where: { roleId: role.id } });
    for (const permissionKey of permissionKeys) {
      const permissionId = permissionByKey.get(permissionKey);
      if (!permissionId) throw new Error(`Unknown permission: ${permissionKey}`);
      await db.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        create: { roleId: role.id, permissionId, allowed: true },
        update: { allowed: true },
      });
    }
  }

  const outputPasswords = process.env.SEED_OUTPUT_TEMP_PASSWORDS === "true";
  const generatedCredentials: Array<{ email: string; password: string }> = [];

  for (const userDefinition of users) {
    const existingUser = await db.user.findUnique({
      where: { email: userDefinition.email },
      select: { id: true, email: true },
    });

    let user: { id: string; email: string };

    if (existingUser) {
      user = await db.user.update({
        where: { id: existingUser.id },
        data: {
          displayName: userDefinition.displayName,
          initials: userDefinition.initials,
          department: userDefinition.department,
          dataScope: userDefinition.scope,
          accountType: userDefinition.accountType,
        },
        select: { id: true, email: true },
      });
    } else {
      const temporaryPassword = createTemporaryPassword();
      const passwordHash = await argon2.hash(temporaryPassword, {
        type: argon2.argon2id,
      });

      user = await db.user.create({
        data: {
          email: userDefinition.email,
          displayName: userDefinition.displayName,
          initials: userDefinition.initials,
          passwordHash,
          department: userDefinition.department,
          dataScope: userDefinition.scope,
          accountType: userDefinition.accountType,
          forcePasswordChange: true,
        },
        select: { id: true, email: true },
      });

      if (outputPasswords) {
        generatedCredentials.push({
          email: user.email,
          password: temporaryPassword,
        });
      }
    }

    // Keep seeded user roles deterministic while preserving custom roles for users
    // that are not part of this baseline seed.
    await db.userRole.deleteMany({ where: { userId: user.id } });
    for (const roleKey of [
      userDefinition.role,
      "extraRole" in userDefinition ? userDefinition.extraRole : undefined,
    ].filter(Boolean) as RoleKey[]) {
      const role = await db.role.findUniqueOrThrow({ where: { key: roleKey } });
      await db.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        create: { userId: user.id, roleId: role.id },
        update: {},
      });
    }
  }

  const sequences = [
    ["LEAD_INTERNAL", 0n, 6],
    ["CUSTOMER_INTERNAL", 0n, 6],
    ["OPPORTUNITY_INTERNAL", 0n, 6],
    ["TASK_INTERNAL", 0n, 6],
    ["QUOTATION_INTERNAL", 0n, 6],
    ["QUOTATION_BUSINESS", 85n, 4],
  ] as const;

  for (const [key, currentValue, padding] of sequences) {
    await db.numberSequence.upsert({
      where: { key },
      create: { key, currentValue, padding },
      update: {},
    });
  }

  const settings = [
    {
      key: "retail.pricing.v3",
      description: "Retail defaults. Design package values use supplier inputs; Finance controls internal costing and commercial margin.",
      value: {
        formulaVersion: "DEMO_PRICING_V1",
        supplierPointFactorReference: "6.75",
        defaultCostingRateEurAed: "4.25",
        kitchenSellingRate: "6.75",
        hlpSellingRate: "6.25",
        kitchenDiscountCascadePct: ["40", "5", "3"],
        hlpDiscountPct: "25",
        defaultAppliancesMarkupPct: "10",
        customsPct: "4",
        defaultClearanceAed: "2500",
        vatCalculatedByCrm: false,
      },
    },
    {
      key: "quotation.defaults",
      description: "Default generated quotation settings.",
      value: {
        validityDays: 30,
        paymentTerms: "30% demo deposit with order; remaining balance follows the configured payment schedule.",
        showVat: false,
      },
    },
    {
      key: "approval.workflow",
      description: "Configurable approval workflow switches.",
      value: {
        financePreparesRetail: true,
        financePreparesProject: true,
        managerFinalApprovalRequired: true,
        managerApprovesAnyCustomerDiscount: true,
      },
    },
  ] as const;

  for (const setting of settings) {
    await db.systemSetting.upsert({
      where: { key: setting.key },
      create: setting,
      update: { description: setting.description },
    });
  }

  const checklistDefinitions = [
    { key: "sales.customer_verified", section: "Sales & Customer", label: "Customer contact details are verified", responsibleRole: RoleKey.RETAIL_SALES, required: true, autoRule: "CUSTOMER_VERIFIED", sortOrder: 10 },
    { key: "sales.site_address", section: "Sales & Customer", label: "Site address and project location are recorded", responsibleRole: RoleKey.RETAIL_SALES, required: true, autoRule: "SITE_ADDRESS", sortOrder: 20 },
    { key: "sales.measurement", section: "Sales & Customer", label: "Measurement is completed or marked not required", responsibleRole: RoleKey.RETAIL_SALES, required: true, autoRule: "MEASUREMENT_COMPLETE", sortOrder: 30 },
    { key: "design.assigned", section: "Design Package", label: "Designer is assigned", responsibleRole: RoleKey.DESIGNER, required: true, autoRule: "DESIGN_ASSIGNED", sortOrder: 100 },
    { key: "design.package_values", section: "Design Package", label: "Design Furniture and HLP values are entered", responsibleRole: RoleKey.DESIGNER, required: true, autoRule: "DESIGN_VALUES", sortOrder: 110 },
    { key: "design.source_file", section: "Design Package", label: "Design source file is uploaded", responsibleRole: RoleKey.DESIGNER, required: true, autoRule: "DOCUMENT", evidenceCategory: DocumentCategory.DESIGN_SOURCE_FILE, sortOrder: 120 },
    { key: "design.design_pdf", section: "Design Package", label: "Design PDF is uploaded", responsibleRole: RoleKey.DESIGNER, required: true, autoRule: "DOCUMENT", evidenceCategory: DocumentCategory.DESIGN, sortOrder: 130 },
    { key: "design.element_list", section: "Design Package", label: "Element List is uploaded", responsibleRole: RoleKey.DESIGNER, required: true, autoRule: "DOCUMENT", evidenceCategory: DocumentCategory.ELEMENT_LIST, sortOrder: 140 },
    { key: "design.supplier_quotation", section: "Design Package", label: "Supplier design quotation is uploaded", responsibleRole: RoleKey.DESIGNER, required: true, autoRule: "DOCUMENT", evidenceCategory: DocumentCategory.DESIGN_SUPPLIER_QUOTATION, sortOrder: 150 },
    { key: "design.appliance_review", section: "Design Package", label: "Appliance locations, utilities, openings, colours and door directions are reviewed", responsibleRole: RoleKey.DESIGNER, required: true, sortOrder: 160 },
    { key: "retail.customer_design_acceptance", section: "Design Package", label: "Customer approval of the final design is recorded", track: OpportunityTrack.RETAIL, responsibleRole: RoleKey.RETAIL_SALES, required: true, sortOrder: 170 },
    { key: "project.customer_design_acceptance", section: "Design Package", label: "Client/consultant approval of the final design or submission is recorded", track: OpportunityTrack.PROJECT, responsibleRole: RoleKey.PROJECT_SALES, required: true, sortOrder: 170 },
    { key: "project.costing_excel", section: "Pricing & Approval", label: "Project Costing Excel is uploaded", track: OpportunityTrack.PROJECT, responsibleRole: RoleKey.FINANCE, required: true, autoRule: "DOCUMENT", evidenceCategory: DocumentCategory.PROJECT_COSTING, sortOrder: 190 },
    { key: "finance.pricing", section: "Pricing & Approval", label: "Finance pricing is completed", responsibleRole: RoleKey.FINANCE, required: true, autoRule: "FINANCE_PRICING", sortOrder: 200 },
    { key: "manager.approval", section: "Pricing & Approval", label: "Branch Manager final pricing approval is recorded", responsibleRole: RoleKey.MANAGER, required: true, autoRule: "MANAGER_APPROVED", sortOrder: 210 },
    { key: "sales.quotation", section: "Customer Quotation", label: "Approved quotation version is generated and sent", responsibleRole: RoleKey.RETAIL_SALES, required: true, autoRule: "QUOTATION_SENT", sortOrder: 300 },
    { key: "finance.invoice", section: "Invoice & Deposit", label: "Finance invoice reference is recorded", responsibleRole: RoleKey.FINANCE, required: true, autoRule: "INVOICE_RECORDED", sortOrder: 400 },
    { key: "finance.deposit", section: "Invoice & Deposit", label: "Configured demo deposit threshold is confirmed by Finance", responsibleRole: RoleKey.FINANCE, required: true, autoRule: "DEPOSIT_CONFIRMED", sortOrder: 410 },
    { key: "operations.handover", section: "Operations Handover", label: "Won package is ready for Operations handover", responsibleRole: RoleKey.ORDER_COORDINATOR, required: true, autoRule: "WON_HANDOVER", sortOrder: 500 },
  ] as const;

  for (const definition of checklistDefinitions) {
    await db.checklistDefinition.upsert({
      where: { key: definition.key },
      create: {
        key: definition.key,
        section: definition.section,
        label: definition.label,
        track: "track" in definition ? definition.track : null,
        responsibleRole: definition.responsibleRole,
        required: definition.required,
        autoRule: "autoRule" in definition ? definition.autoRule : null,
        evidenceCategory: "evidenceCategory" in definition ? definition.evidenceCategory : null,
        sortOrder: definition.sortOrder,
      },
      update: {
        section: definition.section,
        label: definition.label,
        track: "track" in definition ? definition.track : null,
        responsibleRole: definition.responsibleRole,
        required: definition.required,
        autoRule: "autoRule" in definition ? definition.autoRule : null,
        evidenceCategory: "evidenceCategory" in definition ? definition.evidenceCategory : null,
        sortOrder: definition.sortOrder,
        isActive: true,
      },
    });
  }

  if (outputPasswords) {
    console.log("Development-only temporary credentials:");
    console.table(generatedCredentials);
    console.log("Change every password on first login. Do not commit or retain this output.");
  } else {
    console.log("Users seeded. Temporary passwords were not printed.");
    console.log("Set SEED_OUTPUT_TEMP_PASSWORDS=true only in a safe local development session.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
