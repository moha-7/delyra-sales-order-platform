import Link from "next/link";

export default function NotFound() {
  return (
    <div className="app-state-page">
      <div className="app-state-card">
        <strong>Record not found</strong>
        <p>The record may have been deleted, archived, or outside your access scope.</p>
        <Link className="primary-link" href="/dashboard">Back to My Work</Link>
      </div>
    </div>
  );
}