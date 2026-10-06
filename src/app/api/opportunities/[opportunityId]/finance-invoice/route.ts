import { AuditAction, DocumentCategory, DocumentConfidentiality, type Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { storageDriver } from "@/lib/storage";
import { recordOperationalEvent } from "@/modules/operations/events";
import { PERMISSIONS } from "@/modules/rbac/permissions";

function maxBytes() { const parsed = Number(process.env.MAX_UPLOAD_BYTES ?? 52_428_800); return Number.isFinite(parsed) ? parsed : 52_428_800; }

export async function POST(request: Request, { params }: { params: Promise<{ opportunityId: string }> }) {
  const user = await requireUser();
  if (!user.permissions.includes(PERMISSIONS.FINANCE_PRICING_PREPARE)) return Response.json({ error: "Only Finance can upload the invoice." }, { status: 403 });
  const { opportunityId } = await params;
  const opportunity = await db.opportunity.findUnique({ where: { id: opportunityId }, select: { id: true, reference: true, ownerId: true } });
  if (!opportunity) return Response.json({ error: "Opportunity not found." }, { status: 404 });
  const formData = await request.formData();
  const file = formData.get("invoiceFile");
  if (!(file instanceof File) || file.size === 0) return Response.json({ error: "Choose an invoice PDF." }, { status: 400 });
  if (file.size > maxBytes()) return Response.json({ error: `File exceeds ${Math.round(maxBytes() / 1024 / 1024)} MB.` }, { status: 413 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const stored = await storageDriver().put({ bytes, originalName: file.name, entityType: "opportunity", entityId: opportunityId });
  try {
    const version = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      let document = await tx.document.findFirst({ where: { opportunityId, category: DocumentCategory.CUSTOMER_INVOICE, archivedAt: null } });
      if (!document) document = await tx.document.create({ data: { title: "Finance Invoice PDF", category: DocumentCategory.CUSTOMER_INVOICE, confidentiality: DocumentConfidentiality.FINANCE_RESTRICTED, opportunityId } });
      const created = await tx.documentVersion.create({ data: { documentId: document.id, versionNo: document.currentVersion + 1, originalName: file.name, storageKey: stored.storageKey, mimeType: file.type || "application/pdf", sizeBytes: BigInt(stored.sizeBytes), checksumSha256: stored.checksumSha256, uploadedById: user.id } });
      await tx.document.update({ where: { id: document.id }, data: { currentVersion: created.versionNo } });
      await recordOperationalEvent(tx, { actorId: user.id, actorName: user.displayName, action: AuditAction.FILE_UPLOAD, entityType: "DocumentVersion", entityId: created.id, opportunityId, actionUrl: `/documents/${created.id}/preview`, subject: `Finance invoice PDF uploaded`, body: `${file.name} · version ${created.versionNo}`, after: { documentId: document.id, versionNo: created.versionNo, sizeBytes: stored.sizeBytes }, notifications: opportunity.ownerId !== user.id ? [{ recipientId: opportunity.ownerId, title: `Invoice PDF uploaded for ${opportunity.reference}`, body: `${user.displayName} uploaded the Finance invoice.`, href: `/opportunities/${opportunityId}?section=deposit`, actionLabel: "Review invoice" }] : [] });
      return created;
    });
    return Response.json({ success: true, versionId: version.id, versionNo: version.versionNo });
  } catch (error) {
    await storageDriver().delete(stored.storageKey);
    return Response.json({ error: error instanceof Error ? error.message : "Invoice upload failed." }, { status: 500 });
  }
}
