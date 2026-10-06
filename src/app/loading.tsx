export default function Loading() {
  return (
    <div className="app-state-page" role="status" aria-live="polite">
      <div className="app-state-card">
        <span className="app-state-spinner" aria-hidden="true" />
        <strong>Loading workspace</strong>
        <p>Preparing your CRM view and permissions.</p>
      </div>
    </div>
  );
}