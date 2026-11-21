import Link from "next/link";
import { QNotBrand } from "@/components/qnot-brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="qnot-auth-shell qnot-operator-auth">
      <header className="qnot-auth-topbar"><QNotBrand /><Link href="/">Back to Q-not <span>↗</span></Link></header>
      <main className="qnot-auth-layout">
        <section className="qnot-auth-story">
          <span className="qnot-page-eyebrow"><i/> Q-NOT / OPERATOR ACCESS</span>
          <h1>Run your network.<br/><em>Not the guesswork.</em></h1>
          <p>Bring routes, vehicles, drivers and departures into one operational view. Start with your corridors and grow your network as your fleet grows.</p>
          <div className="qnot-auth-route-art" aria-hidden="true"><svg viewBox="0 0 520 230" fill="none"><path d="M26 184C107 177 111 92 196 100S296 191 352 130 418 43 495 30" stroke="#2f493b" strokeWidth="29" strokeLinecap="round"/><path d="M26 184C107 177 111 92 196 100S296 191 352 130 418 43 495 30" stroke="#e8f2d5" strokeOpacity=".72" strokeWidth="2" strokeDasharray="5 10" strokeLinecap="round"/><circle cx="26" cy="184" r="8" fill="#d6ff3f"/><circle cx="495" cy="30" r="8" fill="#d6ff3f"/><rect x="206" y="85" width="43" height="24" rx="7" fill="#d6ff3f"/><rect x="214" y="90" width="27" height="9" rx="3" fill="#13231a"/></svg><span className="qnot-auth-route-label qnot-auth-route-label--start">ORIGIN / YOUR TERMINAL</span><span className="qnot-auth-route-label qnot-auth-route-label--end">DESTINATION / NETWORK</span></div>
          <div className="qnot-auth-benefits"><span><i>01</i> Register your route network</span><span><i>02</i> Coordinate your fleet</span><span><i>03</i> Make departures visible</span></div>
        </section>
        <section className="qnot-auth-form-column"><div className="qnot-auth-mobile-brand"><QNotBrand compact /></div>{children}<p className="qnot-auth-security"><span>⌑</span> Your operator workspace is protected by Q-not account authentication.</p></section>
      </main>
      <footer className="qnot-auth-footer"><span>Q-NOT / SHARED MOBILITY OPERATIONS</span><span>Make every departure count.</span></footer>
    </div>
  );
}
