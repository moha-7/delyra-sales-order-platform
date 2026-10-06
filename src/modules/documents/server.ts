import "server-only";
import { db } from "@/lib/db";
import type { AuthenticatedUser } from "@/lib/auth/session";
import { opportunityViewWhere } from "@/modules/crm/access";
import { canViewDocument } from "@/modules/documents/access";

export async function accessibleDocumentVersion(user: AuthenticatedUser, versionId: string) {
  const version = await db.documentVersion.findFirst({
    where: {
      id: versionId,
      document: {
        opportunity: opportunityViewWhere(user),
      },
    },
    include: {
      uploadedBy: { select: { displayName: true } },
      document: { include: { opportunity: { select: { id: true, reference: true, title: true, stage: true, ownerId: true } } } },
    },
  });
  if (!version || !canViewDocument(user, version.document)) return null;
  return version;
}
