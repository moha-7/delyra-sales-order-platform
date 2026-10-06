import type { DocumentCategory } from "@/generated/prisma/client";

export type OpportunityDocumentOption = {
  value: DocumentCategory;
  label: string;
  requiredForDesignPackage: boolean;
  roles: Array<"DESIGN" | "FINANCE" | "ORDER_COORDINATION" | "GENERAL">;
};

export const OPPORTUNITY_DOCUMENT_OPTIONS = [
  { value: "DESIGN_SOURCE_FILE", label: "Design source file", requiredForDesignPackage: true, roles: ["DESIGN"] },
  { value: "DESIGN", label: "Design PDF", requiredForDesignPackage: true, roles: ["DESIGN"] },
  { value: "ELEMENT_LIST", label: "Element List PDF", requiredForDesignPackage: true, roles: ["DESIGN"] },
  { value: "DESIGN_SUPPLIER_QUOTATION", label: "Design Quotation PDF", requiredForDesignPackage: true, roles: ["DESIGN"] },
  { value: "APPLIANCES_LIST", label: "Appliances List (when applicable)", requiredForDesignPackage: false, roles: ["DESIGN"] },
  { value: "PROJECT_COSTING", label: "Project Costing Excel", requiredForDesignPackage: false, roles: ["FINANCE"] },
  { value: "CUSTOMER_QUOTATION", label: "Customer Quotation", requiredForDesignPackage: false, roles: ["GENERAL"] },
  { value: "CUSTOMER_INVOICE", label: "Finance Invoice", requiredForDesignPackage: false, roles: ["FINANCE"] },
  { value: "DEPOSIT_PROOF", label: "Deposit Proof", requiredForDesignPackage: false, roles: ["FINANCE"] },
  { value: "SUPPLIER_ORDER_CONFIRMATION", label: "Supplier OC/AB", requiredForDesignPackage: false, roles: ["ORDER_COORDINATION"] },
  { value: "ERP_PO", label: "ERP Purchase Order", requiredForDesignPackage: false, roles: ["ORDER_COORDINATION"] },
  { value: "OTHER", label: "Other supporting file", requiredForDesignPackage: false, roles: ["GENERAL"] },
] as const satisfies readonly OpportunityDocumentOption[];

export const DESIGN_REQUIRED_CATEGORIES: DocumentCategory[] =
  OPPORTUNITY_DOCUMENT_OPTIONS
    .filter((option) => option.requiredForDesignPackage)
    .map((option) => option.value);

export function documentCategoryLabel(category: DocumentCategory): string {
  return OPPORTUNITY_DOCUMENT_OPTIONS.find((option) => option.value === category)?.label ?? category;
}
