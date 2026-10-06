import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { formatDateTime } from "@/modules/crm/format";
import { documentCategoryLabel } from "@/modules/documents/options";
import { isInlinePreviewable } from "@/modules/documents/access";
import { accessibleDocumentVersion } from "@/modules/documents/server";

function formatBytes(value: bigint) {
  const bytes = Number(value);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export default async function DocumentPreviewPage({
  params,
}: {
  params: Promise<{ versionId: string }>;
}) {
  const user = await requireUser();
  const { versionId } = await params;
  const version = await accessibleDocumentVersion(user, versionId);
  if (!version) notFound();
  const previewable = isInlinePreviewable(
    version.mimeType,
    version.originalName,
  );
  const contentUrl = `/api/document-versions/${version.id}/content`;
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-700">
            <span>{documentCategoryLabel(version.document.category)}</span>
            <span>·</span>
            <span>Version {version.versionNo}</span>
          </div>
          <h1 className="mt-2 break-all text-2xl font-black text-slate-950">
            {version.originalName}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {formatBytes(version.sizeBytes)} · uploaded by{" "}
            {version.uploadedBy.displayName} ·{" "}
            {formatDateTime(version.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/opportunities/${version.document.opportunity?.id}?section=files`}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
          >
            <i className="bi bi-arrow-left mr-2" />
            Opportunity
          </Link>
          <a
            href={`/api/document-versions/${version.id}/download`}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-blue-700"
          >
            <i className="bi bi-download mr-2" />
            Download
          </a>
        </div>
      </header>
      <section className="min-h-[70vh] overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-xl">
        {previewable ? (
          version.mimeType.startsWith("image/") ? (
            <div className="flex min-h-[70vh] items-center justify-center p-5">
              <Image
                src={contentUrl}
                alt={version.originalName}
                width={1600}
                height={1200}
                unoptimized
                className="h-auto max-h-[80vh] w-auto max-w-full rounded-lg object-contain"
              />
            </div>
          ) : (
            <iframe
              title={version.originalName}
              src={contentUrl}
              className="h-[80vh] w-full bg-white"
            />
          )
        ) : (
          <div className="flex min-h-[70vh] flex-col items-center justify-center p-8 text-center text-white">
            <i className="bi bi-file-earmark-arrow-down text-6xl text-slate-400" />
            <h2 className="mt-5 text-xl font-black">
              Browser preview is not available for this file type
            </h2>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              Design .drw, Office, and some Excel formats require their native
              application. Download the file to inspect it.
            </p>
            <a
              href={`/api/document-versions/${version.id}/download`}
              className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white"
            >
              Download file
            </a>
          </div>
        )}
      </section>
    </div>
  );
}
