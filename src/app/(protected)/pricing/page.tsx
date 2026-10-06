import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { opportunityViewWhere } from "@/modules/crm/access";
import { enumLabel, formatMoney } from "@/modules/crm/format";
import { canViewPricing, canViewCost, canViewMargin } from "@/modules/pricing/access";
import { StatusPill } from "@/components/crm/status-pill";

export default async function PricingPage() {
  const user = await requireUser();
  if (!canViewPricing(user)) redirect("/dashboard?error=forbidden");

  const opportunities = await db.opportunity.findMany({
    where: {
      AND: [
        { archivedAt: null },
        opportunityViewWhere(user),
      ],
    },
    include: {
      customer: { select: { name: true } },
      owner: { select: { displayName: true } },
      pricingCases: {
        where: { status: { not: "SUPERSEDED" } },
        orderBy: { revision: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  const showCost = canViewCost(user);
  const showMargin = canViewMargin(user);

  return (
    <div className="content-page">
      <header className="section-header">
        <div>
          <p className="eyebrow">Pricing work queue</p>
          <h1>Pricing</h1>
          <p>Designers submit Design values and files. Finance prepares Retail pricing or uploads the Project costing Excel, then the configured approval workflow locks the final price.</p>
        </div>
      </header>

      <section className="data-card">
        <div className="data-card-header">
          <strong>{opportunities.length} opportunities</strong>
          <span>VAT is handled outside the CRM</span>
        </div>
        {opportunities.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Customer / Opportunity</th>
                  <th>Track</th>
                  <th>Owner</th>
                  <th>Pricing status</th>
                  <th>Selling price</th>
                  {showCost ? <th>Cost</th> : null}
                  {showMargin ? <th>Margin</th> : null}
                </tr>
              </thead>
              <tbody>
                {opportunities.map((opportunity) => {
                  const pricing = opportunity.pricingCases[0];
                  return (
                    <tr key={opportunity.id}>
                      <td><Link href={`/opportunities/${opportunity.id}`}>{opportunity.reference}</Link></td>
                      <td><strong>{opportunity.customer.name}</strong><small>{opportunity.title}</small></td>
                      <td>{enumLabel(opportunity.track)}</td>
                      <td>{opportunity.owner.displayName}</td>
                      <td>{pricing ? <StatusPill value={pricing.status} /> : <span>Not started</span>}</td>
                      <td>{formatMoney(pricing?.approvedSellingPrice, "AED")}</td>
                      {showCost ? <td>{formatMoney(pricing?.estimatedCost, "AED")}</td> : null}
                      {showMargin ? <td>{pricing?.grossMarginPct?.toString() ?? "—"}%</td> : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <div className="empty-state">No opportunities are visible in your scope.</div>}
      </section>
    </div>
  );
}
