import type { AuthenticatedUser } from "@/lib/auth/session";
import { PERMISSIONS } from "@/modules/rbac/permissions";

function has(user: Pick<AuthenticatedUser, "permissions">, permission: string) {
  return user.permissions.includes(permission);
}

export function canViewPricing(user: AuthenticatedUser): boolean {
  return [
    PERMISSIONS.FINANCE_PRICING_PREPARE,
    PERMISSIONS.FINANCE_PRICING_REVIEW,
    PERMISSIONS.RETAIL_DISCOUNT_MANAGE,
    PERMISSIONS.PRICING_MANAGER_APPROVE,
    PERMISSIONS.PROJECT_PRICING_PREPARE,
    PERMISSIONS.FINANCE_COST_VIEW,
    PERMISSIONS.FINANCE_MARGIN_VIEW,
    PERMISSIONS.QUOTATION_GENERATE,
  ].some((permission) => has(user, permission));
}

export const canPrepareDesignPackage = (user: AuthenticatedUser) =>
  has(user, PERMISSIONS.DESIGN_PACKAGE_PREPARE);

export const canAssignDesigner = (user: AuthenticatedUser) =>
  has(user, PERMISSIONS.DESIGN_ASSIGN);

export const canPrepareFinancePricing = (user: AuthenticatedUser) =>
  has(user, PERMISSIONS.FINANCE_PRICING_PREPARE) ||
  has(user, PERMISSIONS.PROJECT_PRICING_PREPARE);

export const canReviewPricingAsFinance = (user: AuthenticatedUser) =>
  has(user, PERMISSIONS.FINANCE_PRICING_REVIEW);

export const canManageRetailDiscount = (user: AuthenticatedUser) =>
  has(user, PERMISSIONS.RETAIL_DISCOUNT_MANAGE);

export const canApprovePricingAsManager = (user: AuthenticatedUser) =>
  has(user, PERMISSIONS.PRICING_MANAGER_APPROVE);

export const canPrepareProjectPricing = (user: AuthenticatedUser) =>
  has(user, PERMISSIONS.PROJECT_PRICING_PREPARE);

export const canViewCost = (user: AuthenticatedUser) =>
  has(user, PERMISSIONS.FINANCE_COST_VIEW);

export const canViewMargin = (user: AuthenticatedUser) =>
  has(user, PERMISSIONS.FINANCE_MARGIN_VIEW);

export const canGenerateQuotation = (user: AuthenticatedUser) =>
  has(user, PERMISSIONS.QUOTATION_GENERATE);

export const canSendQuotation = (user: AuthenticatedUser) =>
  has(user, PERMISSIONS.QUOTATION_SEND);
