import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintQuotationButton } from "@/components/quotations/print-button";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { opportunityViewWhere } from "@/modules/crm/access";
import { formatDateTime } from "@/modules/crm/format";
import { canSendQuotation } from "@/modules/pricing/access";
import { markQuotationSentAction } from "@/modules/quotations/actions";

type QuoteItem = {
  pos: string;
  quantity: string;
  unit?: string;
  code: string;
  hinges?: string;
  description: string;
  veneer?: string;
  amount: string;
  section?: string;
};

type PaymentLine = {
  paymentType: string;
  dueOn?: string | null;
  amount: string;
  currency?: string;
};

type QuotationSnapshot = {
  template?: string;
  quotationReference?: string;
  opportunityReference?: string;
  customer?: { name?: string; primaryContact?: string | null; mobile?: string | null; email?: string | null; address?: string | null };
  sales?: { name?: string; email?: string; initials?: string | null };
  scope?: string | null;
  specs?: Record<string, string | null | undefined>;
  items?: QuoteItem[];
  summary?: {
    furniture?: string;
    tradeGoods?: string;
    totalExclGst?: string;
    gstPct?: string;
    gstAmount?: string;
    totalInclGst?: string;
    currency?: string;
  };
  paymentCalendar?: PaymentLine[];
  bankDetails?: { registrationNumber?: string; bank?: string; branchCode?: string; bankAccount?: string };
};

function money(value: string | number | null | undefined, currency = "AED") {
  const number = Number(value ?? 0);
  const symbol = currency === "EUR" ? "€" : currency;
  return `${symbol} ${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number.isFinite(number) ? number : 0)}`;
}

function rowsByPage(items: QuoteItem[], size = 12): QuoteItem[][] {
  const pages: QuoteItem[][] = [];
  for (let index = 0; index < items.length; index += size) {
    pages.push(items.slice(index, index + size));
  }
  return pages.length ? pages : [[]];
}

function SpecsBlock({ specs }: { specs: QuotationSnapshot["specs"] }) {
  const rows = [
    ["Kitchens", specs?.kitchens ?? "233 CERES"],
    ["Front finish", specs?.frontFinish ?? "K Laminate"],
    ["Front colour", specs?.frontColour ?? "126 cashmere"],
    ["Carcase colour interior", specs?.carcaseColourInterior ?? "273 platinum"],
    ["Visible sides colour", specs?.visibleSidesColour ?? "345v mountain robinia"],
    ["Handle variation", specs?.handleVariation ?? "999 no handle"],
    ["Plinth height", specs?.plinthHeight ?? "140.00"],
    ["Height", specs?.height ?? "910.00"],
  ];
  return <dl className="design-spec-grid">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

function QuoteTable({ items }: { items: QuoteItem[] }) {
  return (
    <table className="design-quote-table">
      <thead>
        <tr>
          <th>Pos</th>
          <th>Quantity</th>
          <th>Code</th>
          <th>Hinges</th>
          <th>Description</th>
          <th>Veneer</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={`${item.pos}-${item.code}-${item.description}`}>
            <td>{item.pos}</td>
            <td>{item.quantity} {item.unit ?? ""}</td>
            <td>{item.code}</td>
            <td>{item.hinges ?? ""}</td>
            <td className="design-description">{item.description}</td>
            <td>{item.veneer ?? ""}</td>
            <td>{money(item.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Footer({ reference, page, totalPages }: { reference: string; page: number; totalPages: number }) {
  return <footer className="design-page-footer"><span>Project {reference}</span><span>Generated with Delyra</span><strong>Page {page} of {totalPages}</strong></footer>;
}

export default async function QuotationPreviewPage({ params, searchParams }: { params: Promise<{ quotationId: string }>; searchParams: Promise<{ version?: string }> }) {
  const user = await requireUser();
  const { quotationId } = await params;
  const query = await searchParams;
  const quotation = await db.quotation.findFirst({
    where: {
      id: quotationId,
      opportunity: { is: opportunityViewWhere(user) },
    },
    include: {
      opportunity: { include: { customer: true, owner: true } },
      versions: { orderBy: { versionNo: "desc" } },
    },
  });
  if (!quotation) notFound();
  const version = query.version ? quotation.versions.find((item) => item.id === query.version) : quotation.versions[0];
  if (!version) notFound();
  const snapshot = (version.contentSnapshot ?? {}) as QuotationSnapshot;
  const items = snapshot.items?.length ? snapshot.items : [{ pos: "1", quantity: "1.00", unit: "lot", code: "DESIGN", description: "Kitchen package as per approved design and scope", amount: version.preVatAmount.toString(), section: "Furniture" }];
  const itemPages = rowsByPage(items);
  const totalPages = 2 + itemPages.length;
  const reference = snapshot.opportunityReference ?? quotation.opportunity.reference;
  const customer = snapshot.customer;
  const sales = snapshot.sales;
  const summary = snapshot.summary ?? { furniture: version.preVatAmount.toString(), tradeGoods: "0.00", totalExclGst: version.preVatAmount.toString(), gstPct: "0.0", gstAmount: "0.00", totalInclGst: version.preVatAmount.toString(), currency: "AED" };
  const payments = snapshot.paymentCalendar?.length ? snapshot.paymentCalendar : [{ paymentType: "Invoice due date", dueOn: null, amount: version.preVatAmount.toString(), currency: "AED" }];

  return <div className="quotation-preview-page design-preview-page">
    <div className="preview-toolbar no-print">
      <Link href={`/opportunities/${quotation.opportunityId}`}>← Opportunity</Link>
      <PrintQuotationButton />
      {canSendQuotation(user) && version.status === "DRAFT" ? <form action={markQuotationSentAction}><input type="hidden" name="quotationId" value={quotation.id} /><input type="hidden" name="versionId" value={version.id} /><button className="primary-button" type="submit">Mark as sent</button></form> : null}
    </div>

    <article className="design-paper">
      <section className="design-page design-cover-page">
        <div className="design-brand">NORTHSTAR</div>
        <SpecsBlock specs={snapshot.specs} />
        <div className="design-cover-meta">
          <div>
            <strong>Quotation No:</strong> {quotation.businessReference}<br />
            <strong>Alternative:</strong> AB<br />
            <strong>Quotation date:</strong> {formatDateTime(version.createdAt)}<br />
            <strong>Valid until:</strong> {version.validUntil ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(version.validUntil) : "—"}
          </div>
          <div>
            <strong>Salesperson</strong><br />
            {sales?.name ?? quotation.opportunity.owner.displayName}<br />
            {sales?.email ?? quotation.opportunity.owner.email}
          </div>
          <div>
            <strong>Customer</strong><br />
            {customer?.primaryContact ?? customer?.name ?? quotation.opportunity.customer.name}<br />
            {customer?.mobile ?? ""}<br />
            {customer?.email ?? ""}
          </div>
        </div>
        <h1 className="design-title">Q U O T A T I O N</h1>
        <Footer reference={reference} page={1} totalPages={totalPages} />
      </section>

      {itemPages.map((pageItems, index) => (
        <section className="design-page" key={index}>
          <div className="design-running-header">
            <div>
              <span className="design-running-title">QUOTATION</span>
              <small>{quotation.businessReference}</small>
            </div>
            <div className="design-running-meta">
              <small>Project {reference}</small>
              <small>Page {index + 2} of {totalPages}</small>
            </div>
          </div>
          {index === 0 ? <h2>Furniture</h2> : null}
          <QuoteTable items={pageItems} />
          <Footer reference={reference} page={index + 2} totalPages={totalPages} />
        </section>
      ))}

      <section className="design-page design-summary-page">
        <div className="design-running-header">
          <div>
            <span className="design-running-title">QUOTATION</span>
            <small>{quotation.businessReference}</small>
          </div>
          <div className="design-running-meta">
            <small>Project {reference}</small>
            <small>Page {totalPages} of {totalPages}</small>
          </div>
        </div>
        <h2>Summary</h2>
        <table className="design-summary-table">
          <tbody>
            <tr><td>Furniture</td><td>{money(summary.furniture, summary.currency)}</td></tr>
            <tr><td>Trade goods</td><td>{money(summary.tradeGoods, summary.currency)}</td></tr>
            <tr className="strong-row"><td>Total excl. VAT</td><td>{money(summary.totalExclGst, summary.currency)}</td></tr>
            <tr><td>+ {summary.gstPct ?? "0.0"}% VAT</td><td>{money(summary.gstAmount, summary.currency)}</td></tr>
            <tr className="strong-row"><td>Total incl. VAT</td><td>{money(summary.totalInclGst, summary.currency)}</td></tr>
          </tbody>
        </table>

        <h2>Payment Calendar</h2>
        <table className="design-payment-table">
          <thead><tr><th>Payment Type</th><th>Due on</th><th>Amount</th></tr></thead>
          <tbody>{payments.map((payment) => <tr key={`${payment.paymentType}-${payment.amount}`}><td>{payment.paymentType}</td><td>{payment.dueOn ?? ""}</td><td>{money(payment.amount, payment.currency ?? summary.currency)}</td></tr>)}</tbody>
        </table>

        <h2>Bank Details</h2>
        <dl className="design-bank-details">
          <div><dt>Registration Number:</dt><dd>{snapshot.bankDetails?.registrationNumber ?? ""}</dd></div>
          <div><dt>Bank:</dt><dd>{snapshot.bankDetails?.bank ?? ""}</dd></div>
          <div><dt>Branch Code:</dt><dd>{snapshot.bankDetails?.branchCode ?? ""}</dd></div>
          <div><dt>Bank Account:</dt><dd>{snapshot.bankDetails?.bankAccount ?? ""}</dd></div>
        </dl>

        <div className="design-signatures">
          <div><span>Yours sincerely,</span><i /> <strong>{sales?.name ?? quotation.opportunity.owner.displayName}</strong></div>
          <div><span>Accepted,</span><i /> <strong>{customer?.primaryContact ?? customer?.name ?? quotation.opportunity.customer.name}</strong></div>
        </div>
        {version.notes ? <p className="design-note">Notes: {version.notes}</p> : null}
        <Footer reference={reference} page={totalPages} totalPages={totalPages} />
      </section>
    </article>
  </div>;
}
