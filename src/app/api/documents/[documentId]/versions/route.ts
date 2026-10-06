import { AuditAction, type Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { storageDriver } from "@/lib/storage";
import { opportunityViewWhere } from "@/modules/crm/access";
import { canUploadDocumentCategory, canViewDocument } from "@/modules/documents/access";
import { recordOperationalEvent } from "@/modules/operations/events";

function maxBytes() { const parsed = Number(process.env.MAX_UPLOAD_BYTES ?? 52_428_800); return Number.isFinite(parsed) ? parsed : 52_428_800; }

export async function POST(request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  const user = await requireUser();
  const { documentId } = await params;
  const document = await db.document.findFirst({ where: { id: documentId, archivedAt: null, opportunity: opportunityViewWhere(user) }, include: { opportunity: true } });
  if (!document || !canViewDocument(user, document)) return Response.json({ error: "Document not found." }, { status: 404 });
  if (!canUploadDocumentCategory(user, document.category)) return Response.json({ error: "You cannot upload a new version of this document." }, { status: 403 });
  const formData = await request.formData();
  const file = formData.get("file");
  const notes = String(formData.get("notes") ?? "").trim();
  if (!(file instanceof File) || file.size === 0) return Response.json({ error: "Choose a file." }, { status: 400 });
  if (file.size > maxBytes()) return Response.json({ error: `File exceeds ${Math.round(maxBytes() / 1024 / 1024)} MB.` }, { status: 413 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const stored = await storageDriver().put({ bytes, originalName: file.name, entityType: "opportunity", entityId: document.opportunityId ?? document.id });
  try {
    const version = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const current = await tx.document.findUniqueOrThrow({ where: { id: document.id } });
      const created = await tx.documentVersion.create({ data: { documentId: document.id, versionNo: current.currentVersion + 1, originalName: file.name, storageKey: stored.storageKey, mimeType: file.type || "application/octet-stream", sizeBytes: BigInt(stored.sizeBytes), checksumSha256: stored.checksumSha256, notes: notes || null, uploadedById: user.id } });
      await tx.document.update({ where: { id: document.id }, data: { currentVersion: created.versionNo } });
      await recordOperationalEvent(tx, { actorId: user.id, actorName: user.displayName, action: AuditAction.FILE_UPLOAD, entityType: "DocumentVersion", entityId: created.id, opportunityId: document.opportunityId, actionUrl: `/documents/${created.id}/preview`, subject: `${document.title} updated to version ${created.versionNo}`, body: `${file.name}${notes ? ` · ${notes}` : ""}`, after: { documentId: document.id, versionNo: created.versionNo, originalName: file.name, sizeBytes: stored.sizeBytes }, notifications: document.opportunity && document.opportunity.ownerId !== user.id ? [{ recipientId: document.opportunity.ownerId, title: `${document.title} was updated`, body: `${user.displayName} uploaded version ${created.versionNo}.`, href: `/opportunities/${document.opportunityId}?section=files`, actionLabel: "Review files" }] : [] });
      return created;
    });
    return Response.json({ success: true, versionId: version.id, versionNo: version.versionNo });
  } catch (error) {
    await storageDriver().delete(stored.storageKey);
    return Response.json({ error: error instanceof Error ? error.message : "Upload failed." }, { status: 500 });
  }
}
