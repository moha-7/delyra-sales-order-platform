import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LeadStatus } from "@/generated/prisma/client";
import { ConvertLeadForm } from "@/components/crm/convert-lead-form";
import { EditLeadForm } from "@/components/crm/edit-lead-form";
import { StatusPill } from "@/components/crm/status-pill";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import {
  canConvertLead,
  canManageAllLeads,
  canManageOwnLeads,
  canViewLeads,
  leadViewWhere,
} from "@/modules/crm/access";
import { enumLabel, formatDateTime } from "@/modules/crm/format";
import { listAssignableOwners } from "@/modules/crm/queries";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const user = await requireUser();
  if (!canViewLeads(user)) redirect("/dashboard?error=forbidden");
  const { leadId } = await params;

  const lead = await db.lead.findFirst({
    where: { AND: [{ id: leadId, archivedAt: null }, leadViewWhere(user)] },
    include: {
      owner: { select: { displayName: true } },
      convertedCustomer: { select: { id: true, reference: true, name: true } },
      convertedOpportunity: { select: { id: true, reference: true, title: true } },
    },
  });
  if (!lead) notFound();

  const canAssign = canManageAllLeads(user);
  const canEdit =
    lead.status !== LeadStatus.CONVERTED &&
    (canAssign || (canManageOwnLeads(user) && lead.ownerId === user.id));
  const canConvert =
    canEdit && canConvertLead(user) && lead.status === LeadStatus.QUALIFIED;
  const owners = canAssign ? await listAssignableOwners() : [];

  return (
    <div className="content-page">
      <div className="breadcrumb"><Link href="/leads">Leads</Link><span>/</span><span>{lead.reference}</span></div>
      <header className="section-header">
        <div>
          <p className="eyebrow">{lead.reference}</p>
          <h1>{lead.name}</h1>
          <p>Owned by {lead.owner.displayName} · Created {formatDateTime(lead.createdAt)}</p>
        </div>
        <div className="header-badges">
          <StatusPill value={lead.status} />
          <StatusPill value={lead.dataQualityStatus} />
        </div>
      </header>

      {lead.status === LeadStatus.CONVERTED ? (
        <section className="success-card">
          <div>
            <strong>Lead converted successfully</strong>
            <p>The source lead is locked and preserved for audit.</p>
          </div>
          <div className="link-row">
            {lead.convertedCustomer ? (
              <Link href={`/customers/${lead.convertedCustomer.id}`}>
                {lead.convertedCustomer.reference} · {lead.convertedCustomer.name}
              </Link>
            ) : null}
            {lead.convertedOpportunity ? (
              <Link href={`/opportunities/${lead.convertedOpportunity.id}`}>
                {lead.convertedOpportunity.reference} · {lead.convertedOpportunity.title}
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="detail-grid">
        <article className="detail-card">
          <h2>Lead details</h2>
          <dl className="detail-list">
            <div><dt>Mobile</dt><dd>{lead.mobile ?? "—"}</dd></div>
            <div><dt>Email</dt><dd>{lead.email ?? "—"}</dd></div>
            <div><dt>Track</dt><dd>{lead.track ? enumLabel(lead.track) : "—"}</dd></div>
            <div><dt>Source</dt><dd>{lead.source ?? "—"}</dd></div>
            <div><dt>Channel</dt><dd>{lead.channel ?? "—"}</dd></div>
            <div><dt>Campaign</dt><dd>{lead.campaign ?? "—"}</dd></div>
            <div><dt>Interest</dt><dd>{lead.interestCategory ?? "—"}</dd></div>
            <div><dt>Next follow-up</dt><dd>{formatDateTime(lead.nextFollowUpAt)}</dd></div>
          </dl>
          {lead.notes ? <div className="long-text"><strong>Notes</strong><p>{lead.notes}</p></div> : null}
        </article>

        <article className="detail-card">
          <h2>Data quality</h2>
          <p>
            Missing contact information is never fabricated. It remains empty until a team member verifies it.
          </p>
          <StatusPill value={lead.dataQualityStatus} />
        </article>
      </section>

      {canEdit ? (
        <details className="form-card collapsible-card">
          <summary>Edit lead</summary>
          <EditLeadForm
            lead={{
              id: lead.id,
              name: lead.name,
              mobile: lead.mobile,
              email: lead.email,
              track: lead.track,
              status: lead.status,
              source: lead.source,
              channel: lead.channel,
              campaign: lead.campaign,
              interestCategory: lead.interestCategory,
              notes: lead.notes,
              nextFollowUpAt: lead.nextFollowUpAt?.toISOString() ?? null,
              ownerId: lead.ownerId,
            }}
            owners={owners}
            canAssign={canAssign}
          />
        </details>
      ) : null}

      {canConvert ? (
        <section className="form-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Atomic workflow</p>
              <h2>Convert to customer and opportunity</h2>
            </div>
          </div>
          <ConvertLeadForm
            leadId={lead.id}
            leadName={lead.name}
            currentOwnerId={lead.ownerId}
            defaultTrack={lead.track}
            nextFollowUpAt={lead.nextFollowUpAt?.toISOString() ?? null}
            owners={owners}
            canAssign={canAssign}
          />
        </section>
      ) : null}
    </div>
  );
}
