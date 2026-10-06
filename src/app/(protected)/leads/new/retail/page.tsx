import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateLeadForm } from "@/components/crm/create-lead-form";
import { requireUser } from "@/lib/auth/dal";
import { canCreateRetailLead, canManageAllLeads } from "@/modules/crm/access";
import { listAssignableOwners } from "@/modules/crm/queries";

export default async function NewRetailLeadPage() {
  const user = await requireUser();
  if (!canCreateRetailLead(user)) redirect("/dashboard?error=forbidden");

  const canAssign = canManageAllLeads(user);
  const owners = canAssign ? await listAssignableOwners() : [];

  return (
    <div className="content-page narrow-page">
      <div className="breadcrumb"><Link href="/leads">Retail Leads</Link><span>/</span><span>New Retail</span></div>
      <header className="section-header">
        <div>
          <p className="eyebrow">Retail enquiry</p>
          <h1>New Retail Lead</h1>
          <p>Fast showroom/follow-up flow. Retail is fixed automatically from your role and workspace.</p>
        </div>
      </header>
      <section className="form-card">
        <CreateLeadForm owners={owners} canAssign={canAssign} mode="retail" />
      </section>
    </div>
  );
}
