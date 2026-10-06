import {
  DocumentCategory,
  DocumentConfidentiality,
  OpportunityStage,
  type Document,
} from "@/generated/prisma/client";
import type { AuthenticatedUser } from "@/lib/auth/session";
import { PERMISSIONS } from "@/modules/rbac/permissions";

const designCategories = new Set<DocumentCategory>([
  DocumentCategory.DESIGN_SOURCE_FILE,
  DocumentCategory.DESIGN,
  DocumentCategory.ELEMENT_LIST,
  DocumentCategory.DESIGN_SUPPLIER_QUOTATION,
  DocumentCategory.APPLIANCES_LIST,
  DocumentCategory.MEASUREMENT,
  DocumentCategory.REQUIREMENTS,
]);
const financeCategories = new Set<DocumentCategory>([
  DocumentCategory.PROJECT_COSTING,
  DocumentCategory.CUSTOMER_INVOICE,
  DocumentCategory.SUPPLIER_INVOICE,
  DocumentCategory.DEPOSIT_PROOF,
]);
const rossCategories = new Set<DocumentCategory>([
  DocumentCategory.SUPPLIER_ORDER_CONFIRMATION,
  DocumentCategory.ERP_PO,
  DocumentCategory.DELIVERY_ACCEPTANCE,
]);

export function canViewDocument(
  user: AuthenticatedUser,
  document: Pick<Document, "confidentiality">,
): boolean {
  if (document.confidentiality !== DocumentConfidentiality.FINANCE_RESTRICTED) return true;
  return user.permissions.includes(PERMISSIONS.FINANCE_COST_VIEW) ||
    user.permissions.includes(PERMISSIONS.PRICING_MANAGER_APPROVE) ||
    user.permissions.includes(PERMISSIONS.SYSTEM_ADMIN);
}

export function canUploadDocumentCategory(
  user: AuthenticatedUser,
  category: DocumentCategory,
): boolean {
  if (designCategories.has(category)) return user.permissions.includes(PERMISSIONS.DESIGN_PACKAGE_PREPARE) || user.permissions.includes(PERMISSIONS.DESIGN_ASSIGN);
  if (financeCategories.has(category)) return user.permissions.includes(PERMISSIONS.FINANCE_PRICING_PREPARE) || user.permissions.includes(PERMISSIONS.DEPOSIT_CONFIRM);
  if (rossCategories.has(category)) return user.permissions.includes(PERMISSIONS.ORDER_HANDOVER_MANAGE);
  return user.permissions.includes(PERMISSIONS.DOCUMENTS_UPLOAD) || user.permissions.includes(PERMISSIONS.OPPORTUNITIES_MANAGE_ALL);
}

export function canArchiveDocument(
  user: AuthenticatedUser,
  document: Pick<Document, "category">,
  stage?: OpportunityStage | null,
): boolean {
  const privileged = user.permissions.includes(PERMISSIONS.SYSTEM_ADMIN) || user.permissions.includes(PERMISSIONS.OPPORTUNITIES_MANAGE_ALL) || user.permissions.includes(PERMISSIONS.PRICING_MANAGER_APPROVE);
  if (stage === OpportunityStage.WON && !privileged) return false;
  return privileged || canUploadDocumentCategory(user, document.category);
}

export function isInlinePreviewable(mimeType: string, originalName: string): boolean {
  const name = originalName.toLowerCase();
  return mimeType === "application/pdf" || mimeType.startsWith("image/") || mimeType.startsWith("text/") || name.endsWith(".pdf") || /\.(png|jpe?g|gif|webp|svg|txt|csv)$/i.test(name);
}
