import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { storageDriver } from "@/lib/storage";
import { accessibleDocumentVersion } from "@/modules/documents/server";

function safeName(name: string): string { return name.replace(/[\r\n"]/g, "_"); }

export async function GET(_request: Request, { params }: { params: Promise<{ versionId: string }> }) {
  const user = await requireUser();
  const { versionId } = await params;
  const version = await accessibleDocumentVersion(user, versionId);
  if (!version) notFound();
  const bytes = await storageDriver().read(version.storageKey);
  return new Response(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, { headers: { "content-type": version.mimeType, "content-length": version.sizeBytes.toString(), "content-disposition": `attachment; filename="${safeName(version.originalName)}"`, "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
}
