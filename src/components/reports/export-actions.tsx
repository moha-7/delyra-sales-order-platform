"use client";

export function ExecutiveReportActions({
  csvHref,
  fileName,
}: {
  csvHref: string;
  fileName: string;
}) {
  return (
    <div className="executive-actions">
      <a className="clean-primary-action" download={fileName} href={csvHref}>
        <i className="bi bi-download" aria-hidden="true" />
        Export CSV
      </a>
      <button
        className="clean-secondary-action"
        type="button"
        onClick={() => window.print()}
      >
        <i className="bi bi-printer" aria-hidden="true" />
        Print / PDF
      </button>
    </div>
  );
}
