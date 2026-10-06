"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="app-state-page" role="alert">
      <div className="app-state-card">
        <strong>Something went wrong</strong>
        <p>{error.message || "The CRM could not complete this request."}</p>
        {error.digest ? <small>Error reference: {error.digest}</small> : null}
        <button className="primary-button" type="button" onClick={() => reset()}>
          Try again
        </button>
      </div>
    </div>
  );
}