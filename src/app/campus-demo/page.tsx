import Link from "next/link";
import { CampusDemoExperience } from "@/components/campus-demo-experience";

export const metadata = {
  title: "UNN Campus Demo Network | Q-not",
  description: "Explore the Q-not University of Nigeria, Nsukka campus transport simulator.",
};

export default function CampusDemoPage() {
  return (
    <main className="min-h-screen bg-[#06100b] px-3 py-4 text-white sm:px-6 sm:py-7">
      <div className="mx-auto max-w-[1500px]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-4">
          <Link href="/" className="text-lg font-black tracking-tight">Q-not<span className="text-lime-300">.</span></Link>
          <nav className="flex flex-wrap items-center gap-4 text-xs text-neutral-300">
            <Link href="/trips" className="hover:text-lime-200">Real departures</Link>
            <Link href="/c/login" className="hover:text-lime-200">Passenger sign in</Link>
            <Link href="/" className="hover:text-lime-200">Home</Link>
          </nav>
        </header>
        <CampusDemoExperience />
        <footer className="border-t border-neutral-800 py-5 text-center text-[11px] text-neutral-500">
          Q-not UNN Campus Demo Network · Simulated people, vehicles, bookings and funds · Not a live transport service
        </footer>
      </div>
    </main>
  );
}
