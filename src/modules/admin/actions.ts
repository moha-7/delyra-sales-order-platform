"use server";

import { revalidatePath } from "next/cache";
import { AuditAction, DataScope, OpportunityTrack, RoleKey, type Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/modules/rbac/permissions";

async function requireRbacAdmin() {
  const user = await requireUser();
  if (!user.permissions.includes(PERMISSIONS.RBAC_ADMIN)) throw new Error("RBAC administration permission is required.");
  return user;
}

export async function updateRolePermissionsAction(formData: FormData) {
  const actor = await requireRbacAdmin();
  const roleId = String(formData.get("roleId") ?? "");
  const permissionIds = formData.getAll("permissionIds").map(String);
  const role = await db.role.findUnique({ where: { id: roleId } });
  if (!role) throw new Error("Role not found.");

  if (role.key === RoleKey.SYSTEM_ADMIN) {
    const required = await db.permission.findMany({ where: { key: { in: [PERMISSIONS.SYSTEM_ADMIN, PERMISSIONS.RBAC_ADMIN] } }, select: { id: true } });
    for (const permission of required) if (!permissionIds.includes(permission.id)) permissionIds.push(permission.id);
  }

  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.rolePermission.deleteMany({ where: { roleId } });
    if (permissionIds.length) await tx.rolePermission.createMany({ data: permissionIds.map((permissionId) => ({ roleId, permissionId, allowed: true })) });
    await tx.auditLog.create({ data: { actorId: actor.id, action: AuditAction.ROLE_CHANGE, entityType: "Role", entityId: roleId, after: { permissionIds } } });
  });
  revalidatePath("/admin");
}

export async function updateUserAccessAction(formData: FormData) {
  const actor = await requireRbacAdmin();
  const userId = String(formData.get("userId") ?? "");
  const dataScope = String(formData.get("dataScope") ?? "") as DataScope;
  const roleIds = formData.getAll("roleIds").map(String);
  if (!Object.values(DataScope).includes(dataScope)) throw new Error("Invalid data scope.");
  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.user.update({ where: { id: userId }, data: { dataScope, sessionVersion: { increment: 1 } } });
    await tx.userRole.deleteMany({ where: { userId } });
    if (roleIds.length) await tx.userRole.createMany({ data: roleIds.map((roleId) => ({ userId, roleId })) });
    await tx.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: AuditAction.ROLE_CHANGE, entityType: "User", entityId: userId, after: { roleIds, dataScope } } });
  });
  revalidatePath("/admin");
}

export async function createChecklistDefinitionAction(formData: FormData) {
  const actor = await requireUser();
  if (!actor.permissions.includes(PERMISSIONS.CHECKLIST_ADMIN)) throw new Error("Checklist administration permission is required.");
  const key = String(formData.get("key") ?? "").trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
  const label = String(formData.get("label") ?? "").trim();
  const section = String(formData.get("section") ?? "").trim();
  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  const required = formData.get("required") === "on";
  const roleValue = String(formData.get("responsibleRole") ?? "");
  const trackValue = String(formData.get("track") ?? "");
  const responsibleRole = roleValue && Object.values(RoleKey).includes(roleValue as RoleKey) ? roleValue as RoleKey : null;
  const track = trackValue && Object.values(OpportunityTrack).includes(trackValue as OpportunityTrack) ? trackValue as OpportunityTrack : null;
  if (!key || !label || !section) throw new Error("Checklist key, section, and label are required.");
  const definition = await db.checklistDefinition.create({
    data: { key, section, label, track, responsibleRole, required, sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0 },
  });
  await db.auditLog.create({ data: { actorId: actor.id, action: AuditAction.CREATE, entityType: "ChecklistDefinition", entityId: definition.id, after: { key, section, label, track, responsibleRole, required, sortOrder } } });
  revalidatePath("/admin");
}

export async function updateChecklistDefinitionAction(formData: FormData) {
  const actor = await requireUser();
  if (!actor.permissions.includes(PERMISSIONS.CHECKLIST_ADMIN)) throw new Error("Checklist administration permission is required.");
  const id = String(formData.get("id") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const section = String(formData.get("section") ?? "").trim();
  const required = formData.get("required") === "on";
  const isActive = formData.get("isActive") === "on";
  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  const responsibleRoleValue = String(formData.get("responsibleRole") ?? "");
  const trackValue = String(formData.get("track") ?? "");
  const responsibleRole = responsibleRoleValue && Object.values(RoleKey).includes(responsibleRoleValue as RoleKey) ? responsibleRoleValue as RoleKey : null;
  const track = trackValue && Object.values(OpportunityTrack).includes(trackValue as OpportunityTrack) ? trackValue as OpportunityTrack : null;
  if (!label || !section) throw new Error("Checklist label and section are required.");
  await db.checklistDefinition.update({ where: { id }, data: { label, section, required, isActive, responsibleRole, track, sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0 } });
  await db.auditLog.create({ data: { actorId: actor.id, action: AuditAction.UPDATE, entityType: "ChecklistDefinition", entityId: id, after: { label, section, required, isActive, responsibleRole, track, sortOrder } } });
  revalidatePath("/admin");
}

export async function updateWorkflowSettingsAction(formData: FormData) {
  const actor = await requireUser();
  if (!actor.permissions.includes(PERMISSIONS.APPROVAL_SETTINGS_ADMIN)) throw new Error("Workflow settings permission is required.");
  const defaultCostingRateEurAed = String(formData.get("defaultCostingRateEurAed") ?? "4.25");
  const kitchenSellingRate = String(formData.get("kitchenSellingRate") ?? "6.75");
  const hlpSellingRate = String(formData.get("hlpSellingRate") ?? "6.25");
  const hlpDiscountPct = String(formData.get("hlpDiscountPct") ?? "25");
  const defaultAppliancesMarkupPct = String(formData.get("defaultAppliancesMarkupPct") ?? "10");
  const customsPct = String(formData.get("customsPct") ?? "4");
  const defaultClearanceAed = String(formData.get("defaultClearanceAed") ?? "2500");
  const validityDays = Number(formData.get("validityDays") ?? 30);
  const paymentTerms = String(formData.get("paymentTerms") ?? "").trim();
  const managerFinalApprovalRequired = formData.get("managerFinalApprovalRequired") === "on";
  const managerApprovesAnyCustomerDiscount = formData.get("managerApprovesAnyCustomerDiscount") === "on";
  const numericValues = [defaultCostingRateEurAed, kitchenSellingRate, hlpSellingRate, hlpDiscountPct, defaultAppliancesMarkupPct, customsPct, defaultClearanceAed];
  if (numericValues.some((item) => !/^\d+(?:\.\d{1,6})?$/.test(item))) throw new Error("Invalid numeric settings.");

  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.systemSetting.upsert({
      where: { key: "retail.pricing.v3" },
      create: { key: "retail.pricing.v3", value: { formulaVersion: "DEMO_PRICING_V1", supplierPointFactorReference: "6.75", defaultCostingRateEurAed, kitchenSellingRate, hlpSellingRate, kitchenDiscountCascadePct: ["40", "5", "3"], hlpDiscountPct, defaultAppliancesMarkupPct, customsPct, defaultClearanceAed, vatCalculatedByCrm: false } },
      update: { value: { formulaVersion: "DEMO_PRICING_V1", supplierPointFactorReference: "6.75", defaultCostingRateEurAed, kitchenSellingRate, hlpSellingRate, kitchenDiscountCascadePct: ["40", "5", "3"], hlpDiscountPct, defaultAppliancesMarkupPct, customsPct, defaultClearanceAed, vatCalculatedByCrm: false } },
    });
    await tx.systemSetting.upsert({
      where: { key: "quotation.defaults" },
      create: { key: "quotation.defaults", value: { validityDays, paymentTerms, showVat: false } },
      update: { value: { validityDays, paymentTerms, showVat: false } },
    });
    await tx.systemSetting.upsert({
      where: { key: "approval.workflow" },
      create: { key: "approval.workflow", value: { financePreparesRetail: true, financePreparesProject: true, managerFinalApprovalRequired, managerApprovesAnyCustomerDiscount } },
      update: { value: { financePreparesRetail: true, financePreparesProject: true, managerFinalApprovalRequired, managerApprovesAnyCustomerDiscount } },
    });
    await tx.auditLog.create({ data: { actorId: actor.id, action: AuditAction.UPDATE, entityType: "SystemSetting", entityId: "workflow", after: { defaultCostingRateEurAed, kitchenSellingRate, hlpSellingRate, hlpDiscountPct, defaultAppliancesMarkupPct, customsPct, defaultClearanceAed, validityDays, paymentTerms, managerFinalApprovalRequired, managerApprovesAnyCustomerDiscount } } });
  });
  revalidatePath("/admin");
}
