"use client";

export function PrintQuotationButton() {
  return <button className="secondary-button" type="button" onClick={() => window.print()}>Print / Save PDF</button>;
}
