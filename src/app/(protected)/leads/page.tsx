import Link from "next/link";
import { redirect } from "next/navigation";
import { LeadStatus, OpportunityTrack, type Prisma } from "@/generated/prisma/client";
import { StatusPill } from "@/components/crm/status-pill";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import {
  canCreateLead,
  canViewLeads,
  leadViewWhere,
} from "@/modules/crm/access";
import { enumLabel, formatDateTime } from "@/modules/crm/format";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; track?: string }>;
}) {
  const user = await requireUser();
  if (!canViewLeads(user)) redirect("/dashboard?error=forbidden");

  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const status = Object.values(LeadStatus).includes(params.status as LeadStatus)
    ? (params.status as LeadStatus)
    : undefined;
  const track = Object.values(OpportunityTrack).includes(
    params.track as OpportunityTrack,
  )
    ? (params.track as OpportunityTrack)
    : undefined;

  const filters: Prisma.LeadWhereInput[] = [
    { archivedAt: null },
    leadViewWhere(user),
  ];
  if (status) filters.push({ status });
  if (track) filters.push({ track });
  if (query) {
    filters.push({
      OR: [
        { reference: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
        { mobile: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
      ],
    });
  }

  const leads = await db.lead.findMany({
    where: { AND: filters },
    include: { owner: { select: { displayName: true } } },
    orderBy: [{ nextFollowUpAt: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  return (
    <div className="content-page">
      <header className="section-header">
        <div>
          <p className="eyebrow">CRM Core</p>
          <h1>Leads</h1>
          <p>Capture enquiries, verify contact data, follow up, and convert qualified work.</p>
        </div>
        {canCreateLead(user) ? (
          <Link className="primary-link" href="/leads/new">New lead</Link>
        ) : null}
      </header>

      <form className="filter-bar" method="get">
        <input name="q" defaultValue={query} placeholder="Search name, reference, phone or email" />
        <select name="status" defaultValue={status ?? ""}>
          <option value="">All statuses</option>
          {Object.values(LeadStatus).map((value) => (
            <option value={value} key={value}>{enumLabel(value)}</option>
          ))}
        </select>
        <select name="track" defaultValue={track ?? ""}>
          <option value="">All tracks</option>
          {Object.values(OpportunityTrack).map((value) => (
            <option value={value} key={value}>{enumLabel(value)}</option>
          ))}
        </select>
        <button className="secondary-button" type="submit">Filter</button>
      </form>

      <section className="data-card">
        <div className="data-card-header">
          <strong>{leads.length} lead{leads.length === 1 ? "" : "s"}</strong>
          <span>Showing up to 100 records</span>
        </div>
        {leads.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Lead</th>
                  <th>Status</th>
                  <th>Track</th>
                  <th>Owner</th>
                  <th>Next follow-up</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td><Link href={`/leads/${lead.id}`}>{lead.reference}</Link></td>
                    <td>
                      <strong>{lead.name}</strong>
                      <small>{lead.mobile || lead.email || "Contact needs verification"}</small>
                    </td>
                    <td><StatusPill value={lead.status} /></td>
                    <td>{lead.track ? enumLabel(lead.track) : "—"}</td>
                    <td>{lead.owner.displayName}</td>
                    <td>{formatDateTime(lead.nextFollowUpAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">No leads match the current filters.</div>
        )}
      </section>
    </div>
  );
}
