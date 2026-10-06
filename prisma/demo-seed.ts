import "dotenv/config";
import argon2 from "argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  ActivityType,
  ApprovalStatus,
  AuditAction,
  ApprovalType,
  ChecklistStatus,
  CustomerType,
  DataQualityStatus,
  DepositStatus,
  DesignJobStatus,
  DesignPackageStatus,
  HandoverStatus,
  LeadStatus,
  MeasurementStatus,
  NotificationType,
  OpportunityMemberRole,
  OpportunityStage,
  OpportunityTrack,
  PricingCaseType,
  PricingLineCategory,
  PricingReviewDecision,
  PricingStatus,
  PrismaClient,
  QuotationStatus,
  TaskPriority,
  TaskStatus,
  UserStatus,
} from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

const now = new Date();

function daysFromNow(days: number, hour = 10) {
  const date = new Date(now);
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function thisMonth(day: number, hour = 10) {
  const safeDay = Math.max(1, Math.min(day, now.getDate()));
  return new Date(now.getFullYear(), now.getMonth(), safeDay, hour, 0, 0, 0);
}

function previousMonth(day: number, hour = 10) {
  return new Date(now.getFullYear(), now.getMonth() - 1, day, hour, 0, 0, 0);
}

async function requireUser(email: string) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error(
      `Missing seeded user ${email}. Run the baseline Prisma seed before the portfolio demo seed.`,
    );
  }
  return user;
}

const customers = [
  {
    reference: "CUST-DEMO-001",
    name: "Layla Rahman",
    type: CustomerType.INDIVIDUAL,
    email: "layla.rahman@example.test",
    mobile: "+971 50 000 1001",
  },
  {
    reference: "CUST-DEMO-002",
    name: "Karim Faris",
    type: CustomerType.INDIVIDUAL,
    email: "karim.faris@example.test",
    mobile: "+971 50 000 1002",
  },
  {
    reference: "CUST-DEMO-003",
    name: "Noor Alami",
    type: CustomerType.INDIVIDUAL,
    email: "noor.alami@example.test",
    mobile: "+971 50 000 1003",
  },
  {
    reference: "CUST-DEMO-004",
    name: "Rayan Haddad",
    type: CustomerType.INDIVIDUAL,
    email: "rayan.haddad@example.test",
    mobile: "+971 50 000 1004",
  },
  {
    reference: "CUST-DEMO-005",
    name: "Hana Saeed",
    type: CustomerType.INDIVIDUAL,
    email: "hana.saeed@example.test",
    mobile: "+971 50 000 1005",
  },
  {
    reference: "CUST-DEMO-006",
    name: "Atlas Contracting LLC",
    type: CustomerType.CONTRACTOR,
    email: "projects@atlas-contracting.example",
    mobile: null,
  },
  {
    reference: "CUST-DEMO-007",
    name: "Horizon Development PJSC",
    type: CustomerType.COMPANY,
    email: "procurement@horizon-development.example",
    mobile: null,
  },
  {
    reference: "CUST-DEMO-008",
    name: "Cedar Properties LLC",
    type: CustomerType.COMPANY,
    email: "commercial@cedar-properties.example",
    mobile: null,
  },
  {
    reference: "CUST-DEMO-009",
    name: "Riverstone Hospitality",
    type: CustomerType.COMPANY,
    email: "projects@riverstone-hospitality.example",
    mobile: null,
  },
  {
    reference: "CUST-DEMO-010",
    name: "Beacon Workspace LLC",
    type: CustomerType.COMPANY,
    email: "delivery@beacon-workspace.example",
    mobile: null,
  },
  {
    reference: "CUST-DEMO-011",
    name: "Amal Nouri",
    type: CustomerType.INDIVIDUAL,
    email: "amal.nouri@example.test",
    mobile: "+971 50 000 1011",
  },
  {
    reference: "CUST-DEMO-012",
    name: "Summit Engineering Consultancy",
    type: CustomerType.CONSULTANT,
    email: "tenders@summit-engineering.example",
    mobile: null,
  },
] as const;

const opportunityDefinitions = [
  {
    reference: "OPP-DEMO-001",
    customerReference: "CUST-DEMO-001",
    title: "Marina Residence Interior Package",
    track: OpportunityTrack.RETAIL,
    stage: OpportunityStage.CONTACTED,
    ownerEmail: "sara.haddad@northstar.example",
    budget: "72000",
    probability: "20",
    site: "Dubai Marina, Dubai",
    summary: "Initial residential interior package with design consultation and supply.",
    createdDaysAgo: 18,
  },
  {
    reference: "OPP-DEMO-002",
    customerReference: "CUST-DEMO-002",
    title: "Al Reem Apartment Renovation",
    track: OpportunityTrack.RETAIL,
    stage: OpportunityStage.QUALIFIED,
    ownerEmail: "omar.nasser@northstar.example",
    budget: "95000",
    probability: "35",
    site: "Al Reem Island, Abu Dhabi",
    summary: "Qualified renovation scope pending final site measurement.",
    createdDaysAgo: 16,
  },
  {
    reference: "OPP-DEMO-003",
    customerReference: "CUST-DEMO-003",
    title: "Saadiyat Villa Design Package",
    track: OpportunityTrack.RETAIL,
    stage: OpportunityStage.PREPARATION,
    ownerEmail: "sara.haddad@northstar.example",
    budget: "185000",
    probability: "50",
    site: "Saadiyat Island, Abu Dhabi",
    summary: "Design package in progress with materials, layout and specification review.",
    createdDaysAgo: 14,
  },
  {
    reference: "OPP-DEMO-004",
    customerReference: "CUST-DEMO-004",
    title: "Yas Island Family Residence",
    track: OpportunityTrack.RETAIL,
    stage: OpportunityStage.QUOTATION,
    ownerEmail: "omar.nasser@northstar.example",
    budget: "142000",
    probability: "65",
    site: "Yas Island, Abu Dhabi",
    summary: "Approved design and pricing prepared for customer quotation.",
    createdDaysAgo: 12,
  },
  {
    reference: "OPP-DEMO-005",
    customerReference: "CUST-DEMO-005",
    title: "Corniche Penthouse Fit-Out",
    track: OpportunityTrack.RETAIL,
    stage: OpportunityStage.NEGOTIATION,
    ownerEmail: "sara.haddad@northstar.example",
    budget: "210000",
    probability: "75",
    site: "Corniche, Abu Dhabi",
    summary: "Commercial negotiation following quotation and scope refinement.",
    createdDaysAgo: 11,
  },
  {
    reference: "OPP-DEMO-006",
    customerReference: "CUST-DEMO-011",
    title: "Al Raha Waterfront Residence",
    track: OpportunityTrack.RETAIL,
    stage: OpportunityStage.DEPOSIT_PENDING,
    ownerEmail: "omar.nasser@northstar.example",
    budget: "168000",
    probability: "90",
    site: "Al Raha Beach, Abu Dhabi",
    summary: "Quotation accepted; deposit evidence submitted for Finance review.",
    createdDaysAgo: 9,
  },
  {
    reference: "OPP-DEMO-007",
    customerReference: "CUST-DEMO-001",
    title: "Mamsha Townhouse Upgrade",
    track: OpportunityTrack.RETAIL,
    stage: OpportunityStage.WON,
    ownerEmail: "sara.haddad@northstar.example",
    budget: "175000",
    probability: "100",
    site: "Mamsha Al Saadiyat, Abu Dhabi",
    summary: "Won residential package in active order handover.",
    wonValue: "165000",
    wonAt: thisMonth(3),
    createdDaysAgo: 28,
  },
  {
    reference: "OPP-DEMO-008",
    customerReference: "CUST-DEMO-006",
    title: "Atlas Villas - Qualification Package",
    track: OpportunityTrack.PROJECT,
    stage: OpportunityStage.QUALIFIED,
    ownerEmail: "samir.khan@northstar.example",
    budget: "1250000",
    probability: "35",
    site: "Khalifa City, Abu Dhabi",
    summary: "Contractor package qualified for technical and commercial preparation.",
    createdDaysAgo: 20,
  },
  {
    reference: "OPP-DEMO-009",
    customerReference: "CUST-DEMO-007",
    title: "Harbor View Residences - Phase A",
    track: OpportunityTrack.PROJECT,
    stage: OpportunityStage.PREPARATION,
    ownerEmail: "samir.khan@northstar.example",
    budget: "2400000",
    probability: "45",
    site: "Abu Dhabi",
    summary: "Project submission under design coordination and Finance costing review.",
    createdDaysAgo: 19,
  },
  {
    reference: "OPP-DEMO-010",
    customerReference: "CUST-DEMO-008",
    title: "North Gate Villas - Package 3",
    track: OpportunityTrack.PROJECT,
    stage: OpportunityStage.QUOTATION,
    ownerEmail: "samir.khan@northstar.example",
    budget: "2300000",
    probability: "60",
    site: "Abu Dhabi",
    summary: "Final project price awaiting manager approval before issue.",
    createdDaysAgo: 17,
  },
  {
    reference: "OPP-DEMO-011",
    customerReference: "CUST-DEMO-009",
    title: "Cedar Heights - Sample Villas",
    track: OpportunityTrack.PROJECT,
    stage: OpportunityStage.WON,
    ownerEmail: "samir.khan@northstar.example",
    budget: "1050000",
    probability: "100",
    site: "Abu Dhabi",
    summary: "Won project package with supplier order and delivery coordination in progress.",
    wonValue: "980000",
    wonAt: previousMonth(18),
    createdDaysAgo: 52,
  },
  {
    reference: "OPP-DEMO-012",
    customerReference: "CUST-DEMO-010",
    title: "Bay Office Pantry Upgrade",
    track: OpportunityTrack.RETAIL,
    stage: OpportunityStage.LOST,
    ownerEmail: "sara.haddad@northstar.example",
    budget: "88000",
    probability: "0",
    site: "Business Bay, Dubai",
    summary: "Commercial opportunity closed after customer deferred the project.",
    lostReason: "Budget deferred after scope review.",
    createdDaysAgo: 33,
  },
  {
    reference: "OPP-DEMO-013",
    customerReference: "CUST-DEMO-012",
    title: "Garden District Clubhouse",
    track: OpportunityTrack.PROJECT,
    stage: OpportunityStage.ON_HOLD,
    ownerEmail: "samir.khan@northstar.example",
    budget: "420000",
    probability: "40",
    site: "Abu Dhabi",
    summary: "Consultant comments require a revised commercial and technical package.",
    createdDaysAgo: 24,
  },
  {
    reference: "OPP-DEMO-014",
    customerReference: "CUST-DEMO-007",
    title: "Harbor View Residences - Lobby Package",
    track: OpportunityTrack.PROJECT,
    stage: OpportunityStage.WON,
    ownerEmail: "samir.khan@northstar.example",
    budget: "1550000",
    probability: "100",
    site: "Abu Dhabi",
    summary: "Current-month win transferred to order coordination with PO preparation underway.",
    wonValue: "1450000",
    wonAt: thisMonth(4),
    createdDaysAgo: 31,
  },
] as const;

type DemoOpportunity = (typeof opportunityDefinitions)[number];

function quoteSnapshot(
  opportunity: DemoOpportunity,
  customerName: string,
  salesName: string,
  salesEmail: string,
  amount: string,
) {
  const amountNumber = Number(amount);
  const deposit = (amountNumber * 0.3).toFixed(2);
  const second = (amountNumber * 0.4).toFixed(2);
  const balance = (amountNumber * 0.3).toFixed(2);

  return {
    template: "PORTFOLIO_DEMO_V1",
    opportunityReference: opportunity.reference,
    customer: {
      name: customerName,
      primaryContact: customerName,
      email: "contact@example.test",
      address: opportunity.site,
    },
    sales: {
      name: salesName,
      email: salesEmail,
    },
    scope: opportunity.summary,
    specs: {
      package: "Design & Supply",
      frontFinish: "Premium matte finish",
      frontColour: "Warm neutral",
      carcaseColourInterior: "Graphite",
      visibleSidesColour: "Natural oak",
      handleVariation: "Integrated profile",
      plinthHeight: "120.00",
      height: "900.00",
    },
    items: [
      {
        pos: "1",
        quantity: "1.00",
        unit: "lot",
        code: "DP-100",
        description: "Primary design and furniture package",
        amount: (amountNumber * 0.58).toFixed(2),
        section: "Furniture",
      },
      {
        pos: "2",
        quantity: "1.00",
        unit: "lot",
        code: "TG-210",
        description: "Trade goods and accessory package",
        amount: (amountNumber * 0.12).toFixed(2),
        section: "Trade Goods",
      },
      {
        pos: "3",
        quantity: "1.00",
        unit: "lot",
        code: "AP-310",
        description: "Appliance allowance",
        amount: (amountNumber * 0.15).toFixed(2),
        section: "Appliances",
      },
      {
        pos: "4",
        quantity: "1.00",
        unit: "lot",
        code: "SV-410",
        description: "Installation and project services",
        amount: (amountNumber * 0.15).toFixed(2),
        section: "Services",
      },
    ],
    summary: {
      furniture: (amountNumber * 0.58).toFixed(2),
      tradeGoods: (amountNumber * 0.42).toFixed(2),
      totalExclGst: amount,
      gstPct: "0.0",
      gstAmount: "0.00",
      totalInclGst: amount,
      currency: "AED",
    },
    paymentCalendar: [
      {
        paymentType: "Deposit",
        dueOn: "Upon acceptance",
        amount: deposit,
        currency: "AED",
      },
      {
        paymentType: "Production milestone",
        dueOn: "Before supplier release",
        amount: second,
        currency: "AED",
      },
      {
        paymentType: "Final balance",
        dueOn: "Before final delivery",
        amount: balance,
        currency: "AED",
      },
    ],
    bankDetails: {
      registrationNumber: "DEMO-ONLY",
      bank: "Fictional Demo Bank",
      branchCode: "000-000",
      bankAccount: "DEMO-ACCOUNT",
    },
  };
}

async function clearOpportunityDemoChildren(opportunityId: string) {
  await db.notification.deleteMany({ where: { entityId: opportunityId } });
  await db.auditLog.deleteMany({ where: { opportunityId } });
  await db.chatterMention.deleteMany({ where: { opportunityId } });
  await db.chatterMessage.deleteMany({ where: { opportunityId } });
  await db.opportunityChecklistItem.deleteMany({ where: { opportunityId } });
  await db.approval.deleteMany({ where: { opportunityId } });
  await db.deposit.deleteMany({ where: { opportunityId } });
  await db.orderHandover.deleteMany({ where: { opportunityId } });
  await db.quotation.deleteMany({ where: { opportunityId } });
  await db.pricingCase.deleteMany({ where: { opportunityId } });
  await db.designPackage.deleteMany({ where: { opportunityId } });
  await db.designJob.deleteMany({ where: { opportunityId } });
  await db.measurement.deleteMany({ where: { opportunityId } });
  await db.task.deleteMany({ where: { opportunityId } });
  await db.activity.deleteMany({ where: { opportunityId } });
  await db.opportunityMember.deleteMany({ where: { opportunityId } });
}

async function main() {
  console.log("Portfolio demo seed: starting");

  const manager = await requireUser("alex.morgan@northstar.example");
  const finance = await requireUser("finance@northstar.example");
  const orderCoordinator = await requireUser("jordan.lee@northstar.example");
  const projectManager = await requireUser("daniel.reed@northstar.example");
  const projectSales = await requireUser("samir.khan@northstar.example");
  const retailSalesA = await requireUser("sara.haddad@northstar.example");
  const retailSalesB = await requireUser("omar.nasser@northstar.example");
  const designer = await requireUser("maya.chen@northstar.example");
  const ceo = await requireUser("ceo@northstar.example");
  const admin = await requireUser("admin@northstar.example");

  const usersByEmail = new Map(
    [
      manager,
      finance,
      orderCoordinator,
      projectManager,
      projectSales,
      retailSalesA,
      retailSalesB,
      designer,
      ceo,
      admin,
    ].map((user) => [user.email, user]),
  );

  const demoPassword = process.env.PORTFOLIO_DEMO_PASSWORD;
  if (demoPassword) {
    const passwordHash = await argon2.hash(demoPassword, { type: argon2.argon2id });
    await db.user.updateMany({
      where: { email: { endsWith: "@northstar.example" } },
      data: {
        passwordHash,
        forcePasswordChange: false,
        status: UserStatus.ACTIVE,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
    console.log("Portfolio demo password applied to synthetic Northstar users.");
  } else {
    console.log("PORTFOLIO_DEMO_PASSWORD not set; existing seeded passwords were preserved.");
  }

  const customerByReference = new Map<string, { id: string; name: string }>();

  for (const definition of customers) {
    const customer = await db.customer.upsert({
      where: { reference: definition.reference },
      create: {
        reference: definition.reference,
        name: definition.name,
        type: definition.type,
        mobile: definition.mobile,
        email: definition.email,
        dataQualityStatus: DataQualityStatus.VERIFIED,
        createdById: manager.id,
      },
      update: {
        name: definition.name,
        type: definition.type,
        mobile: definition.mobile,
        email: definition.email,
        dataQualityStatus: DataQualityStatus.VERIFIED,
        archivedAt: null,
      },
    });
    customerByReference.set(definition.reference, customer);

    await db.contact.deleteMany({ where: { customerId: customer.id } });
    await db.contact.create({
      data: {
        customerId: customer.id,
        name:
          definition.type === CustomerType.INDIVIDUAL
            ? definition.name
            : "Demo Project Contact",
        roleTitle:
          definition.type === CustomerType.INDIVIDUAL
            ? "Primary Contact"
            : "Project Representative",
        mobile: definition.mobile,
        email: definition.email,
        isPrimary: true,
        createdById: manager.id,
      },
    });
  }

  const leadDefinitions = [
    {
      reference: "LEAD-DEMO-001",
      status: LeadStatus.NEW,
      track: OpportunityTrack.RETAIL,
      name: "Mariam Saleh",
      ownerId: retailSalesA.id,
      source: "Website",
      channel: "Organic",
      interestCategory: "Residential design package",
      nextFollowUpAt: daysFromNow(1),
    },
    {
      reference: "LEAD-DEMO-002",
      status: LeadStatus.CONTACTED,
      track: OpportunityTrack.RETAIL,
      name: "Tariq Nader",
      ownerId: retailSalesB.id,
      source: "Referral",
      channel: "Phone",
      interestCategory: "Apartment renovation",
      nextFollowUpAt: daysFromNow(2),
    },
    {
      reference: "LEAD-DEMO-003",
      status: LeadStatus.QUALIFIED,
      track: OpportunityTrack.RETAIL,
      name: "Nadia Kareem",
      ownerId: retailSalesA.id,
      source: "Showroom",
      channel: "Walk-in",
      interestCategory: "Premium residential package",
      nextFollowUpAt: daysFromNow(1),
    },
    {
      reference: "LEAD-DEMO-004",
      status: LeadStatus.QUALIFIED,
      track: OpportunityTrack.PROJECT,
      name: "Vertex Contracting",
      ownerId: projectSales.id,
      source: "Tender portal",
      channel: "Tender",
      interestCategory: "Multi-unit project",
      nextFollowUpAt: daysFromNow(3),
    },
    {
      reference: "LEAD-DEMO-005",
      status: LeadStatus.CONTACTED,
      track: OpportunityTrack.PROJECT,
      name: "Orion Hospitality",
      ownerId: projectSales.id,
      source: "Business development",
      channel: "Email",
      interestCategory: "Hospitality fit-out",
      nextFollowUpAt: daysFromNow(4),
    },
    {
      reference: "LEAD-DEMO-006",
      status: LeadStatus.DISQUALIFIED,
      track: OpportunityTrack.RETAIL,
      name: "Demo Budget Inquiry",
      ownerId: retailSalesB.id,
      source: "Social",
      channel: "Direct message",
      interestCategory: "Budget inquiry",
      nextFollowUpAt: null,
    },
  ] as const;

  for (const lead of leadDefinitions) {
    await db.lead.upsert({
      where: { reference: lead.reference },
      create: {
        ...lead,
        email: `${lead.reference.toLowerCase()}@example.test`,
        notes: "Synthetic portfolio lead.",
        dataQualityStatus: DataQualityStatus.VERIFIED,
        createdById: manager.id,
        createdAt: daysFromNow(-8),
      },
      update: {
        status: lead.status,
        track: lead.track,
        name: lead.name,
        ownerId: lead.ownerId,
        source: lead.source,
        channel: lead.channel,
        interestCategory: lead.interestCategory,
        nextFollowUpAt: lead.nextFollowUpAt,
        notes: "Synthetic portfolio lead.",
        dataQualityStatus: DataQualityStatus.VERIFIED,
        archivedAt: null,
      },
    });
  }

  const opportunityByReference = new Map<
    string,
    { id: string; customerId: string; ownerId: string }
  >();

  for (const definition of opportunityDefinitions) {
    const customer = customerByReference.get(definition.customerReference);
    const owner = usersByEmail.get(definition.ownerEmail);
    if (!customer || !owner) {
      throw new Error(`Missing demo relation for ${definition.reference}`);
    }

    const opportunity = await db.opportunity.upsert({
      where: { reference: definition.reference },
      create: {
        reference: definition.reference,
        title: definition.title,
        track: definition.track,
        stage: definition.stage,
        customerId: customer.id,
        ownerId: owner.id,
        createdById: manager.id,
        designReference:
          definition.stage === OpportunityStage.PREPARATION ||
          definition.stage === OpportunityStage.QUOTATION ||
          definition.stage === OpportunityStage.NEGOTIATION ||
          definition.stage === OpportunityStage.DEPOSIT_PENDING ||
          definition.stage === OpportunityStage.WON
            ? `DSN-${definition.reference.slice(-3)}`
            : null,
        tenderSystemReference:
          definition.track === OpportunityTrack.PROJECT
            ? `TND-${definition.reference.slice(-3)}`
            : null,
        siteAddress: definition.site,
        requirementsSummary: definition.summary,
        customerBudgetAed: definition.budget,
        wonValue: "wonValue" in definition ? definition.wonValue : null,
        probabilityPct: definition.probability,
        nextFollowUpAt:
          definition.stage === OpportunityStage.WON ||
          definition.stage === OpportunityStage.LOST
            ? null
            : daysFromNow(2),
        wonAt: "wonAt" in definition ? definition.wonAt : null,
        lostReason: "lostReason" in definition ? definition.lostReason : null,
        dataQualityStatus: DataQualityStatus.VERIFIED,
        createdAt: daysFromNow(-definition.createdDaysAgo),
      },
      update: {
        title: definition.title,
        track: definition.track,
        stage: definition.stage,
        customerId: customer.id,
        ownerId: owner.id,
        designReference:
          definition.stage === OpportunityStage.PREPARATION ||
          definition.stage === OpportunityStage.QUOTATION ||
          definition.stage === OpportunityStage.NEGOTIATION ||
          definition.stage === OpportunityStage.DEPOSIT_PENDING ||
          definition.stage === OpportunityStage.WON
            ? `DSN-${definition.reference.slice(-3)}`
            : null,
        tenderSystemReference:
          definition.track === OpportunityTrack.PROJECT
            ? `TND-${definition.reference.slice(-3)}`
            : null,
        siteAddress: definition.site,
        requirementsSummary: definition.summary,
        customerBudgetAed: definition.budget,
        wonValue: "wonValue" in definition ? definition.wonValue : null,
        probabilityPct: definition.probability,
        nextFollowUpAt:
          definition.stage === OpportunityStage.WON ||
          definition.stage === OpportunityStage.LOST
            ? null
            : daysFromNow(2),
        wonAt: "wonAt" in definition ? definition.wonAt : null,
        lostReason: "lostReason" in definition ? definition.lostReason : null,
        dataQualityStatus: DataQualityStatus.VERIFIED,
        archivedAt: null,
      },
    });

    await clearOpportunityDemoChildren(opportunity.id);
    opportunityByReference.set(definition.reference, opportunity);
  }

  for (const definition of opportunityDefinitions) {
    const opportunity = opportunityByReference.get(definition.reference)!;
    const owner = usersByEmail.get(definition.ownerEmail)!;

    await db.opportunityMember.createMany({
      data: [
        {
          opportunityId: opportunity.id,
          userId: owner.id,
          role:
            definition.track === OpportunityTrack.PROJECT
              ? OpportunityMemberRole.PROJECT_OWNER
              : OpportunityMemberRole.QUOTATION_OWNER,
        },
        {
          opportunityId: opportunity.id,
          userId: designer.id,
          role: OpportunityMemberRole.DESIGN_OWNER,
        },
      ],
      skipDuplicates: true,
    });

    await db.activity.createMany({
      data: [
        {
          type: ActivityType.STATUS_CHANGE,
          subject: `Stage set to ${definition.stage.replaceAll("_", " ")}`,
          body: "Synthetic portfolio workflow activity.",
          opportunityId: opportunity.id,
          customerId: opportunity.customerId,
          createdById: owner.id,
          occurredAt: daysFromNow(-4),
        },
        {
          type: ActivityType.FOLLOW_UP,
          subject: "Commercial follow-up recorded",
          body: "Demo activity showing an operational timeline.",
          opportunityId: opportunity.id,
          customerId: opportunity.customerId,
          createdById: owner.id,
          occurredAt: daysFromNow(-2),
        },
      ],
    });

    await db.chatterMessage.create({
      data: {
        opportunityId: opportunity.id,
        authorId: owner.id,
        body:
          definition.track === OpportunityTrack.PROJECT
            ? "Technical and commercial package reviewed. Finance and design coordination are visible in this demo thread."
            : "Customer follow-up completed. Design, pricing and quotation actions are tracked in this workspace.",
        createdAt: daysFromNow(-1),
      },
    });
  }

  const completedRetailRefs = [
    "OPP-DEMO-003",
    "OPP-DEMO-004",
    "OPP-DEMO-005",
    "OPP-DEMO-006",
    "OPP-DEMO-007",
  ];

  for (const reference of completedRetailRefs) {
    const opportunity = opportunityByReference.get(reference)!;
    const complete =
      reference !== "OPP-DEMO-003";

    await db.measurement.create({
      data: {
        opportunityId: opportunity.id,
        status: complete ? MeasurementStatus.COMPLETED : MeasurementStatus.SCHEDULED,
        assignedToId: designer.id,
        createdById: opportunity.ownerId,
        scheduledAt: daysFromNow(complete ? -8 : 2),
        completedAt: complete ? daysFromNow(-7) : null,
        notes: complete
          ? "Synthetic site measurement completed."
          : "Synthetic measurement appointment scheduled.",
      },
    });

    const designJob = await db.designJob.create({
      data: {
        opportunityId: opportunity.id,
        assignedToId: designer.id,
        createdById: opportunity.ownerId,
        status: complete ? DesignJobStatus.APPROVED : DesignJobStatus.IN_PROGRESS,
        dueAt: daysFromNow(complete ? -3 : 3),
        approvedAt: complete ? daysFromNow(-4) : null,
      },
    });

    await db.designVersion.create({
      data: {
        designJobId: designJob.id,
        versionNo: 1,
        label: "Portfolio demo revision 1",
        notes: "Synthetic design revision for portfolio demonstration.",
        createdById: designer.id,
        createdAt: daysFromNow(-5),
      },
    });

    await db.designPackage.create({
      data: {
        opportunityId: opportunity.id,
        status: complete ? DesignPackageStatus.VERIFIED : DesignPackageStatus.INCOMPLETE,
        designReference: `PKG-${reference.slice(-3)}`,
        revisionLabel: "R1",
        designFurnitureEur: complete ? "18500" : "14200",
        designAuxiliaryEur: complete ? "4200" : "3200",
        supplierPointFactor: "6.75",
        submittedAt: daysFromNow(-5),
        submittedById: designer.id,
        readyAt: complete ? daysFromNow(-4) : null,
        verifiedAt: complete ? daysFromNow(-3) : null,
        verifiedById: complete ? manager.id : null,
        notes: "Synthetic design package.",
      },
    });
  }

  for (const reference of ["OPP-DEMO-009", "OPP-DEMO-010", "OPP-DEMO-011", "OPP-DEMO-014"]) {
    const opportunity = opportunityByReference.get(reference)!;
    const approved = reference !== "OPP-DEMO-009";

    const designJob = await db.designJob.create({
      data: {
        opportunityId: opportunity.id,
        assignedToId: designer.id,
        createdById: projectSales.id,
        status: approved ? DesignJobStatus.APPROVED : DesignJobStatus.IN_PROGRESS,
        dueAt: daysFromNow(approved ? -6 : 4),
        approvedAt: approved ? daysFromNow(-7) : null,
      },
    });

    await db.designVersion.create({
      data: {
        designJobId: designJob.id,
        versionNo: 1,
        label: "Project submission R1",
        notes: "Synthetic project design submission.",
        createdById: designer.id,
      },
    });

    await db.designPackage.create({
      data: {
        opportunityId: opportunity.id,
        status: approved ? DesignPackageStatus.VERIFIED : DesignPackageStatus.READY,
        designReference: `PRJ-PKG-${reference.slice(-3)}`,
        revisionLabel: "R1",
        designFurnitureEur: approved ? "95000" : "72000",
        designAuxiliaryEur: approved ? "18000" : "14000",
        supplierPointFactor: "6.75",
        submittedAt: daysFromNow(-8),
        submittedById: designer.id,
        readyAt: daysFromNow(-7),
        verifiedAt: approved ? daysFromNow(-6) : null,
        verifiedById: approved ? projectManager.id : null,
        notes: "Synthetic project design package.",
      },
    });
  }

  // PORTFOLIO_DEMO_EVIDENCE_START
  const demoEvidenceDefinitions = [
    {
      category: "DESIGN_SOURCE_FILE",
      title: "Design Source Package",
      fileName: "design-source.txt",
      mimeType: "text/plain",
      content: "Synthetic design source package for portfolio demonstration.",
    },
    {
      category: "DESIGN",
      title: "Approved Design",
      fileName: "approved-design.txt",
      mimeType: "text/plain",
      content: "Synthetic approved design summary for portfolio demonstration.",
    },
    {
      category: "ELEMENT_LIST",
      title: "Element List",
      fileName: "element-list.csv",
      mimeType: "text/csv",
      content: "position,description,quantity\n1,Synthetic design item,1",
    },
    {
      category: "DESIGN_SUPPLIER_QUOTATION",
      title: "Supplier Design Quotation",
      fileName: "supplier-design-quotation.txt",
      mimeType: "text/plain",
      content: "Synthetic supplier design quotation for portfolio demonstration.",
    },
  ] as const;

  const verifiedDemoPackages = await db.designPackage.findMany({
    where: {
      status: DesignPackageStatus.VERIFIED,
      opportunity: {
        reference: { startsWith: "OPP-DEMO-" },
      },
    },
    select: {
      opportunity: {
        select: { id: true, reference: true },
      },
    },
  });

  const {
    mkdir: mkdirDemoEvidence,
    writeFile: writeDemoEvidence,
  } = await import("node:fs/promises");

  const {
    dirname: demoDirname,
    join: demoJoin,
    resolve: demoResolve,
  } = await import("node:path");

  const demoStorageRoot = process.env.LOCAL_STORAGE_ROOT
    ? demoResolve(process.env.LOCAL_STORAGE_ROOT)
    : demoJoin(process.cwd(), "storage");

  for (const item of verifiedDemoPackages) {
    for (const evidence of demoEvidenceDefinitions) {
      const storageKey =
        `portfolio-demo/${item.opportunity.reference}/${evidence.fileName}`;

      const bytes = Buffer.from(evidence.content, "utf8");
      const fullPath = demoJoin(
        demoStorageRoot,
        ...storageKey.split("/"),
      );

      await mkdirDemoEvidence(demoDirname(fullPath), { recursive: true });
      await writeDemoEvidence(fullPath, bytes);

      const document = await db.document.create({
        data: {
          title: evidence.title,
          category: evidence.category,
          opportunityId: item.opportunity.id,
          isRequired: true,
          currentVersion: 1,
        },
      });

      await db.documentVersion.create({
        data: {
          documentId: document.id,
          versionNo: 1,
          originalName: `${item.opportunity.reference}-${evidence.fileName}`,
          storageKey,
          mimeType: evidence.mimeType,
          sizeBytes: BigInt(bytes.byteLength),
          notes: "Synthetic portfolio evidence file.",
          uploadedById: designer.id,
          immutable: true,
        },
      });
    }
  }
  // PORTFOLIO_DEMO_EVIDENCE_END

  const pricingDefinitions = [
    ["OPP-DEMO-003", PricingCaseType.RETAIL, PricingStatus.DRAFT, "128000", "96000", null],
    ["OPP-DEMO-004", PricingCaseType.RETAIL, PricingStatus.APPROVED, "142000", "103000", "27.4648"],
    ["OPP-DEMO-005", PricingCaseType.RETAIL, PricingStatus.APPROVED, "198000", "145000", "26.7677"],
    ["OPP-DEMO-006", PricingCaseType.RETAIL, PricingStatus.APPROVED, "168000", "122000", "27.3810"],
    ["OPP-DEMO-007", PricingCaseType.RETAIL, PricingStatus.APPROVED, "165000", "119000", "27.8788"],
    ["OPP-DEMO-009", PricingCaseType.PROJECT, PricingStatus.FINANCE_REVIEW, "2200000", "1780000", null],
    ["OPP-DEMO-010", PricingCaseType.PROJECT, PricingStatus.MANAGER_APPROVAL, "2250000", "1810000", null],
    ["OPP-DEMO-011", PricingCaseType.PROJECT, PricingStatus.APPROVED, "980000", "770000", "21.4286"],
    ["OPP-DEMO-013", PricingCaseType.PROJECT, PricingStatus.CHANGES_REQUESTED, "405000", "335000", null],
    ["OPP-DEMO-014", PricingCaseType.PROJECT, PricingStatus.APPROVED, "1450000", "1110000", "23.4483"],
  ] as const;

  const pricingByOpportunity = new Map<string, { id: string }>();

  for (const [reference, type, status, sellingPrice, estimatedCost, margin] of pricingDefinitions) {
    const opportunity = opportunityByReference.get(reference)!;
    const approved =
      status === PricingStatus.APPROVED ||
      status === PricingStatus.MANAGER_APPROVAL;

    const pricing = await db.pricingCase.create({
      data: {
        opportunityId: opportunity.id,
        type,
        status,
        revision: 1,
        sourceCurrency: type === PricingCaseType.RETAIL ? "EUR" : "AED",
        sellingCurrency: "AED",
        sellingRate: type === PricingCaseType.RETAIL ? "6.75" : "1",
        exchangeRate: type === PricingCaseType.RETAIL ? "4.25" : "1",
        companyMarkupPct: type === PricingCaseType.RETAIL ? "10" : "8",
        priceBeforeDiscount: sellingPrice,
        customerDiscountAed: type === PricingCaseType.RETAIL ? "3500" : "25000",
        formulaVersion: "DEMO_PRICING_V1",
        estimatedCost,
        approvedSellingPrice: approved ? sellingPrice : null,
        grossProfit: approved ? String(Number(sellingPrice) - Number(estimatedCost)) : null,
        grossMarginPct: margin,
        financeNotes: "Synthetic Finance review for portfolio demonstration.",
        preparedById: finance.id,
        financeConfirmedAt: approved ? daysFromNow(-5) : null,
        managerApprovedAt:
          status === PricingStatus.APPROVED ? daysFromNow(-4) : null,
        sourceEvidenceNotes: "Demo pricing evidence only.",
        createdById: finance.id,
      },
    });

    pricingByOpportunity.set(reference, pricing);

    await db.pricingLine.createMany({
      data: [
        {
          pricingCaseId: pricing.id,
          category: PricingLineCategory.DESIGN_FURNITURE,
          description: "Primary design and furniture package",
          quantity: "1",
          supplierUnitPrice: String(Number(estimatedCost) * 0.55),
          supplierCurrency: "AED",
          appliedRate: "1",
          markupPct: "10",
          costAed: String(Number(estimatedCost) * 0.55),
          sellingPriceAed: String(Number(sellingPrice) * 0.58),
          sortOrder: 10,
        },
        {
          pricingCaseId: pricing.id,
          category: PricingLineCategory.TRADE_GOODS,
          description: "Trade goods and accessory package",
          quantity: "1",
          costAed: String(Number(estimatedCost) * 0.18),
          sellingPriceAed: String(Number(sellingPrice) * 0.17),
          sortOrder: 20,
        },
        {
          pricingCaseId: pricing.id,
          category: PricingLineCategory.APPLIANCE,
          description: "Appliance allowance",
          quantity: "1",
          markupPct: "10",
          costAed: String(Number(estimatedCost) * 0.12),
          sellingPriceAed: String(Number(sellingPrice) * 0.15),
          sortOrder: 30,
        },
        {
          pricingCaseId: pricing.id,
          category: PricingLineCategory.INSTALLATION,
          description: "Installation and project services",
          quantity: "1",
          costAed: String(Number(estimatedCost) * 0.15),
          sellingPriceAed: String(Number(sellingPrice) * 0.10),
          sortOrder: 40,
        },
      ],
    });

    if (status === PricingStatus.APPROVED) {
      await db.pricingReview.create({
        data: {
          pricingCaseId: pricing.id,
          reviewerId: finance.id,
          decision: PricingReviewDecision.CONFIRMED,
          comments: "Finance review confirmed for synthetic portfolio data.",
          createdAt: daysFromNow(-5),
        },
      });
    }
  }

  const quotationDefinitions = [
    ["OPP-DEMO-004", "142000", QuotationStatus.SENT],
    ["OPP-DEMO-005", "198000", QuotationStatus.SENT],
    ["OPP-DEMO-006", "168000", QuotationStatus.ACCEPTED],
    ["OPP-DEMO-007", "165000", QuotationStatus.ACCEPTED],
    ["OPP-DEMO-010", "2250000", QuotationStatus.UNDER_REVIEW],
    ["OPP-DEMO-011", "980000", QuotationStatus.ACCEPTED],
    ["OPP-DEMO-014", "1450000", QuotationStatus.ACCEPTED],
  ] as const;

  const quotationByOpportunity = new Map<string, { id: string }>();

  for (const [reference, amount, status] of quotationDefinitions) {
    const opportunityDefinition = opportunityDefinitions.find((item) => item.reference === reference)!;
    const opportunity = opportunityByReference.get(reference)!;
    const owner = usersByEmail.get(opportunityDefinition.ownerEmail)!;
    const customer = customerByReference.get(opportunityDefinition.customerReference)!;
    const pricing = pricingByOpportunity.get(reference);

    const quotation = await db.quotation.create({
      data: {
        opportunityId: opportunity.id,
        internalReference: `QT-INT-${reference.slice(-3)}`,
        businessReference: `NSG/QT/${opportunityDefinition.track === OpportunityTrack.RETAIL ? "RT" : "PR"}/${reference.slice(-3)}`,
        status,
        currentVersion: 1,
        salesInitials: owner.initials ?? "NS",
        trackSnapshot: opportunityDefinition.track,
        createdById: owner.id,
      },
    });

    quotationByOpportunity.set(reference, quotation);

    await db.quotationVersion.create({
      data: {
        quotationId: quotation.id,
        versionNo: 1,
        status,
        pricingCaseId: pricing?.id ?? null,
        preVatAmount: amount,
        currency: "AED",
        notes: "Synthetic quotation generated for portfolio demonstration.",
        validUntil: daysFromNow(30),
        paymentTerms: "30% deposit, 40% production milestone, 30% before final delivery.",
        contentSnapshot: quoteSnapshot(
          opportunityDefinition,
          customer.name,
          owner.displayName,
          owner.email,
          amount,
        ),
        createdById: owner.id,
        sentById:
          status === QuotationStatus.SENT || status === QuotationStatus.ACCEPTED
            ? owner.id
            : null,
        sentAt:
          status === QuotationStatus.SENT || status === QuotationStatus.ACCEPTED
            ? daysFromNow(-4)
            : null,
        immutable: status === QuotationStatus.ACCEPTED,
        createdAt: daysFromNow(-5),
      },
    });
  }

  const approvalDefinitions = [
    {
      reference: "OPP-DEMO-007",
      type: ApprovalType.RETAIL_EXCEPTION,
      status: ApprovalStatus.APPROVED,
      requestedById: retailSalesA.id,
      decidedById: manager.id,
      reason: "Demo approval for customer discount.",
    },
    {
      reference: "OPP-DEMO-010",
      type: ApprovalType.PROJECT_FINAL_PRICE,
      status: ApprovalStatus.PENDING,
      requestedById: projectSales.id,
      decidedById: null,
      reason: "Final project price requires management approval before quotation issue.",
    },
    {
      reference: "OPP-DEMO-011",
      type: ApprovalType.PROJECT_FINAL_PRICE,
      status: ApprovalStatus.APPROVED,
      requestedById: projectSales.id,
      decidedById: manager.id,
      reason: "Demo final project price approval.",
    },
    {
      reference: "OPP-DEMO-013",
      type: ApprovalType.SPECIAL_TERMS,
      status: ApprovalStatus.PENDING,
      requestedById: projectSales.id,
      decidedById: null,
      reason: "Consultant requested revised commercial terms.",
    },
    {
      reference: "OPP-DEMO-014",
      type: ApprovalType.PROJECT_FINAL_PRICE,
      status: ApprovalStatus.APPROVED,
      requestedById: projectSales.id,
      decidedById: manager.id,
      reason: "Current-month project award approval.",
    },
  ] as const;

  for (const approvalDefinition of approvalDefinitions) {
    const opportunity = opportunityByReference.get(approvalDefinition.reference)!;
    const pricing = pricingByOpportunity.get(approvalDefinition.reference);
    const quotation = quotationByOpportunity.get(approvalDefinition.reference);

    await db.approval.create({
      data: {
        type: approvalDefinition.type,
        status: approvalDefinition.status,
        opportunityId: opportunity.id,
        pricingCaseId: pricing?.id ?? null,
        quotationId: quotation?.id ?? null,
        requestedById: approvalDefinition.requestedById,
        decidedById: approvalDefinition.decidedById,
        requestReason: approvalDefinition.reason,
        decisionNotes:
          approvalDefinition.status === ApprovalStatus.APPROVED
            ? "Approved in synthetic portfolio workflow."
            : null,
        requestedAt: daysFromNow(-6),
        decidedAt:
          approvalDefinition.status === ApprovalStatus.APPROVED
            ? daysFromNow(-5)
            : null,
      },
    });
  }

  // PORTFOLIO_DEMO_INVOICES_START
  const invoiceDefinitions = [
    ["OPP-DEMO-006", "NSG-INV-DEMO-006", "168000", daysFromNow(-2)],
    ["OPP-DEMO-007", "NSG-INV-DEMO-007", "165000", daysFromNow(-10)],
    ["OPP-DEMO-011", "NSG-INV-DEMO-011", "980000", previousMonth(19)],
    ["OPP-DEMO-014", "NSG-INV-DEMO-014", "1450000", thisMonth(3)],
  ] as const;

  for (const [reference, invoiceReference, invoiceTotal, invoiceDate] of invoiceDefinitions) {
    const opportunity = opportunityByReference.get(reference)!;

    await db.opportunity.update({
      where: { id: opportunity.id },
      data: {
        financeInvoiceReference: invoiceReference,
        financeInvoiceDate: invoiceDate,
        financeInvoiceTotal: invoiceTotal,
      },
    });
  }
  // PORTFOLIO_DEMO_INVOICES_END
  await db.deposit.create({
    data: {
      reference: "DEP-DEMO-006",
      opportunityId: opportunityByReference.get("OPP-DEMO-006")!.id,
      status: DepositStatus.SUBMITTED,
      expectedAmount: "50400",
      submittedAmount: "50400",
      currency: "AED",
      paymentReference: "DEMO-PAY-006",
      submittedById: retailSalesB.id,
      submittedAt: daysFromNow(-1),
      reviewNotes: "Awaiting Finance confirmation.",
    },
  });

  await db.deposit.create({
    data: {
      reference: "DEP-DEMO-007",
      opportunityId: opportunityByReference.get("OPP-DEMO-007")!.id,
      status: DepositStatus.CONFIRMED,
      expectedAmount: "49500",
      submittedAmount: "49500",
      currency: "AED",
      paymentReference: "DEMO-PAY-007",
      submittedById: retailSalesA.id,
      reviewedById: finance.id,
      submittedAt: daysFromNow(-9),
      reviewedAt: daysFromNow(-8),
      reviewNotes: "Synthetic deposit confirmed by Finance.",
    },
  });

  await db.deposit.create({
    data: {
      reference: "DEP-DEMO-011",
      opportunityId: opportunityByReference.get("OPP-DEMO-011")!.id,
      status: DepositStatus.CONFIRMED,
      expectedAmount: "294000",
      submittedAmount: "294000",
      currency: "AED",
      paymentReference: "DEMO-PAY-011",
      submittedById: projectSales.id,
      reviewedById: finance.id,
      submittedAt: previousMonth(20),
      reviewedAt: previousMonth(21),
      reviewNotes: "Synthetic project deposit confirmed.",
    },
  });

  await db.deposit.create({
    data: {
      reference: "DEP-DEMO-014",
      opportunityId: opportunityByReference.get("OPP-DEMO-014")!.id,
      status: DepositStatus.CONFIRMED,
      expectedAmount: "435000",
      submittedAmount: "435000",
      currency: "AED",
      paymentReference: "DEMO-PAY-014",
      submittedById: projectSales.id,
      reviewedById: finance.id,
      submittedAt: thisMonth(4),
      reviewedAt: thisMonth(4, 14),
      reviewNotes: "Synthetic current-month project deposit confirmed.",
    },
  });

  const handover007 = await db.orderHandover.create({
    data: {
      opportunityId: opportunityByReference.get("OPP-DEMO-007")!.id,
      status: HandoverStatus.ETA_ENTERED,
      assignedToId: orderCoordinator.id,
      sentToSupplierAt: daysFromNow(-7),
      supplierReference: "NS-SUP-7007",
      erpPoNumber: "NSG-PO-7007",
      poDate: daysFromNow(-6),
      poSentAt: daysFromNow(-5),
      currentEta: daysFromNow(42),
      notes: "Synthetic retail order handover.",
    },
  });

  await db.eTAHistory.create({
    data: {
      handoverId: handover007.id,
      oldDate: null,
      newDate: daysFromNow(42),
      reason: "Initial supplier ETA.",
      changedById: orderCoordinator.id,
    },
  });

  const handover011 = await db.orderHandover.create({
    data: {
      opportunityId: opportunityByReference.get("OPP-DEMO-011")!.id,
      status: HandoverStatus.ETA_ENTERED,
      assignedToId: orderCoordinator.id,
      sentToSupplierAt: previousMonth(22),
      supplierReference: "NS-SUP-7011",
      erpPoNumber: "NSG-PO-7011",
      poDate: previousMonth(23),
      poSentAt: previousMonth(24),
      currentEta: daysFromNow(28),
      notes: "Synthetic project order coordination record.",
    },
  });

  await db.eTAHistory.create({
    data: {
      handoverId: handover011.id,
      oldDate: daysFromNow(35),
      newDate: daysFromNow(28),
      reason: "Supplier confirmed improved delivery date.",
      changedById: orderCoordinator.id,
    },
  });

  await db.orderHandover.create({
    data: {
      opportunityId: opportunityByReference.get("OPP-DEMO-014")!.id,
      status: HandoverStatus.PO_PENDING,
      assignedToId: orderCoordinator.id,
      sentToSupplierAt: thisMonth(4, 15),
      supplierReference: "NS-SUP-7014",
      notes: "PO preparation pending; ETA will follow supplier acknowledgement.",
    },
  });

  const taskDefinitions = [
    {
      reference: "TASK-DEMO-001",
      opportunityReference: "OPP-DEMO-003",
      title: "Complete design revision",
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      assignedToId: designer.id,
      createdById: retailSalesA.id,
      dueAt: daysFromNow(2),
      blockedReason: null,
      sectionKey: "design",
    },
    {
      reference: "TASK-DEMO-002",
      opportunityReference: "OPP-DEMO-009",
      title: "Complete project costing review",
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.URGENT,
      assignedToId: finance.id,
      createdById: projectSales.id,
      dueAt: daysFromNow(-2),
      blockedReason: null,
      sectionKey: "pricing",
    },
    {
      reference: "TASK-DEMO-003",
      opportunityReference: "OPP-DEMO-010",
      title: "Approve final project selling price",
      status: TaskStatus.WAITING_INTERNAL,
      priority: TaskPriority.HIGH,
      assignedToId: manager.id,
      createdById: finance.id,
      dueAt: daysFromNow(1),
      blockedReason: null,
      sectionKey: "approval",
    },
    {
      reference: "TASK-DEMO-004",
      opportunityReference: "OPP-DEMO-006",
      title: "Review submitted deposit",
      status: TaskStatus.TO_DO,
      priority: TaskPriority.HIGH,
      assignedToId: finance.id,
      createdById: retailSalesB.id,
      dueAt: daysFromNow(-1),
      blockedReason: null,
      sectionKey: "deposit",
    },
    {
      reference: "TASK-DEMO-005",
      opportunityReference: "OPP-DEMO-014",
      title: "Prepare ERP purchase order",
      status: TaskStatus.BLOCKED,
      priority: TaskPriority.URGENT,
      assignedToId: orderCoordinator.id,
      createdById: manager.id,
      dueAt: daysFromNow(-1),
      blockedReason: "Waiting for final supplier acknowledgement.",
      sectionKey: "handover",
    },
    {
      reference: "TASK-DEMO-006",
      opportunityReference: "OPP-DEMO-007",
      title: "Confirm delivery coordination",
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.NORMAL,
      assignedToId: orderCoordinator.id,
      createdById: manager.id,
      dueAt: daysFromNow(4),
      blockedReason: null,
      sectionKey: "handover",
    },
    {
      reference: "TASK-DEMO-007",
      opportunityReference: "OPP-DEMO-005",
      title: "Customer commercial follow-up",
      status: TaskStatus.WAITING_CUSTOMER,
      priority: TaskPriority.NORMAL,
      assignedToId: retailSalesA.id,
      createdById: retailSalesA.id,
      dueAt: daysFromNow(2),
      blockedReason: null,
      sectionKey: "quotation",
    },
    {
      reference: "TASK-DEMO-008",
      opportunityReference: "OPP-DEMO-013",
      title: "Revise consultant commercial terms",
      status: TaskStatus.BLOCKED,
      priority: TaskPriority.HIGH,
      assignedToId: projectSales.id,
      createdById: projectManager.id,
      dueAt: daysFromNow(-3),
      blockedReason: "Waiting for consultant clarification.",
      sectionKey: "pricing",
    },
    {
      reference: "TASK-DEMO-009",
      opportunityReference: "OPP-DEMO-011",
      title: "Issue supplier coordination package",
      status: TaskStatus.COMPLETED,
      priority: TaskPriority.HIGH,
      assignedToId: orderCoordinator.id,
      createdById: projectSales.id,
      dueAt: previousMonth(24),
      blockedReason: null,
      sectionKey: "handover",
    },
  ] as const;

  for (const taskDefinition of taskDefinitions) {
    const opportunity = opportunityByReference.get(taskDefinition.opportunityReference)!;
    await db.task.upsert({
      where: { reference: taskDefinition.reference },
      create: {
        reference: taskDefinition.reference,
        title: taskDefinition.title,
        description: "Synthetic portfolio task demonstrating workflow coordination.",
        status: taskDefinition.status,
        priority: taskDefinition.priority,
        opportunityId: opportunity.id,
        assignedToId: taskDefinition.assignedToId,
        createdById: taskDefinition.createdById,
        dueAt: taskDefinition.dueAt,
        blockedReason: taskDefinition.blockedReason,
        sectionKey: taskDefinition.sectionKey,
        actionUrl: `/opportunities/${opportunity.id}`,
        completedAt:
          taskDefinition.status === TaskStatus.COMPLETED
            ? previousMonth(24, 14)
            : null,
      },
      update: {
        title: taskDefinition.title,
        description: "Synthetic portfolio task demonstrating workflow coordination.",
        status: taskDefinition.status,
        priority: taskDefinition.priority,
        opportunityId: opportunity.id,
        assignedToId: taskDefinition.assignedToId,
        createdById: taskDefinition.createdById,
        dueAt: taskDefinition.dueAt,
        blockedReason: taskDefinition.blockedReason,
        sectionKey: taskDefinition.sectionKey,
        actionUrl: `/opportunities/${opportunity.id}`,
        completedAt:
          taskDefinition.status === TaskStatus.COMPLETED
            ? previousMonth(24, 14)
            : null,
        archivedAt: null,
      },
    });
  }

  const checklistDefinitions = await db.checklistDefinition.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  for (const reference of ["OPP-DEMO-007", "OPP-DEMO-011", "OPP-DEMO-014"]) {
    const opportunity = opportunityByReference.get(reference)!;
    const definition = opportunityDefinitions.find((item) => item.reference === reference)!;
    const relevantDefinitions = checklistDefinitions.filter(
      (item) => item.track === null || item.track === definition.track,
    );

    for (const checklist of relevantDefinitions.slice(0, 12)) {
      await db.opportunityChecklistItem.create({
        data: {
          opportunityId: opportunity.id,
          definitionId: checklist.id,
          labelSnapshot: checklist.label,
          status: ChecklistStatus.COMPLETED,
          completedById: manager.id,
          completedAt: daysFromNow(-4),
          comment: "Completed in synthetic portfolio workflow.",
        },
      });
    }
  }

  // PORTFOLIO_DEMO_TASK_LINKAGE_START
  const depositReviewOpportunity = opportunityByReference.get("OPP-DEMO-006")!;

  await db.task.update({
    where: { reference: "TASK-DEMO-004" },
    data: {
      automationKey: `confirm-deposit:${depositReviewOpportunity.id}`,
      actionUrl: `/opportunities/${depositReviewOpportunity.id}?section=deposit`,
    },
  });
  // PORTFOLIO_DEMO_TASK_LINKAGE_END
  const notifications = [
    {
      recipientId: manager.id,
      type: NotificationType.APPROVAL_REQUIRED,
      title: "Project final price approval required",
      body: "North Gate Villas - Package 3 is awaiting your approval.",
      reference: "OPP-DEMO-010",
      actionLabel: "Review pricing",
    },
    {
      recipientId: finance.id,
      type: NotificationType.OVERDUE,
      title: "Finance task overdue",
      body: "Project costing review requires attention.",
      reference: "OPP-DEMO-009",
      actionLabel: "Open opportunity",
    },
    {
      recipientId: orderCoordinator.id,
      type: NotificationType.ASSIGNMENT,
      title: "New won package assigned",
      body: "Harbor View Residences - Lobby Package is ready for order coordination.",
      reference: "OPP-DEMO-014",
      actionLabel: "Open handover",
    },
    {
      recipientId: retailSalesB.id,
      type: NotificationType.SYSTEM,
      title: "Deposit review in progress",
      body: "Finance is reviewing the submitted deposit for Al Raha Waterfront Residence.",
      reference: "OPP-DEMO-006",
      actionLabel: "View opportunity",
    },
    {
      recipientId: ceo.id,
      type: NotificationType.SYSTEM,
      title: "Portfolio demo reporting data refreshed",
      body: "Executive metrics include current and previous month synthetic wins.",
      reference: "OPP-DEMO-014",
      actionLabel: "Open reports",
    },
  ] as const;

  for (const notification of notifications) {
    const opportunity = opportunityByReference.get(notification.reference)!;
    await db.notification.create({
      data: {
        recipientId: notification.recipientId,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        entityType: "Opportunity",
        entityId: opportunity.id,
        href: `/opportunities/${opportunity.id}`,
        actionLabel: notification.actionLabel,
        actorName: "Northstar Demo",
      },
    });
  }

  const auditDefinitions = [
    ["OPP-DEMO-004", "Quotation", AuditAction.QUOTATION_SENT],
    ["OPP-DEMO-006", "Deposit", AuditAction.CREATE],
    ["OPP-DEMO-007", "Opportunity", AuditAction.WON_CONVERSION],
    ["OPP-DEMO-009", "PricingCase", AuditAction.UPDATE],
    ["OPP-DEMO-010", "Approval", AuditAction.CREATE],
    ["OPP-DEMO-011", "OrderHandover", AuditAction.PO_UPDATE],
    ["OPP-DEMO-014", "Deposit", AuditAction.DEPOSIT_CONFIRM],
    ["OPP-DEMO-014", "OrderHandover", AuditAction.ASSIGN],
  ] as const;

  for (const [reference, entityType, action] of auditDefinitions) {
    const opportunity = opportunityByReference.get(reference)!;
    await db.auditLog.create({
      data: {
        actorId: manager.id,
        action,
        entityType,
        entityId: opportunity.id,
        opportunityId: opportunity.id,
        actionUrl: `/opportunities/${opportunity.id}`,
        metadata: {
          demo: true,
          note: "Synthetic portfolio audit event",
        },
        createdAt: daysFromNow(-2),
      },
    });
  }

  const summary = {
    customers: await db.customer.count({
      where: { reference: { startsWith: "CUST-DEMO-" } },
    }),
    leads: await db.lead.count({
      where: { reference: { startsWith: "LEAD-DEMO-" } },
    }),
    opportunities: await db.opportunity.count({
      where: { reference: { startsWith: "OPP-DEMO-" } },
    }),
    pricingCases: await db.pricingCase.count({
      where: { opportunity: { reference: { startsWith: "OPP-DEMO-" } } },
    }),
    quotations: await db.quotation.count({
      where: { opportunity: { reference: { startsWith: "OPP-DEMO-" } } },
    }),
    deposits: await db.deposit.count({
      where: { opportunity: { reference: { startsWith: "OPP-DEMO-" } } },
    }),
    handovers: await db.orderHandover.count({
      where: { opportunity: { reference: { startsWith: "OPP-DEMO-" } } },
    }),
    tasks: await db.task.count({
      where: { reference: { startsWith: "TASK-DEMO-" } },
    }),
    pendingApprovals: await db.approval.count({
      where: {
        opportunity: { reference: { startsWith: "OPP-DEMO-" } },
        status: ApprovalStatus.PENDING,
      },
    }),
  };

  console.log("Portfolio demo seed complete.");
  console.table(summary);
  console.log(
    "Suggested demo users: alex.morgan@northstar.example, finance@northstar.example, jordan.lee@northstar.example, ceo@northstar.example",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
