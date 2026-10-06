"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ActivityType,
  AuditAction,
  PricingStatus,
  QuotationStatus,
  type Prisma,
} from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import {
  issueBusinessReference,
  REFERENCE_TYPE_CODES,
  trackCodeForOpportunityTrack,
} from "@/modules/crm/references";
import { nextInternalReference } from "@/modules/numbering/reference-service";
import { canGenerateQuotation, canSendQuotation } from "@/modules/pricing/access";
import { getQuotationDefaults } from "@/modules/settings/workflow";

export type QuotationActionState = { error?: string; success?: string };

type PricingLineForQuotation = {
  category: string;
  description: string;
  quantity: { toString(): string };
  supplierCurrency: string | null;
  supplierUnitPrice: { toString(): string } | null;
  sellingPriceAed: { toString(): string } | null;
  costAed: { toString(): string } | null;
  sortOrder: number;
};

function lineAmount(line: PricingLineForQuotation): string {
  return line.sellingPriceAed?.toString() ?? line.costAed?.toString() ?? "0";
}

function quotationItems(lines: PricingLineForQuotation[], approvedSellingPrice: { toString(): string }) {
  const visibleLines = lines.filter((line) => Number(lineAmount(line)) !== 0);
  if (!visibleLines.length) {
    return [
      {
        pos: "1",
        quantity: "1.00",
        unit: "lot",
        code: "SUPPLIER",
        hinges: "",
        description: "Kitchen package as per approved design package and commercial scope",
        veneer: "",
        amount: approvedSellingPrice.toString(),
        section: "Furniture",
      },
    ];
  }

  return visibleLines.map((line, index) => ({
    pos: String(index + 1),
    quantity: line.quantity.toString(),
    unit: line.supplierCurrency === "EUR" ? "eur" : "lot",
    code: line.category,
    hinges: "",
    description: line.description,
    veneer: "",
    amount: lineAmount(line),
    section: line.category.includes("HLP") || line.category.includes("APPLIANCE") ? "Trade goods" : "Furniture",
  }));
}

function snapshotJson(value: Record<string, unknown>): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function generateQuotationAction(
  _previousState: QuotationActionState,
  formData: FormData,
): Promise<QuotationActionState> {
  const user = await requireUser();
  if (!canGenerateQuotation(user)) return { error: "Quotation generation permission is required." };
  const opportunityId = String(formData.get("opportunityId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  try {
    const opportunity = await db.opportunity.findUnique({
      where: { id: opportunityId },
      include: {
        customer: { include: { contacts: { where: { archivedAt: null }, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] } } },
        owner: true,
        designPackage: true,
        pricingCases: {
          where: { status: PricingStatus.APPROVED },
          include: { lines: { orderBy: { sortOrder: "asc" } } },
          orderBy: { revision: "desc" },
          take: 1,
        },
        quotations: { where: { archivedAt: null }, orderBy: { createdAt: "asc" }, take: 1 },
      },
    });
    if (!opportunity) throw new Error("Opportunity not found.");
    if (opportunity.ownerId !== user.id && !user.permissions.includes("crm.opportunities.manage_all")) throw new Error("Only the Sales owner or Manager can generate the quotation.");
    const pricing = opportunity.pricingCases[0];
    if (!pricing?.approvedSellingPrice) throw new Error("Branch Manager / Finance approved pricing is required first.");
    const approvedSellingPrice = pricing.approvedSellingPrice;
    if (!opportunity.owner.initials) throw new Error("Sales owner initials are required for the quotation reference.");

    const settings = await getQuotationDefaults();
    const validUntil = new Date(Date.now() + settings.validityDays * 86400000);
    const items = quotationItems(pricing.lines, approvedSellingPrice);
    const furnitureTotal = items.filter((item) => item.section === "Furniture").reduce((sum, item) => sum + Number(item.amount), 0);
    const tradeGoodsTotal = items.filter((item) => item.section === "Trade goods").reduce((sum, item) => sum + Number(item.amount), 0);

    const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      let quotation = opportunity.quotations[0];
      if (!quotation) {
        quotation = await tx.quotation.create({
          data: {
            opportunityId: opportunity.id,
            internalReference: await nextInternalReference(tx, "QUOTATION_INTERNAL", "QUO"),
            businessReference: await issueBusinessReference(tx, {
              trackCode: trackCodeForOpportunityTrack(opportunity.track),
              typeCode: REFERENCE_TYPE_CODES.QUOTATION,
              year: new Date().getFullYear(),
            }),
            status: QuotationStatus.DRAFT,
            salesInitials: opportunity.owner.initials!,
            trackSnapshot: opportunity.track,
            createdById: user.id,
          },
        });
      }

      const versionNo = quotation.currentVersion + 1;
      const snapshot = {
        template: "SUPPLIER_DESIGN_STYLE_V1",
        quotationReference: quotation.businessReference,
        opportunityReference: opportunity.reference,
        track: opportunity.track,
        customer: {
          name: opportunity.customer.name,
          primaryContact: opportunity.customer.contacts[0]?.name ?? null,
          mobile: opportunity.customer.contacts[0]?.mobile ?? null,
          email: opportunity.customer.contacts[0]?.email ?? null,
          address: opportunity.siteAddress,
        },
        sales: { name: opportunity.owner.displayName, email: opportunity.owner.email, initials: opportunity.owner.initials },
        scope: opportunity.requirementsSummary,
        specs: {
          kitchens: "233 CERES",
          frontFinish: "K Laminate",
          frontColour: "126 cashmere",
          carcaseColourInterior: "273 platinum",
          visibleSidesColour: "345v mountain robinia",
          handleVariation: "999 no handle",
          plinthHeight: "140.00",
          height: "910.00",
          designReference: opportunity.designPackage?.designReference ?? opportunity.designReference ?? null,
        },
        items,
        summary: {
          furniture: furnitureTotal.toFixed(2),
          tradeGoods: tradeGoodsTotal.toFixed(2),
          totalExclGst: approvedSellingPrice.toString(),
          gstPct: "0.0",
          gstAmount: "0.00",
          totalInclGst: approvedSellingPrice.toString(),
          currency: "AED",
        },
        paymentCalendar: [
          { paymentType: "Invoice due date", dueOn: null, amount: approvedSellingPrice.toString(), currency: "AED" },
        ],
        bankDetails: {
          registrationNumber: "",
          bank: "",
          branchCode: "",
          bankAccount: "",
        },
        amountPreVatAed: approvedSellingPrice.toString(),
        pricingRevision: pricing.revision,
        generatedAt: new Date().toISOString(),
      } satisfies Record<string, unknown>;

      const version = await tx.quotationVersion.create({
        data: {
          quotationId: quotation.id,
          versionNo,
          status: QuotationStatus.DRAFT,
          pricingCaseId: pricing.id,
          preVatAmount: approvedSellingPrice,
          currency: "AED",
          notes: notes || null,
          validUntil,
          paymentTerms: settings.paymentTerms,
          contentSnapshot: snapshotJson(snapshot),
          createdById: user.id,
        },
      });
      await tx.quotation.update({ where: { id: quotation.id }, data: { currentVersion: versionNo, status: QuotationStatus.DRAFT } });
      await tx.auditLog.create({ data: { actorId: user.id, action: AuditAction.CREATE, entityType: "QuotationVersion", entityId: version.id, after: { businessReference: quotation.businessReference, versionNo, preVatAmount: approvedSellingPrice.toString() } } });
      return { quotationId: quotation.id, versionId: version.id };
    });

    revalidatePath(`/opportunities/${opportunity.id}`);
    redirect(`/quotations/${result.quotationId}/preview?version=${result.versionId}`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { error: error instanceof Error ? error.message : "Quotation could not be generated." };
  }
}

export async function markQuotationSentAction(formData: FormData) {
  const user = await requireUser();
  if (!canSendQuotation(user)) throw new Error("Quotation send permission is required.");
  const quotationId = String(formData.get("quotationId") ?? "");
  const versionId = String(formData.get("versionId") ?? "");
  const version = await db.quotationVersion.findFirst({ where: { id: versionId, quotationId }, include: { quotation: true } });
  if (!version) throw new Error("Quotation version not found.");
  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.quotationVersion.update({ where: { id: version.id }, data: { status: QuotationStatus.SENT, immutable: true, sentById: user.id, sentAt: new Date() } });
    await tx.quotation.update({ where: { id: quotationId }, data: { status: QuotationStatus.SENT } });
    await tx.activity.create({ data: { opportunityId: version.quotation.opportunityId, createdById: user.id, type: ActivityType.EMAIL, subject: `Quotation ${version.quotation.businessReference} v${version.versionNo} sent`, body: `AED ${version.preVatAmount.toString()} pre-VAT` } });
    await tx.auditLog.create({ data: { actorId: user.id, action: AuditAction.QUOTATION_SENT, entityType: "QuotationVersion", entityId: version.id, after: { status: "SENT" } } });
  });
  revalidatePath(`/quotations/${quotationId}/preview`);
  revalidatePath(`/opportunities/${version.quotation.opportunityId}`);
}
