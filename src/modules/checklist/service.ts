import {
  ChecklistStatus,
  DataQualityStatus,
  DepositStatus,
  DocumentCategory,
  OpportunityStage,
  PricingStatus,
  QuotationStatus,
  type OpportunityTrack,
} from "@/generated/prisma/client";
import type { AuthenticatedUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/modules/rbac/permissions";

export type ChecklistViewItem = {
  id: string | null;
  definitionId: string;
  key: string;
  section: string;
  label: string;
  required: boolean;
  responsibleRole: string | null;
  status: ChecklistStatus;
  automatic: boolean;
  comment: string | null;
  completedBy: string | null;
  completedAt: Date | null;
  canEdit: boolean;
};

function userCanEdit(user: AuthenticatedUser, role: string | null) {
  if (!user.permissions.includes(PERMISSIONS.CHECKLIST_UPDATE)) return false;
  if (user.permissions.includes(PERMISSIONS.CHECKLIST_ADMIN)) return true;
  if (user.roles.includes("MANAGER")) return true;
  return !role || user.roles.includes(role);
}

export async function checklistForOpportunity(
  opportunityId: string,
  track: OpportunityTrack,
  user: AuthenticatedUser,
): Promise<ChecklistViewItem[]> {
  const [definitions, opportunity] = await Promise.all([
    db.checklistDefinition.findMany({
      where: { isActive: true, OR: [{ track: null }, { track }] },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    }),
    db.opportunity.findUniqueOrThrow({
      where: { id: opportunityId },
      include: {
        customer: true,
        measurements: { orderBy: { createdAt: "desc" }, take: 1 },
        designJobs: { orderBy: { createdAt: "desc" }, take: 1 },
        designPackage: true,
        documents: { where: { archivedAt: null, currentVersion: { gt: 0 } }, select: { category: true } },
        pricingCases: { where: { status: { not: PricingStatus.SUPERSEDED } }, orderBy: { revision: "desc" }, take: 1 },
        quotations: { include: { versions: { orderBy: { versionNo: "desc" }, take: 1 } } },
        deposits: { orderBy: { submittedAt: "desc" }, take: 1 },
        handover: true,
        checklistItems: { include: { completedBy: { select: { displayName: true } } } },
      },
    }),
  ]);

  const documents = new Set(opportunity.documents.map((document) => document.category));
  type StoredChecklistItem = {
    id: string;
    definitionId: string;
    status: ChecklistStatus;
    comment: string | null;
    completedAt: Date | null;
    completedBy: { displayName: string } | null;
  };
  const stored = new Map<string, StoredChecklistItem>(
    opportunity.checklistItems.map((item) => [item.definitionId, item]),
  );
  const pricing = opportunity.pricingCases[0];
  const quotationVersion = opportunity.quotations.flatMap((quotation) => quotation.versions)[0];
  const deposit = opportunity.deposits[0];

  function automaticStatus(autoRule: string | null, evidence: DocumentCategory | null) {
    switch (autoRule) {
      case "CUSTOMER_VERIFIED": return opportunity.dataQualityStatus === DataQualityStatus.VERIFIED ? ChecklistStatus.COMPLETED : ChecklistStatus.NOT_STARTED;
      case "SITE_ADDRESS": return opportunity.siteAddress ? ChecklistStatus.COMPLETED : ChecklistStatus.NOT_STARTED;
      case "MEASUREMENT_COMPLETE": return opportunity.measurements[0]?.status === "COMPLETED" ? ChecklistStatus.COMPLETED : ChecklistStatus.NOT_STARTED;
      case "DESIGN_ASSIGNED": return opportunity.designJobs[0] ? ChecklistStatus.COMPLETED : ChecklistStatus.NOT_STARTED;
      case "DESIGN_VALUES": return opportunity.designPackage?.designFurnitureEur ? ChecklistStatus.COMPLETED : ChecklistStatus.NOT_STARTED;
      case "DOCUMENT": return evidence && documents.has(evidence) ? ChecklistStatus.COMPLETED : ChecklistStatus.NOT_STARTED;
      case "FINANCE_PRICING": return pricing && (pricing.status === PricingStatus.MANAGER_APPROVAL || pricing.status === PricingStatus.APPROVED) ? ChecklistStatus.COMPLETED : ChecklistStatus.NOT_STARTED;
      case "MANAGER_APPROVED": return pricing?.status === PricingStatus.APPROVED ? ChecklistStatus.COMPLETED : ChecklistStatus.NOT_STARTED;
      case "QUOTATION_SENT": return quotationVersion?.status === QuotationStatus.SENT || quotationVersion?.status === QuotationStatus.ACCEPTED ? ChecklistStatus.COMPLETED : ChecklistStatus.NOT_STARTED;
      case "INVOICE_RECORDED": return opportunity.financeInvoiceReference ? ChecklistStatus.COMPLETED : ChecklistStatus.NOT_STARTED;
      case "DEPOSIT_CONFIRMED": return deposit?.status === DepositStatus.CONFIRMED ? ChecklistStatus.COMPLETED : ChecklistStatus.NOT_STARTED;
      case "WON_HANDOVER": return opportunity.stage === OpportunityStage.WON && Boolean(opportunity.handover) ? ChecklistStatus.COMPLETED : ChecklistStatus.NOT_STARTED;
      default: return null;
    }
  }

  return definitions.map((definition) => {
    const item = stored.get(definition.id);
    const derived = automaticStatus(definition.autoRule, definition.evidenceCategory);
    return {
      id: item?.id ?? null,
      definitionId: definition.id,
      key: definition.key,
      section: definition.section,
      label: definition.label,
      required: definition.required,
      responsibleRole: definition.responsibleRole,
      status: derived ?? item?.status ?? ChecklistStatus.NOT_STARTED,
      automatic: derived !== null,
      comment: item?.comment ?? null,
      completedBy: item?.completedBy?.displayName ?? null,
      completedAt: item?.completedAt ?? null,
      canEdit: derived === null && userCanEdit(user, definition.responsibleRole),
    };
  });
}
