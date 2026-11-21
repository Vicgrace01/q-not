import Link from "next/link";

export function QNotBrand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className={`qnot-brand-lockup${compact ? " is-compact" : ""}`} href="/" aria-label="Q-not home">
      <span className="qnot-brand-symbol" aria-hidden="true">Q</span>
      <span className="qnot-brand-name">q-not<span>.</span></span>
    </Link>
  );
}
