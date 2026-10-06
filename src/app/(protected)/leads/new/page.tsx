import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import {
  canCreateLead,
  canCreateProjectLead,
  canCreateRetailLead,
} from "@/modules/crm/access";

export default async function NewLeadRouterPage() {
  const user = await requireUser();
  if (!canCreateLead(user)) redirect("/dashboard?error=forbidden");

  const canRetail = canCreateRetailLead(user);
  const canProject = canCreateProjectLead(user);

  if (canRetail && !canProject) redirect("/leads/new/retail");
  if (canProject && !canRetail) redirect("/leads/new/project");
  if (!canRetail && !canProject) redirect("/dashboard?error=forbidden");

  return (
    <div className="content-page narrow-page">
      <div className="breadcrumb"><Link href="/leads">Leads</Link><span>/</span><span>New</span></div>
      <header className="section-header">
        <div>
          <p className="eyebrow">Create enquiry</p>
          <h1>Choose the correct workspace</h1>
          <p>Retail and Projects/Villas are separated. The selected workspace fixes the track automatically and opens the correct fields.</p>
        </div>
      </header>
      <section className="lead-choice-grid">
        <Link className="lead-choice-card" href="/leads/new/retail">
          <span>Retail</span>
          <strong>Retail Enquiry</strong>
          <p>Showroom / individual customer / fast quotation / follow-up / deposit.</p>
        </Link>
        <Link className="lead-choice-card" href="/leads/new/project">
          <span>Projects / Villas</span>
          <strong>Project / Villa Enquiry</strong>
          <p>Villa, contractor, consultant, BOQ, measurements, design and controlled finance review.</p>
        </Link>
      </section>
    </div>
  );
}
