import { AuditAction, type Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { opportunityViewWhere } from "@/modules/crm/access";
import { canArchiveDocument } from "@/modules/documents/access";
import { recordOperationalEvent } from "@/modules/operations/events";

export async function POST(_request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  const user = await requireUser();
  const { documentId } = await params;
  const document = await db.document.findFirst({ where: { id: documentId, opportunity: opportunityViewWhere(user) }, include: { opportunity: true } });
  if (!document) return Response.json({ error: "Document not found." }, { status: 404 });
  if (!canArchiveDocument(user, document, document.opportunity?.stage)) return Response.json({ error: "You cannot restore this document." }, { status: 403 });
  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.document.update({ where: { id: document.id }, data: { archivedAt: null, archivedById: null, archiveReason: null } });
    await recordOperationalEvent(tx, { actorId: user.id, actorName: user.displayName, action: AuditAction.RESTORE, entityType: "Document", entityId: document.id, opportunityId: document.opportunityId, actionUrl: document.opportunityId ? `/opportunities/${document.opportunityId}?section=files` : null, subject: `${document.title} restored`, after: { archivedAt: null } });
  });
  return Response.json({ success: true });
}
