import Decimal from "decimal.js";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  OpportunityStage,
  OpportunityTrack,
  PricingStatus,
  RoleKey,
} from "@/generated/prisma/client";
import { ChecklistBoard } from "@/components/checklist/checklist-board";
import { ActivityTimelinePanel } from "@/components/activity/activity-timeline-panel";
import { ChatterPanel } from "@/components/chatter/chatter-panel";
import { SectionDeepLink } from "@/components/navigation/section-deep-link";
import { DesignAssignmentForm } from "@/components/crm/design-assignment-form";
import { EditOpportunityForm } from "@/components/crm/edit-opportunity-form";
import { StatusPill } from "@/components/crm/status-pill";
import { WorkflowProgressPanel } from "@/components/workflow/workflow-progress-panel";
import {
  FinanceDepositDecision,
  FinanceInvoiceForm,
  SalesDepositForm,
} from "@/components/deals/invoice-deposit-panel";
import { FinanceProjectCostingUpload } from "@/components/documents/finance-document-upload";
import { OpportunityDocumentUpload } from "@/components/documents/opportunity-document-upload";
import { ProjectPricingForm } from "@/components/pricing/project-pricing-form";
import {
  ManagerProjectDecision,
  ManagerRetailDecision,
  SubmitProjectPricing,
  SubmitRetailPricing,
} from "@/components/pricing/pricing-workflow-actions";
import { RetailPricingForm } from "@/components/pricing/retail-pricing-form";
import { GenerateQuotationForm } from "@/components/quotations/generate-quotation-form";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { checklistForOpportunity } from "@/modules/checklist/service";
import {
  canManageAllOpportunities,
  canManageOwnOpportunities,
  canViewLeads,
  canViewOpportunities,
  opportunityViewWhere,
} from "@/modules/crm/access";
import { enumLabel, formatDateTime, formatMoney } from "@/modules/crm/format";
import { navigationScopeFor } from "@/modules/auth/navigation";
import { listAssignableOwners } from "@/modules/crm/queries";
import {
  documentCategoryLabel,
  DESIGN_REQUIRED_CATEGORIES,
} from "@/modules/documents/options";
import {
  canApprovePricingAsManager,
  canAssignDesigner,
  canGenerateQuotation,
  canPrepareFinancePricing,
  canPrepareProjectPricing,
  canPrepareDesignPackage,
  canViewCost,
  canViewMargin,
} from "@/modules/pricing/access";
import { retailFinanceValues } from "@/modules/pricing/view-model";
import { PERMISSIONS } from "@/modules/rbac/permissions";
import { getRetailPricingDefaults } from "@/modules/settings/workflow";
import { opportunityWorkflowSteps } from "@/modules/workflow/opportunity-progress";

type DetailSectionProps = {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  status?: string | null;
  defaultOpen?: boolean;
  children: ReactNode;
};

function DetailSection({
  id,
  eyebrow,
  title,
  description,
  status,
  defaultOpen = false,
  children,
}: DetailSectionProps) {
  return (
    <details className="form-card collapsible-card" id={id} open={defaultOpen}>
      <summary>
        <div className="card-heading">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          {status ? <StatusPill value={status} /> : null}
        </div>
      </summary>
      {children}
    </details>
  );
}

export default async function OpportunityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ opportunityId: string }>;
  searchParams: Promise<{ section?: string; message?: string }>;
}) {
  const user = await requireUser();
  if (!canViewOpportunities(user)) redirect("/dashboard?error=forbidden");
  const { opportunityId } = await params;
  const resolvedSearchParams = await searchParams;
  const focusedChatterMessageId =
    resolvedSearchParams.section === "chatter" ? resolvedSearchParams.message ?? null : null;

  const opportunity = await db.opportunity.findFirst({
    where: {
      AND: [{ id: opportunityId, archivedAt: null }, opportunityViewWhere(user)],
    },
    include: {
      customer: {
        include: {
          contacts: {
            where: { archivedAt: null },
            orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          },
        },
      },
      owner: { select: { id: true, displayName: true } },
      sourceLead: { select: { id: true, reference: true } },
      members: { select: { userId: true, role: true } },
      activities: {
        include: { createdBy: { select: { displayName: true } } },
        orderBy: { occurredAt: "desc" },
        take: 30,
      },
      tasks: {
        where: { archivedAt: null },
        include: { assignedTo: { select: { displayName: true } } },
        orderBy: [{ status: "asc" }, { dueAt: "asc" }],
        take: 20,
      },
      pricingCases: {
        where: { status: { not: PricingStatus.SUPERSEDED } },
        include: { lines: { orderBy: { sortOrder: "asc" } } },
        orderBy: { revision: "desc" },
        take: 1,
      },
      documents: {
        where: { archivedAt: null, currentVersion: { gt: 0 } },
        include: {
          versions: {
            orderBy: { versionNo: "desc" },
            include: { uploadedBy: { select: { displayName: true } } },
          },
        },
        orderBy: { category: "asc" },
      },
      designPackage: true,
      designJobs: {
        include: { assignedTo: { select: { id: true, displayName: true } } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      quotations: {
        include: { versions: { orderBy: { versionNo: "desc" }, take: 1 } },
        orderBy: { createdAt: "desc" },
      },
      deposits: {
        include: {
          submittedBy: { select: { displayName: true } },
          reviewedBy: { select: { displayName: true } },
        },
        orderBy: { submittedAt: "desc" },
        take: 1,
      },
      handover: true,
    },
  });
  if (!opportunity) notFound();

  const assignedMember = opportunity.members.some(
    (member) => member.userId === user.id,
  );
  const canAssignOwner = canManageAllOpportunities(user);
  const canEdit =
    opportunity.stage !== OpportunityStage.WON &&
    (canAssignOwner ||
      (canManageOwnOpportunities(user) &&
        (opportunity.ownerId === user.id ||
          (user.dataScope === "ASSIGNED" && assignedMember))));
  const owners = canAssignOwner ? await listAssignableOwners() : [];
  const managerCanAssignDesigner = canAssignDesigner(user);
  const designers = managerCanAssignDesigner
    ? await db.user.findMany({
        where: {
          archivedAt: null,
          userRoles: { some: { role: { key: RoleKey.DESIGNER } } },
        },
        select: { id: true, displayName: true },
        orderBy: { displayName: "asc" },
      })
    : [];

  const designJob = opportunity.designJobs[0] ?? null;
  const isCeoViewer = user.roles.includes(RoleKey.CEO_VIEWER);
  const isDesigner = user.roles.includes(RoleKey.DESIGNER);
  const canEditDesignPackage =
    canPrepareDesignPackage(user) &&
    (!designJob || designJob.assignedTo.id === user.id);
  const pricingCase = opportunity.pricingCases[0] ?? null;
  const retailDefaults = await getRetailPricingDefaults();
  const financeValues = retailFinanceValues(pricingCase, retailDefaults);
  const pricingLocked = pricingCase?.status === PricingStatus.APPROVED;
  const showCost = canViewCost(user);
  const showMargin = canViewMargin(user);
  const visibleDocuments = opportunity.documents.filter(
    (document) =>
      document.confidentiality !== "FINANCE_RESTRICTED" ||
      showCost ||
      canApprovePricingAsManager(user),
  );
  const financeOnlyView =
    user.roles.includes(RoleKey.FINANCE) &&
    !user.roles.includes(RoleKey.MANAGER) &&
    !user.roles.includes(RoleKey.DESIGNER);

  if (financeOnlyView && opportunity.stage === OpportunityStage.WON) {
    redirect("/dashboard?handover=transferred-to-order-coordination");
  }
  const designCategories = new Set([
    "DESIGN_SOURCE_FILE",
    "DESIGN",
    "ELEMENT_LIST",
    "DESIGN_SUPPLIER_QUOTATION",
    "APPLIANCES_LIST",
  ]);
  const designDocuments = visibleDocuments.filter((document) =>
    designCategories.has(document.category),
  );
  const projectCostingDocument =
    visibleDocuments.find((document) => document.category === "PROJECT_COSTING") ??
    null;
  const invoiceDocument =
    visibleDocuments.find((document) => document.category === "CUSTOMER_INVOICE") ??
    null;
  const presentCategories = new Set(
    visibleDocuments.map((document) => document.category),
  );
  const missingDesignFiles = DESIGN_REQUIRED_CATEGORIES.filter(
    (category) => !presentCategories.has(category),
  );
  const checklistItems = await checklistForOpportunity(
    opportunity.id,
    opportunity.track,
    user,
  );
  const canFinanceRetail =
    opportunity.track === OpportunityTrack.RETAIL && canPrepareFinancePricing(user);
  const canFinanceProject =
    opportunity.track === OpportunityTrack.PROJECT && canPrepareProjectPricing(user);
  const canManagerApprove = canApprovePricingAsManager(user);
  const canCreateQuotation =
    pricingCase?.status === PricingStatus.APPROVED && canGenerateQuotation(user);
  const showPricingWorkspace =
    canFinanceRetail ||
    canFinanceProject ||
    canManagerApprove ||
    showCost ||
    showMargin;
  const latestDeposit = opportunity.deposits[0] ?? null;
  const canRecordInvoice = user.permissions.includes(
    PERMISSIONS.FINANCE_PRICING_PREPARE,
  );
  const canConfirmDeposit = user.permissions.includes(PERMISSIONS.DEPOSIT_CONFIRM);
  const canSubmitDeposit = opportunity.ownerId === user.id || canAssignOwner;
  const depositBase =
    opportunity.financeInvoiceTotal ?? pricingCase?.approvedSellingPrice ?? null;
  const expectedDeposit =
    pricingCase?.status === PricingStatus.APPROVED && depositBase
      ? new Decimal(depositBase.toString()).mul("0.3").toFixed(2)
      : "0.00";

  const scope = navigationScopeFor(user);

  const workflowSteps = opportunityWorkflowSteps({
    track: opportunity.track,
    stage: opportunity.stage,
    pricingStatus: pricingCase?.status ?? null,
    hasQuotation: opportunity.quotations.length > 0,
    latestQuotationSent: opportunity.quotations.some((quotation) =>
      quotation.versions.some(
        (version) =>
          version.status === "SENT" || version.status === "ACCEPTED",
      ),
    ),
    invoiceRecorded: Boolean(opportunity.financeInvoiceReference),
    depositStatus: latestDeposit?.status ?? null,
    handoverExists: Boolean(opportunity.handover),
    missingDesignCategories: missingDesignFiles,
    checklist: checklistItems,
    ownerName: opportunity.owner.displayName,
    designerName: designJob?.assignedTo.displayName ?? null,
    updatedAt: opportunity.updatedAt,
  });

  const openOpportunityTasks = opportunity.tasks.filter(
    (task) => !["COMPLETED", "CANCELLED"].includes(task.status),
  );
  const blockedOpportunityTasks = opportunity.tasks.filter((task) =>
    ["BLOCKED", "WAITING_CUSTOMER", "WAITING_INTERNAL"].includes(task.status),
  );
  const taskAttentionCount = openOpportunityTasks.length;


  return (
    <div className="content-page opportunity-workspace">
      <SectionDeepLink />
      <div className="breadcrumb">
        <Link href="/opportunities">Opportunities</Link>
        <span>/</span>
        <span>{opportunity.reference}</span>
      </div>

      <header className="opportunity-hero">
        <div className="opportunity-hero-main">
        <div>
          <p className="eyebrow">{opportunity.reference}</p>
          <h1>{opportunity.title}</h1>
          <p>
            <Link href={`/customers/${opportunity.customer.id}`}>
              {opportunity.customer.name}
            </Link>{" "}
            / {enumLabel(opportunity.track)} / Owner {opportunity.owner.displayName}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-extrabold">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
              Role: {scope.roleLabel}
            </span>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700 ring-1 ring-blue-100">
              Workspace: {enumLabel(opportunity.track)}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
              Owner: {opportunity.owner.displayName}
            </span>
          </div>
        </div>
        <div className="header-badges">
            <StatusPill value={opportunity.stage} />
            <StatusPill value={opportunity.dataQualityStatus} />
          </div>
        </div>
      </header>

      <section className="opportunity-summary-grid">
        <article>
          <span>Customer budget</span>
          <strong>{formatMoney(opportunity.customerBudgetAed, "AED")}</strong>
          <small>Indicative only</small>
        </article>
        <article>
          <span>Approved selling price</span>
          <strong>
            {formatMoney(
              pricingCase?.status === PricingStatus.APPROVED
                ? pricingCase.approvedSellingPrice
                : null,
              "AED",
            )}
          </strong>
          <small>Pre-VAT</small>
        </article>
        <article>
          <span>Quotation</span>
          <strong>{opportunity.quotations[0]?.businessReference ?? "-"}</strong>
          <small>{opportunity.quotations.length} generated</small>
        </article>
        <article>
          <span>Deposit receipt</span>
          <strong>{latestDeposit?.reference ?? "-"}</strong>
          <small>{latestDeposit ? enumLabel(latestDeposit.status) : "Not submitted"}</small>
        </article>
      </section>

      <nav className="workspace-nav">
        <div className="workspace-nav-header">
          <div>
            <strong>Workspace sections</strong>
            <small className="block text-xs text-slate-500">Open only what you need. Tasks are highlighted when action is required.</small>
          </div>
          <span>{enumLabel(opportunity.stage)}</span>
        </div>
        <div className="workspace-nav-links">
          <a href="#workflow">Workflow</a>
          <a href="#details">Details</a>
          {!financeOnlyView ? <a href="#design">Design</a> : null}
          {!financeOnlyView ? <a href="#design">design package</a> : null}
          {showPricingWorkspace ? <a href="#pricing">Pricing</a> : null}
          <a href="#files">Files & Versions</a>
          <a href="#quotation">Quotation</a>
          <a href="#invoice-deposit">Invoice & deposit</a>
          <a href="#checklist">Checklist</a>
          {!isCeoViewer ? <a href="#chatter">Chatter</a> : null}
          <a href="#tasks">Tasks{taskAttentionCount ? ` (${taskAttentionCount})` : ""}</a>
          <a href="#activity">Activity</a>
        </div>
      </nav>

      {taskAttentionCount ? (
        <a
          className="task-jump-strip"
          href="#tasks"
        >
          <span>
            {taskAttentionCount} task{taskAttentionCount === 1 ? "" : "s"} need attention
            {blockedOpportunityTasks.length ? ` - ${blockedOpportunityTasks.length} blocked / waiting` : ""}
          </span>
          <span className="inline-flex items-center gap-2 text-blue-700">
            Jump to tasks <i className="bi bi-arrow-down" />
          </span>
        </a>
      ) : null}

      <div id="workflow">
        <WorkflowProgressPanel
          title="Workflow progress"
          subtitle="Clear current step, owner, blocker, and next action."
          steps={workflowSteps}
        />
      </div>


      <section className="detail-grid" id="details">
        <article className="detail-card">
          <h2>Opportunity details</h2>
          <dl className="detail-list">
            <div>
              <dt>Track</dt>
              <dd>{enumLabel(opportunity.track)}</dd>
            </div>
            <div>
              <dt>Site address</dt>
              <dd>{opportunity.siteAddress ?? "-"}</dd>
            </div>
            <div>
              <dt>Probability</dt>
              <dd>
                {opportunity.probabilityPct?.toString() ?? "-"}
                {opportunity.probabilityPct ? "%" : ""}
              </dd>
            </div>
            <div>
              <dt>Next follow-up</dt>
              <dd>{formatDateTime(opportunity.nextFollowUpAt)}</dd>
            </div>
            <div>
              <dt>Source lead</dt>
              <dd>
                {opportunity.sourceLead
                  ? canViewLeads(user)
                    ? (
                        <Link href={`/leads/${opportunity.sourceLead.id}`}>
                          {opportunity.sourceLead.reference}
                        </Link>
                      )
                    : opportunity.sourceLead.reference
                  : "-"}
              </dd>
            </div>
            {opportunity.track === OpportunityTrack.PROJECT ? (
              <>
                <div>
                  <dt>Project CRM reference</dt>
                  <dd>{opportunity.tenderSystemReference ?? "-"}</dd>
                </div>
                <div>
                  <dt>Client BOQ reference</dt>
                  <dd>{opportunity.clientTenderReference ?? "-"}</dd>
                </div>
              </>
            ) : null}
            <div>
              <dt>Lost reason</dt>
              <dd>{opportunity.lostReason ?? "-"}</dd>
            </div>
          </dl>
          {opportunity.requirementsSummary ? (
            <div className="long-text">
              <strong>Requirements</strong>
              <p>{opportunity.requirementsSummary}</p>
            </div>
          ) : null}
        </article>

        <article className="detail-card">
          <h2>Customer contacts</h2>
          {opportunity.customer.contacts.length ? (
            <div className="stack-list">
              {opportunity.customer.contacts.map((contact) => (
                <div className="stack-item" key={contact.id}>
                  <div>
                    <strong>{contact.name}</strong>
                    <small>{contact.roleTitle ?? "Contact"}</small>
                  </div>
                  <span>{contact.mobile ?? contact.email ?? "No contact detail"}</span>
                </div>
              ))}
            </div>
          ) : (
            <p>No verified contact has been added.</p>
          )}
        </article>
      </section>

      {canEdit ? (
        <details id="ownership-reassignment" className="form-card collapsible-card section-highlight-target">
          <summary>Edit opportunity / ownership reassignment</summary>
          <EditOpportunityForm
            opportunity={{
              id: opportunity.id,
              title: opportunity.title,
              stage:
                opportunity.stage === OpportunityStage.WON
                  ? "DEPOSIT_PENDING"
                  : opportunity.stage,
              siteAddress: opportunity.siteAddress,
              requirementsSummary: opportunity.requirementsSummary,
              customerBudgetAed: opportunity.customerBudgetAed?.toString() ?? null,
              probabilityPct: opportunity.probabilityPct?.toString() ?? null,
              nextFollowUpAt: opportunity.nextFollowUpAt?.toISOString() ?? null,
              lostReason: opportunity.lostReason,
              ownerId: opportunity.ownerId,
            }}
            owners={owners}
            canAssign={canAssignOwner}
          />
        </details>
      ) : null}

      {!financeOnlyView ? (
        <>
      <DetailSection
        id="design"
        eyebrow="Design assignment"
        title="Measurement and Design design responsibility"
        status={designJob?.status ?? "NOT_STARTED"}
      >
        {designJob ? (
          <p>
            Assigned to <strong>{designJob.assignedTo.displayName}</strong>
            {designJob.dueAt ? `  -  due ${formatDateTime(designJob.dueAt)}` : ""}
          </p>
        ) : (
          <p>
            {isDesigner
              ? "No designer assigned. Saving the design package will assign this design to you."
              : "No designer assigned yet."}
          </p>
        )}
        {managerCanAssignDesigner ? (
          <DesignAssignmentForm
            opportunityId={opportunity.id}
            designers={designers}
            currentDesignerId={designJob?.assignedTo.id}
          />
        ) : null}
      </DetailSection>

      <DetailSection
        id="design"
        eyebrow="design package"
        title="Design files and Design values"
        description={
          missingDesignFiles.length
            ? `Missing: ${missingDesignFiles.map(documentCategoryLabel).join(", ")}`
            : "All required Design files are present."
        }
        status={opportunity.designPackage?.status ?? "NOT_STARTED"}
      >
        <div className="document-grid">
          {designDocuments.length ? (
            designDocuments.map((document) => {
              const current = document.versions[0];
              return current ? (
                <article className="document-item" key={document.id}>
                  <div>
                    <strong>{documentCategoryLabel(document.category)}</strong>
                    <small>
                      v{current.versionNo}  -  {current.uploadedBy.displayName}  -  {formatDateTime(current.createdAt)}
                    </small>
                  </div>
                  <div className="version-actions">
                    <Link href={`/documents/${current.id}/preview`}>Preview</Link>
                    <a href={`/api/documents/${current.id}/download`}>Download</a>
                  </div>
                </article>
              ) : null;
            })
          ) : (
            <p className="empty-state">No opportunity files uploaded yet.</p>
          )}
        </div>
        {canEditDesignPackage ? (
          <OpportunityDocumentUpload
            opportunityId={opportunity.id}
            values={{
              designReference:
                opportunity.designPackage?.designReference ??
                opportunity.designReference ??
                "",
              revisionLabel: opportunity.designPackage?.revisionLabel ?? "",
              designFurnitureEur:
                opportunity.designPackage?.designFurnitureEur?.toString() ?? "0",
              designAuxiliaryEur:
                opportunity.designPackage?.designAuxiliaryEur?.toString() ?? "0",
              notes: opportunity.designPackage?.notes ?? "",
            }}
          />
        ) : (
          <p className="role-note">
            Files are read-only for your role. The assigned Designer uploads and revises the package.
          </p>
        )}
      </DetailSection>
        </>
      ) : null}

      <section className="file-versions-only-panel" id="files">
        <div className="file-panel-header">
          <div>
            <strong>Files & Versions</strong>
            <span>
              Preview and download files from the version history. Inline document review is kept out of the workspace to avoid clutter.
            </span>
          </div>
          <span className="current-version-pill">Preview on demand</span>
        </div>

        {visibleDocuments.length ? (
          <div className="file-review-grid">
            {visibleDocuments.map((document) => (
              <section className="file-review-card" key={document.id}>
                <header>
                  <i className={document.category.includes("PDF") || document.category.includes("QUOTATION") ? "bi bi-file-earmark-pdf" : "bi bi-file-earmark"} />
                  <div>
                    <strong>{documentCategoryLabel(document.category)}</strong>
                    <span className="block text-xs font-bold text-slate-500">{document.versions.length} version{document.versions.length === 1 ? "" : "s"}</span>
                  </div>
                </header>
                {document.versions.map((version) => (
                  <div className="file-review-version" key={version.id}>
                    <strong>v{version.versionNo}</strong>
                    <div className="file-review-meta">
                      {version.versionNo === document.currentVersion ? <span className="current-version-pill">Current</span> : null}
                      <span>{version.originalName}</span>
                      <span>{formatDateTime(version.createdAt)}</span>
                      <span>by {version.uploadedBy.displayName}</span>
                      <span>{Math.round(Number(version.sizeBytes) / 1024)} KB</span>
                    </div>
                    <div className="file-review-actions">
                      <Link href={`/documents/${version.id}/preview`}><i className="bi bi-eye" /> Preview</Link>
                      <a href={`/api/documents/${version.id}/download`}><i className="bi bi-download" /> Download</a>
                    </div>
                  </div>
                ))}
              </section>
            ))}
          </div>
        ) : (
          <p className="empty-state">No files linked to this opportunity yet.</p>
        )}

        <p className="file-review-note">
          Finance reviews files only before the opportunity is won. After Won, Finance access is closed and the record continues with Order Coordination / Handover and the Sales owner.
        </p>
      </section>
      {showPricingWorkspace ? (
        <DetailSection
          id="pricing"
          eyebrow="Pricing"
          title={
            opportunity.track === OpportunityTrack.RETAIL
              ? "Retail Finance pricing"
              : "Project Finance summary"
          }
          status={pricingCase?.status ?? "NOT_STARTED"}
        >
          {pricingCase ? (
            <section className="pricing-summary-grid">
              <article>
                <span>Selling price</span>
                <strong>{formatMoney(pricingCase.approvedSellingPrice, "AED")}</strong>
                <small>
                  {pricingCase.status === PricingStatus.APPROVED
                    ? "Branch Manager approved"
                    : "Draft / proposed"}
                </small>
              </article>
              {showCost ? (
                <article>
                  <span>Total cost</span>
                  <strong>{formatMoney(pricingCase.estimatedCost, "AED")}</strong>
                </article>
              ) : null}
              {showMargin ? (
                <article>
                  <span>Gross profit</span>
                  <strong>{formatMoney(pricingCase.grossProfit, "AED")}</strong>
                </article>
              ) : null}
              {showMargin ? (
                <article>
                  <span>Gross margin</span>
                  <strong>{pricingCase.grossMarginPct != null ? pricingCase.grossMarginPct.toString() : pricingCase.approvedSellingPrice != null && Number(pricingCase.approvedSellingPrice) > 0 && pricingCase.grossProfit != null ? ((Number(pricingCase.grossProfit) / Number(pricingCase.approvedSellingPrice)) * 100).toFixed(2) : "-"}%</strong>
                </article>
              ) : null}
            </section>
          ) : null}

          {opportunity.track === OpportunityTrack.RETAIL ? (
            <>
              {canFinanceRetail ? (
                <RetailPricingForm
                  opportunityId={opportunity.id}
                  designValues={{
                    furnitureEur:
                      opportunity.designPackage?.designFurnitureEur?.toString() ?? "0",
                    hlpEur:
                      opportunity.designPackage?.designAuxiliaryEur?.toString() ?? "0",
                    pointFactor:
                      opportunity.designPackage?.supplierPointFactor?.toString() ??
                      retailDefaults.supplierPointFactorReference,
                  }}
                  values={financeValues}
                  canEdit={true}
                  locked={
                    pricingLocked ||
                    pricingCase?.status === PricingStatus.MANAGER_APPROVAL
                  }
                />
              ) : (
                <p className="role-note">
                  Finance enters the Retail cascade rates, local costs and selling values.
                  Branch Manager can apply a discount percentage with a reason.
                </p>
              )}
              {pricingCase &&
              (pricingCase.status === PricingStatus.DRAFT ||
                pricingCase.status === PricingStatus.CHANGES_REQUESTED) &&
              canFinanceRetail ? (
                <SubmitRetailPricing pricingCaseId={pricingCase.id} />
              ) : null}
              {pricingCase?.status === PricingStatus.MANAGER_APPROVAL &&
              canManagerApprove ? (
                <ManagerRetailDecision
                  pricingCaseId={pricingCase.id}
                  currentDiscount={pricingCase.companyMarkupPct?.toString() ?? "0"}
                />
              ) : null}
            </>
          ) : (
            <>
              {canFinanceProject ? (
                <>
                  {projectCostingDocument?.versions[0] ? (
                    <div className="document-grid">
                      <article className="document-item">
                        <div>
                          <strong>Current Project Costing Excel</strong>
                          <small>
                            v{projectCostingDocument.versions[0].versionNo}  -  {formatDateTime(projectCostingDocument.versions[0].createdAt)}
                          </small>
                        </div>
                        <a
                          href={`/api/documents/${projectCostingDocument.versions[0].id}/download`}
                        >
                          Download
                        </a>
                      </article>
                    </div>
                  ) : null}
                  <FinanceProjectCostingUpload opportunityId={opportunity.id} />
                  <ProjectPricingForm
                    opportunityId={opportunity.id}
                    totalCostAed={pricingCase?.estimatedCost?.toString() ?? "0"}
                    proposedSellingPriceAed={
                      pricingCase?.priceBeforeDiscount?.toString() ??
                      pricingCase?.approvedSellingPrice?.toString() ??
                      "0"
                    }
                    notes={pricingCase?.sourceEvidenceNotes ?? ""}
                    canEdit={true}
                    locked={
                      pricingLocked ||
                      pricingCase?.status === PricingStatus.MANAGER_APPROVAL
                    }
                  />
                </>
              ) : (
                <p className="role-note">
                  Finance uploads the Project costing Excel and records the structured summary.
                  Branch Manager approves the final price.
                </p>
              )}
              {pricingCase &&
              (pricingCase.status === PricingStatus.DRAFT ||
                pricingCase.status === PricingStatus.CHANGES_REQUESTED) &&
              canFinanceProject ? (
                <SubmitProjectPricing pricingCaseId={pricingCase.id} />
              ) : null}
              {pricingCase?.status === PricingStatus.MANAGER_APPROVAL &&
              canManagerApprove ? (
                <ManagerProjectDecision pricingCaseId={pricingCase.id} />
              ) : null}
            </>
          )}
        </DetailSection>
      ) : null}

      <DetailSection
        id="quotation"
        eyebrow="Customer quotation"
        title="Generated versions and price preview"
        status={opportunity.quotations[0]?.status ?? "NOT_STARTED"}
      >
        {opportunity.quotations.length ? (
          <div className="document-grid">
            {opportunity.quotations.map((quotation) => {
              const current = quotation.versions[0];
              return (
                <article className="document-item" key={quotation.id}>
                  <div>
                    <strong>{quotation.businessReference}</strong>
                    <small>
                      {current
                        ? `v${current.versionNo}  -  ${current.status}  -  ${formatMoney(current.preVatAmount, "AED")}`
                        : "No version"}
                    </small>
                  </div>
                  {current ? (
                    <Link href={`/quotations/${quotation.id}/preview?version=${current.id}`}>
                      Preview
                    </Link>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="empty-state">No generated quotation yet.</p>
        )}
        {canCreateQuotation ? (
          <GenerateQuotationForm opportunityId={opportunity.id} />
        ) : (
          <p className="role-note">
            Quotation preview becomes available to Sales after Branch Manager approves pricing.
          </p>
        )}
      </DetailSection>

      <DetailSection
        id="invoice-deposit"
        eyebrow="Invoice and deposit"
        title="Finance invoice -> 30% deposit -> Won"
        status={
          latestDeposit?.status ??
          (opportunity.financeInvoiceReference ? "INVOICE_RECORDED" : "NOT_STARTED")
        }
      >
        <section className="pricing-summary-grid">
          <article>
            <span>Invoice reference</span>
            <strong>{opportunity.financeInvoiceReference ?? "-"}</strong>
            <small>{formatDateTime(opportunity.financeInvoiceDate)}</small>
          </article>
          <article>
            <span>Invoice total</span>
            <strong>{formatMoney(opportunity.financeInvoiceTotal, "AED")}</strong>
          </article>
          <article>
            <span>Required deposit</span>
            <strong>{formatMoney(expectedDeposit, "AED")}</strong>
            <small>30% of the recorded Finance invoice total</small>
          </article>
          <article>
            <span>Latest submitted deposit</span>
            <strong>{formatMoney(latestDeposit?.submittedAmount, "AED")}</strong>
            <small>{latestDeposit ? enumLabel(latestDeposit.status) : "Not submitted"}</small>
          </article>
        </section>

        {invoiceDocument?.versions[0] ? (
          <div className="document-grid">
            <article className="document-item">
              <div>
                <strong>Finance Invoice PDF</strong>
                <small>
                  v{invoiceDocument.versions[0].versionNo}  -  {formatDateTime(invoiceDocument.versions[0].createdAt)}
                </small>
              </div>
              <a href={`/api/documents/${invoiceDocument.versions[0].id}/download`}>
                Download
              </a>
            </article>
          </div>
        ) : null}
        {latestDeposit ? (
          <div className="document-grid">
            <article className="document-item">
              <div>
                <strong>{latestDeposit.reference ?? "Deposit Receipt"}</strong>
                <small>
                  {enumLabel(latestDeposit.status)}  -  submitted {formatDateTime(latestDeposit.submittedAt)}
                </small>
              </div>
              <Link href={`/deposits/${latestDeposit.id}/receipt`}>Preview / Print</Link>
            </article>
          </div>
        ) : null}
        {canRecordInvoice && pricingCase?.status === PricingStatus.APPROVED ? (
          <FinanceInvoiceForm
            opportunityId={opportunity.id}
            values={{
              reference: opportunity.financeInvoiceReference ?? "",
              date: opportunity.financeInvoiceDate?.toISOString().slice(0, 10) ?? "",
              total:
                opportunity.financeInvoiceTotal?.toString() ??
                pricingCase.approvedSellingPrice?.toString() ??
                "0",
            }}
          />
        ) : null}
        {canSubmitDeposit &&
        pricingCase?.status === PricingStatus.APPROVED &&
        opportunity.financeInvoiceReference &&
        (!latestDeposit || latestDeposit.status !== "CONFIRMED") ? (
          <SalesDepositForm
            opportunityId={opportunity.id}
            expectedAmount={expectedDeposit}
          />
        ) : null}
        {canConfirmDeposit && latestDeposit?.status === "SUBMITTED" ? (
          <FinanceDepositDecision depositId={latestDeposit.id} />
        ) : null}
        {!canRecordInvoice && !canSubmitDeposit && !canConfirmDeposit ? (
          <p className="role-note">
            Invoice and deposit actions are shown only to Finance, the Sales owner, or an authorized Manager.
          </p>
        ) : null}
      </DetailSection>

      <details className="form-card collapsible-card" id="checklist">
        <summary>
          <div className="card-heading">
            <div>
              <p className="eyebrow">Checklist</p>
              <h2>Operational checklist</h2>
              <p>Collapsed by default to keep the page clean. Open it when you need detailed QA items.</p>
            </div>
            <StatusPill value={`${checklistItems.length} ITEMS`} />
          </div>
        </summary>
        <ChecklistBoard opportunityId={opportunity.id} items={checklistItems} />
      </details>

      {!isCeoViewer ? (
        <section id="chatter">
          <ChatterPanel
            opportunityId={opportunity.id}
            activities={opportunity.activities}
            canComment={!isCeoViewer}
            currentUserId={user.id}
            focusMessageId={focusedChatterMessageId}
          />
        </section>
      ) : null}

      <section
        className={`data-card scroll-mt-28 ${taskAttentionCount ? "border-blue-200 bg-blue-50/30 ring-1 ring-blue-100" : ""}`}
        id="tasks"
      >
        <div className="data-card-header">
          <div>
            <strong>Tasks</strong>
            {taskAttentionCount ? (
              <small className="block text-xs text-blue-700">Highlighted because this opportunity has open work.</small>
            ) : null}
          </div>
          <span>{opportunity.tasks.length}</span>
        </div>
        {opportunity.tasks.length ? (
          <div className="stack-list padded-list">
            {opportunity.tasks.map((task) => (
              <div className="stack-item" key={task.id}>
                <div>
                  <strong>{task.title}</strong>
                  <small>
                    {task.reference}  -  {task.assignedTo.displayName}
                  </small>
                </div>
                <StatusPill value={task.status} />
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">No tasks linked to this opportunity.</div>
        )}
      </section>

      <ActivityTimelinePanel opportunityId={opportunity.id} />
    </div>
  );
}


