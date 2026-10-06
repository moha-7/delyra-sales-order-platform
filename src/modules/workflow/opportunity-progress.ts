import { DepositStatus, DocumentCategory, OpportunityStage, OpportunityTrack, PricingStatus } from "@/generated/prisma/client";
import { documentCategoryLabel } from "@/modules/documents/options";
import type { ChecklistViewItem } from "@/modules/checklist/service";
import type { WorkflowStep } from "@/components/workflow/workflow-progress-panel";

function isCompletedChecklist(checklist: ChecklistViewItem[], keys: string[]) {
  return keys.some((key) => checklist.find((item) => item.key === key)?.status === "COMPLETED");
}
function blockedChecklist(checklist: ChecklistViewItem[], keys: string[]) {
  return checklist.find((item) => keys.includes(item.key) && item.status === "BLOCKED") ?? null;
}
function missingChecklistLabels(checklist: ChecklistViewItem[], keys: string[]) {
  return checklist.filter((item) => keys.includes(item.key) && item.required && item.status !== "COMPLETED" && item.status !== "NOT_APPLICABLE").map((item) => item.label);
}
function stepState(completed: boolean, current: boolean, blocked = false): WorkflowStep["state"] {
  if (blocked) return "BLOCKED";
  if (completed) return "COMPLETED";
  if (current) return "CURRENT";
  return "NOT_STARTED";
}

export type OpportunityProgressInput = {
  track: OpportunityTrack;
  stage: OpportunityStage;
  pricingStatus?: PricingStatus | null;
  hasQuotation: boolean;
  latestQuotationSent: boolean;
  invoiceRecorded: boolean;
  depositStatus?: DepositStatus | null;
  handoverExists: boolean;
  missingDesignCategories: string[];
  checklist: ChecklistViewItem[];
  ownerName: string;
  designerName?: string | null;
  updatedAt?: Date | string | null;
};

export function opportunityWorkflowSteps(input: OpportunityProgressInput): WorkflowStep[] {
  const checklist = input.checklist;
  const designMissingLabels = input.missingDesignCategories.map((category) => documentCategoryLabel(category as DocumentCategory));
  const designBlocked = blockedChecklist(checklist, ["design.assigned", "design.package_values", "design.source_file", "design.design_pdf", "design.element_list", "design.supplier_quotation"]);
  const financeBlocked = blockedChecklist(checklist, ["finance.pricing", "manager.approval"]);
  const depositBlocked = blockedChecklist(checklist, ["finance.invoice", "finance.deposit"]);
  const pricingApproved = input.pricingStatus === PricingStatus.APPROVED;
  const pricingStarted = Boolean(input.pricingStatus);
  const depositConfirmed = input.depositStatus === DepositStatus.CONFIRMED;

  if (input.track === OpportunityTrack.RETAIL) {
    return [
      { key: "retail-new", label: "New Lead / Enquiry", state: "COMPLETED", responsible: "Sales", nextAction: "Qualify and contact customer", updatedAt: input.updatedAt },
      { key: "retail-contacted", label: "Contacted / Qualified", state: stepState(input.stage !== OpportunityStage.NEW_ENQUIRY, input.stage === OpportunityStage.NEW_ENQUIRY), responsible: input.ownerName, nextAction: "Confirm showroom/design requirements" },
      { key: "retail-design", label: "Design Package", state: stepState(designMissingLabels.length === 0 && isCompletedChecklist(checklist, ["design.package_values"]), !pricingStarted && designMissingLabels.length > 0, Boolean(designBlocked)), responsible: input.designerName ?? "Designer", nextAction: "Upload Design, Design PDF, Element List, and Supplier design quotation", missing: designMissingLabels, blockedReason: designBlocked?.comment },
      { key: "retail-finance", label: "Finance Review", state: stepState(pricingApproved, pricingStarted && !pricingApproved, Boolean(financeBlocked)), responsible: "Finance", nextAction: "Apply Retail cascade pricing and lock approved commercial price", blockedReason: financeBlocked?.comment },
      { key: "retail-quote", label: "Quotation Generated / Sent", state: stepState(input.hasQuotation && input.latestQuotationSent, pricingApproved && !input.latestQuotationSent), responsible: input.ownerName, nextAction: "Generate, preview, print, and send customer quotation" },
      { key: "retail-invoice", label: "Payment Receipt / Invoice Ready", state: stepState(input.invoiceRecorded, pricingApproved && !input.invoiceRecorded, Boolean(depositBlocked)), responsible: "Finance / Sales", nextAction: "Finance records invoice; Sales submits customer payment proof", blockedReason: depositBlocked?.comment },
      { key: "retail-deposit", label: "Deposit Confirmed", state: stepState(depositConfirmed, input.depositStatus === DepositStatus.SUBMITTED), responsible: "Finance", nextAction: "Confirm 30% deposit and move to Won" },
      { key: "retail-won", label: "Won", state: stepState(input.stage === OpportunityStage.WON, depositConfirmed && input.stage !== OpportunityStage.WON), responsible: "System / Finance", nextAction: "Won is controlled by Finance deposit confirmation" },
    ];
  }

  return [
    { key: "project-created", label: "Project Created", state: "COMPLETED", responsible: "Project Sales", updatedAt: input.updatedAt },
    { key: "project-requirements", label: "Requirements / BOQ Received", state: stepState(isCompletedChecklist(checklist, ["sales.site_address"]), input.stage === OpportunityStage.QUALIFIED), responsible: input.ownerName, nextAction: "Record site, requirements, BOQ, and customer scope", missing: missingChecklistLabels(checklist, ["sales.site_address"]) },
    { key: "project-design", label: "Design Submitted", state: stepState(designMissingLabels.length === 0 && isCompletedChecklist(checklist, ["design.package_values"]), designMissingLabels.length > 0, Boolean(designBlocked)), responsible: input.designerName ?? "Designer", nextAction: "Complete design, Design values, Design PDF, Element List", missing: designMissingLabels, blockedReason: designBlocked?.comment },
    { key: "project-measurement", label: "Measurement Completed", state: stepState(isCompletedChecklist(checklist, ["sales.measurement"]), !isCompletedChecklist(checklist, ["sales.measurement"])), responsible: "Measurement / Sales", nextAction: "Schedule and complete site measurement", missing: missingChecklistLabels(checklist, ["sales.measurement"]) },
    { key: "project-quotation", label: "Quotation Draft", state: stepState(input.hasQuotation, pricingApproved && !input.hasQuotation), responsible: input.ownerName, nextAction: "Generate client-ready quotation after approved price" },
    { key: "project-manager", label: "Branch / Department Manager Approval", state: stepState(pricingApproved, input.pricingStatus === PricingStatus.MANAGER_APPROVAL, Boolean(financeBlocked)), responsible: "Branch / Department Manager", nextAction: "Approve or return commercial price", blockedReason: financeBlocked?.comment },
    { key: "project-finance", label: "Finance Review", state: stepState(pricingApproved, pricingStarted && !pricingApproved), responsible: "Finance", nextAction: "Review costing evidence and approved commercial price" },
    { key: "project-deposit", label: "Deposit Confirmed", state: stepState(depositConfirmed, input.depositStatus === DepositStatus.SUBMITTED || input.invoiceRecorded), responsible: "Finance / Sales", nextAction: "Submit and confirm deposit" },
    { key: "project-handover", label: "Operations Handover", state: stepState(input.handoverExists, input.stage === OpportunityStage.WON && !input.handoverExists), responsible: "Operations / Project Manager", nextAction: "Review Won package and continue order execution" },
    { key: "project-progress", label: "In Progress / Installation / Completed", state: input.handoverExists ? "CURRENT" : "NOT_STARTED", responsible: "Operations", nextAction: "Track PO, OC/AB, ETA, installation and completion" },
  ];
}
