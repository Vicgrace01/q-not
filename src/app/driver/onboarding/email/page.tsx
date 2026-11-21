import Link from "next/link";
import { redirect } from "next/navigation";
import { getDriverId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { requestDriverEmailLinkAction, verifyDriverEmailLinkAction } from "@/lib/actions/driver-auth";

export const dynamic = "force-dynamic";
const field = "mt-1 w-full rounded-lg border border-neutral-700 bg-[#09110f] px-3 py-3 text-sm text-white";

export default async function DriverEmailLinkPage({ searchParams }: { searchParams: Promise<{ sent?: string; linked?: string; email?: string; error?: string }> }) {
  const driverId = await getDriverId();
  if (!driverId) redirect("/driver/login");
  const [driver, params] = await Promise.all([
    prisma.driver.findUnique({ where: { id: driverId }, select: { email: true, emailVerifiedAt: true } }),
    searchParams,
  ]);
  if (!driver) redirect("/driver/login");
  if (driver.email && driver.emailVerifiedAt) redirect("/driver/onboarding");
  const email = params.email ?? "";
  const errors: Record<string, string> = {
    "email-invalid": "Enter a valid email address.",
    "email-in-use": "That email is already linked to another driver account.",
    "email-code": "Enter the six-digit code from your email.",
    wrong: "That code is incorrect.", expired: "That code has expired. Request another.",
    "too-many-attempts": "Too many attempts. Request another code.",
    "not-found": "No active code was found. Request another.",
  };
  return <main className="min-h-screen bg-[#071311] px-4 py-10 text-white sm:px-6"><div className="mx-auto max-w-lg">
    <header className="mb-7 flex items-center justify-between"><Link href="/" className="text-xl font-black">Q-not</Link><Link href="/driver/onboarding" className="text-sm text-lime-300 underline">Back to registration</Link></header>
    <section className="rounded-2xl border border-neutral-800 bg-[#0d1916] p-6 sm:p-8"><p className="text-xs font-bold tracking-[.18em] text-lime-300">DRIVER ACCOUNT / EMAIL SECURITY</p><h1 className="mt-3 text-2xl font-black">Verify your email address.</h1><p className="mt-2 text-sm leading-relaxed text-neutral-400">A verified email supports sign-in, account recovery and trip notices. It must belong to you and cannot already be linked to another driver account.</p>
      {params.linked === "1" && <p className="mt-5 rounded-lg bg-emerald-950 px-4 py-3 text-sm text-emerald-200">Email verified and linked to your driver account.</p>}
      {params.error && <p role="alert" className="mt-5 rounded-lg bg-red-950 px-4 py-3 text-sm text-red-200">{errors[params.error] ?? params.error}</p>}
      {!params.sent ? <form action={requestDriverEmailLinkAction} className="mt-6 space-y-4"><label className="block text-sm">Email address<input name="email" required type="email" autoComplete="email" placeholder="you@example.com" className={field}/></label><button className="w-full rounded-lg bg-lime-300 px-4 py-3 text-sm font-bold text-neutral-950" type="submit">Send verification code</button></form> : <form action={verifyDriverEmailLinkAction} className="mt-6 space-y-4"><input type="hidden" name="email" value={email}/><p className="text-sm text-neutral-300">Enter the six-digit code sent to <strong>{email}</strong>. During local development, the code appears in the server terminal.</p><label className="block text-sm">Verification code<input name="code" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} placeholder="000000" className={field}/></label><button className="w-full rounded-lg bg-lime-300 px-4 py-3 text-sm font-bold text-neutral-950" type="submit">Verify email address</button></form>}
    </section></div></main>;
}
