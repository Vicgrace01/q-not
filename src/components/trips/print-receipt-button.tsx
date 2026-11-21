"use client";

export function PrintReceiptButton() {
  return <button type="button" className="qnot-receipt-print" onClick={() => window.print()}>Save or print receipt <span aria-hidden="true">↗</span></button>;
}
