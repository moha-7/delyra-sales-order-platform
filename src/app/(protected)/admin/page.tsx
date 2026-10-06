import { redirect } from "next/navigation";
import { DataScope, OpportunityTrack, RoleKey } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import {
  createChecklistDefinitionAction,
  updateChecklistDefinitionAction,
  updateRolePermissionsAction,
  updateUserAccessAction,
  updateWorkflowSettingsAction,
} from "@/modules/admin/actions";
import { PERMISSIONS } from "@/modules/rbac/permissions";

function settingObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export default async function AdminPage() {
  const user = await requireUser();
  if (!user.permissions.includes(PERMISSIONS.SYSTEM_ADMIN)) redirect("/dashboard?error=forbidden");
  const [roles, permissions, users, checklist, retailSetting, quotationSetting, approvalSetting] = await Promise.all([
    db.role.findMany({ include: { permissions: true }, orderBy: { name: "asc" } }),
    db.permission.findMany({ orderBy: [{ category: "asc" }, { key: "asc" }] }),
    db.user.findMany({ where: { archivedAt: null }, include: { userRoles: true }, orderBy: { displayName: "asc" } }),
    db.checklistDefinition.findMany({ orderBy: [{ sortOrder: "asc" }, { label: "asc" }] }),
    db.systemSetting.findUnique({ where: { key: "retail.pricing.v3" } }),
    db.systemSetting.findUnique({ where: { key: "quotation.defaults" } }),
    db.systemSetting.findUnique({ where: { key: "approval.workflow" } }),
  ]);
  const retail = settingObject(retailSetting?.value);
  const quotation = settingObject(quotationSetting?.value);
  const approval = settingObject(approvalSetting?.value);

  return <div className="content-page admin-page">
    <header className="section-header"><div><p className="eyebrow">Administration</p><h1>Permissions and workflow settings</h1><p>Changes are effective from the next request; user access changes revoke current sessions.</p></div></header>

    <section className="form-card"><div className="card-heading"><div><h2>User roles and scope</h2></div></div><div className="admin-grid">
      {users.map((record) => <form action={updateUserAccessAction} className="admin-card" key={record.id}>
        <input type="hidden" name="userId" value={record.id} /><strong>{record.displayName}</strong><small>{record.email}</small>
        <label><span>Data scope</span><select name="dataScope" defaultValue={record.dataScope}>{Object.values(DataScope).map((scope) => <option key={scope}>{scope}</option>)}</select></label>
        <fieldset><legend>Roles</legend>{roles.map((role) => <label className="check-label" key={role.id}><input type="checkbox" name="roleIds" value={role.id} defaultChecked={record.userRoles.some((item) => item.roleId === role.id)} />{role.name}</label>)}</fieldset>
        <button className="primary-button" type="submit">Save user access</button>
      </form>)}
    </div></section>

    <section className="form-card"><div className="card-heading"><div><h2>Role permission matrix</h2></div></div><div className="admin-grid wide-admin-grid">
      {roles.map((role) => <form action={updateRolePermissionsAction} className="admin-card" key={role.id}><input type="hidden" name="roleId" value={role.id} /><h3>{role.name}</h3>{permissions.map((permission) => <label className="check-label" key={permission.id}><input type="checkbox" name="permissionIds" value={permission.id} defaultChecked={role.permissions.some((item) => item.permissionId === permission.id && item.allowed)} /><span><strong>{permission.key}</strong><small>{permission.description}</small></span></label>)}<button className="primary-button" type="submit">Save role permissions</button></form>)}
    </div></section>

    <section className="form-card"><div className="card-heading"><div><h2>Pricing and quotation defaults</h2></div></div><form action={updateWorkflowSettingsAction} className="record-form compact-form">
      <label><span>Finance material cost rate EUR→AED</span><input name="defaultCostingRateEurAed" defaultValue={String(retail.defaultCostingRateEurAed ?? "4.25")} /></label>
      <label><span>Kitchen selling rate</span><input name="kitchenSellingRate" defaultValue={String(retail.kitchenSellingRate ?? "6.75")} /></label>
      <label><span>HLP selling rate</span><input name="hlpSellingRate" defaultValue={String(retail.hlpSellingRate ?? "6.25")} /></label>
      <label><span>HLP discount %</span><input name="hlpDiscountPct" defaultValue={String(retail.hlpDiscountPct ?? "25")} /></label>
      <label><span>Appliance markup %</span><input name="defaultAppliancesMarkupPct" defaultValue={String(retail.defaultAppliancesMarkupPct ?? "10")} /></label>
      <label><span>Customs %</span><input name="customsPct" defaultValue={String(retail.customsPct ?? "4")} /></label>
      <label><span>Default clearance AED</span><input name="defaultClearanceAed" defaultValue={String(retail.defaultClearanceAed ?? "2500")} /></label>
      <label><span>Quotation validity days</span><input name="validityDays" type="number" min="1" defaultValue={Number(quotation.validityDays ?? 30)} /></label>
      <label className="form-wide"><span>Default payment terms</span><textarea name="paymentTerms" rows={3} defaultValue={String(quotation.paymentTerms ?? "30% deposit with order.")} /></label>
      <label className="check-label"><input type="checkbox" name="managerFinalApprovalRequired" defaultChecked={Boolean(approval.managerFinalApprovalRequired ?? true)} />Branch Manager final approval is required</label>
      <label className="check-label"><input type="checkbox" name="managerApprovesAnyCustomerDiscount" defaultChecked={Boolean(approval.managerApprovesAnyCustomerDiscount ?? true)} />Branch Manager controls Retail discount percentage</label>
      <div className="form-wide form-actions"><button className="primary-button" type="submit">Save workflow settings</button></div>
    </form></section>

    <section className="form-card"><div className="card-heading"><div><h2>Digital checklist definitions</h2><p>Automatic items are calculated from CRM data; manual items are completed by the responsible role.</p></div></div>
      <form action={createChecklistDefinitionAction} className="record-form compact-form checklist-create-form">
        <label><span>Key</span><input name="key" placeholder="design.client-signoff" required /></label>
        <label><span>Section</span><input name="section" placeholder="Design Package" required /></label>
        <label className="form-wide"><span>Checklist label</span><input name="label" required /></label>
        <label><span>Track</span><select name="track"><option value="">Retail and Project</option>{Object.values(OpportunityTrack).map((track) => <option key={track}>{track}</option>)}</select></label>
        <label><span>Responsible role</span><select name="responsibleRole"><option value="">Any permitted role</option>{Object.values(RoleKey).map((role) => <option key={role}>{role}</option>)}</select></label>
        <label><span>Sort order</span><input name="sortOrder" type="number" defaultValue="900" /></label>
        <label className="check-label"><input type="checkbox" name="required" defaultChecked />Required</label>
        <div className="form-wide form-actions"><button className="primary-button" type="submit">Add manual checklist item</button></div>
      </form>
      <div className="checklist-admin-list">
      {checklist.map((item) => <form action={updateChecklistDefinitionAction} className="checklist-admin-row" key={item.id}><input type="hidden" name="id" value={item.id} /><input name="section" defaultValue={item.section} /><input name="label" defaultValue={item.label} /><select name="track" defaultValue={item.track ?? ""}><option value="">All tracks</option>{Object.values(OpportunityTrack).map((track) => <option key={track}>{track}</option>)}</select><select name="responsibleRole" defaultValue={item.responsibleRole ?? ""}><option value="">Any permitted role</option>{Object.values(RoleKey).map((role) => <option key={role}>{role}</option>)}</select><input name="sortOrder" type="number" defaultValue={item.sortOrder} /><label className="check-label"><input type="checkbox" name="required" defaultChecked={item.required} />Required</label><label className="check-label"><input type="checkbox" name="isActive" defaultChecked={item.isActive} />Active</label><button className="secondary-button" type="submit">Save</button></form>)}
    </div></section>
  </div>;
}
