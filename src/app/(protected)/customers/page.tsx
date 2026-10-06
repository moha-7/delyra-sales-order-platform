import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { StatusPill } from "@/components/crm/status-pill";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import {
  canViewCustomers,
  customerViewWhere,
  opportunityViewWhere,
} from "@/modules/crm/access";
import { enumLabel, formatDateTime } from "@/modules/crm/format";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  if (!canViewCustomers(user)) redirect("/dashboard?error=forbidden");
  const params = await searchParams;
  const query = params.q?.trim() ?? "";

  const filters: Prisma.CustomerWhereInput[] = [
    { archivedAt: null },
    customerViewWhere(user),
  ];
  if (query) {
    filters.push({
      OR: [
        { reference: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
        { mobile: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { erpCustomerCode: { contains: query, mode: "insensitive" } },
      ],
    });
  }

  const customers = await db.customer.findMany({
    where: { AND: filters },
    include: {
      contacts: {
        where: { archivedAt: null },
        select: { id: true, isPrimary: true },
      },
      opportunities: {
        where: opportunityViewWhere(user),
        select: { id: true },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return (
    <div className="content-page">
      <header className="section-header">
        <div>
          <p className="eyebrow">CRM Core</p>
          <h1>Customers</h1>
          <p>Customer records created from qualified lead conversion, with contacts and opportunities.</p>
        </div>
      </header>

      <form className="filter-bar two-column-filter" method="get">
        <input name="q" defaultValue={query} placeholder="Search name, reference, phone, email or ERP code" />
        <button className="secondary-button" type="submit">Search</button>
      </form>

      <section className="data-card">
        <div className="data-card-header">
          <strong>{customers.length} customer{customers.length === 1 ? "" : "s"}</strong>
          <span>Showing up to 100 records</span>
        </div>
        {customers.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Quality</th>
                  <th>Contacts</th>
                  <th>Opportunities</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td><Link href={`/customers/${customer.id}`}>{customer.reference}</Link></td>
                    <td>
                      <strong>{customer.name}</strong>
                      <small>{customer.mobile || customer.email || "No verified contact yet"}</small>
                    </td>
                    <td>{enumLabel(customer.type)}</td>
                    <td><StatusPill value={customer.dataQualityStatus} /></td>
                    <td>{customer.contacts.length}</td>
                    <td>{customer.opportunities.length}</td>
                    <td>{formatDateTime(customer.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">No customers match the search.</div>
        )}
      </section>
    </div>
  );
}
