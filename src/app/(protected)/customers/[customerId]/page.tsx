import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AddContactForm } from "@/components/crm/add-contact-form";
import { StatusPill } from "@/components/crm/status-pill";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import {
  canManageCustomers,
  canViewCustomers,
  canViewLeads,
  customerViewWhere,
  opportunityViewWhere,
} from "@/modules/crm/access";
import { enumLabel, formatDateTime, formatMoney } from "@/modules/crm/format";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const user = await requireUser();
  if (!canViewCustomers(user)) redirect("/dashboard?error=forbidden");
  const { customerId } = await params;

  const customer = await db.customer.findFirst({
    where: {
      AND: [{ id: customerId, archivedAt: null }, customerViewWhere(user)],
    },
    include: {
      contacts: {
        where: { archivedAt: null },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      },
      opportunities: {
        where: { AND: [{ archivedAt: null }, opportunityViewWhere(user)] },
        include: { owner: { select: { displayName: true } } },
        orderBy: { updatedAt: "desc" },
      },
      sourceLead: { select: { id: true, reference: true } },
    },
  });
  if (!customer) notFound();

  return (
    <div className="content-page">
      <div className="breadcrumb"><Link href="/customers">Customers</Link><span>/</span><span>{customer.reference}</span></div>
      <header className="section-header">
        <div>
          <p className="eyebrow">{customer.reference}</p>
          <h1>{customer.name}</h1>
          <p>{enumLabel(customer.type)} · Created {formatDateTime(customer.createdAt)}</p>
        </div>
        <StatusPill value={customer.dataQualityStatus} />
      </header>

      <section className="detail-grid">
        <article className="detail-card">
          <h2>Customer record</h2>
          <dl className="detail-list">
            <div><dt>Mobile</dt><dd>{customer.mobile ?? "—"}</dd></div>
            <div><dt>Email</dt><dd>{customer.email ?? "—"}</dd></div>
            <div><dt>ERP code</dt><dd>{customer.erpCustomerCode ?? "—"}</dd></div>
            <div><dt>Legacy reference</dt><dd>{customer.legacyReference ?? "—"}</dd></div>
            <div>
              <dt>Source lead</dt>
              <dd>
                {customer.sourceLead ? (
                  canViewLeads(user) ? (
                    <Link href={`/leads/${customer.sourceLead.id}`}>{customer.sourceLead.reference}</Link>
                  ) : customer.sourceLead.reference
                ) : "—"}
              </dd>
            </div>
          </dl>
        </article>

        <article className="detail-card">
          <h2>Contacts</h2>
          {customer.contacts.length ? (
            <div className="stack-list">
              {customer.contacts.map((contact) => (
                <div className="stack-item" key={contact.id}>
                  <div>
                    <strong>{contact.name}</strong>
                    <small>{contact.roleTitle ?? "Contact"}</small>
                  </div>
                  <div className="stack-meta">
                    {contact.isPrimary ? <StatusPill value="PRIMARY" /> : null}
                    <span>{contact.mobile ?? contact.email ?? "No contact detail"}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No contacts added yet.</p>
          )}
        </article>
      </section>

      {canManageCustomers(user) ? (
        <details className="form-card collapsible-card">
          <summary>Add contact</summary>
          <AddContactForm customerId={customer.id} />
        </details>
      ) : null}

      <section className="data-card">
        <div className="data-card-header">
          <strong>Opportunities</strong>
          <span>{customer.opportunities.length} linked</span>
        </div>
        {customer.opportunities.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Title</th>
                  <th>Track</th>
                  <th>Stage</th>
                  <th>Owner</th>
                  <th>Customer budget</th>
                </tr>
              </thead>
              <tbody>
                {customer.opportunities.map((opportunity) => (
                  <tr key={opportunity.id}>
                    <td><Link href={`/opportunities/${opportunity.id}`}>{opportunity.reference}</Link></td>
                    <td>{opportunity.title}</td>
                    <td>{enumLabel(opportunity.track)}</td>
                    <td><StatusPill value={opportunity.stage} /></td>
                    <td>{opportunity.owner.displayName}</td>
                    <td>{formatMoney(opportunity.customerBudgetAed, opportunity.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">No opportunities linked to this customer.</div>
        )}
      </section>
    </div>
  );
}
