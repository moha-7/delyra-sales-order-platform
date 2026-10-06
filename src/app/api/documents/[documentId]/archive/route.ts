import { AuditAction, type Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { opportunityViewWhere } from "@/modules/crm/access";
import { canArchiveDocument } from "@/modules/documents/access";
import { recordOperationalEvent } from "@/modules/operations/events";

export async function POST(request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  const user = await requireUser();
  const { documentId } = await params;
  const body = await request.json().catch(() => ({})) as { reason?: string };
  const reason = body.reason?.trim();
  if (!reason) return Response.json({ error: "Archive reason is required." }, { status: 400 });
  const document = await db.document.findFirst({ where: { id: documentId, archivedAt: null, opportunity: opportunityViewWhere(user) }, include: { opportunity: true } });
  if (!document) return Response.json({ error: "Document not found." }, { status: 404 });
  if (!canArchiveDocument(user, document, document.opportunity?.stage)) return Response.json({ error: "You cannot archive this document at the current stage." }, { status: 403 });
  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.document.update({ where: { id: document.id }, data: { archivedAt: new Date(), archivedById: user.id, archiveReason: reason } });
    await recordOperationalEvent(tx, { actorId: user.id, actorName: user.displayName, action: AuditAction.ARCHIVE, entityType: "Document", entityId: document.id, opportunityId: document.opportunityId, actionUrl: document.opportunityId ? `/opportunities/${document.opportunityId}?section=files` : null, subject: `${document.title} archived`, body: reason, before: { archivedAt: null }, after: { archivedAt: new Date().toISOString(), reason } });
  });
  return Response.json({ success: true });
}
