import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateLeadForm } from "@/components/crm/create-lead-form";
import { requireUser } from "@/lib/auth/dal";
import { canCreateProjectLead, canManageAllLeads } from "@/modules/crm/access";
import { listAssignableOwners } from "@/modules/crm/queries";

export default async function NewProjectLeadPage() {
  const user = await requireUser();
  if (!canCreateProjectLead(user)) redirect("/dashboard?error=forbidden");

  const canAssign = canManageAllLeads(user);
  const owners = canAssign ? await listAssignableOwners() : [];

  return (
    <div className="content-page narrow-page">
      <div className="breadcrumb"><Link href="/leads">Project / Villa Leads</Link><span>/</span><span>New Project</span></div>
      <header className="section-header">
        <div>
          <p className="eyebrow">Projects / Villas</p>
          <h1>New Project / Villa Lead</h1>
          <p>Controlled project flow for BOQ, design, measurement, Finance review and Operations handover.</p>
        </div>
      </header>
      <section className="form-card">
        <CreateLeadForm owners={owners} canAssign={canAssign} mode="project" />
      </section>
    </div>
  );
}
