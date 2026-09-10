import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSessionOperatorId } from "@/lib/session";
import { logoutAction } from "@/lib/actions/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const operatorId = await getSessionOperatorId();
  if (!operatorId) redirect("/login");

  const operator = await prisma.operator.findUnique({
    where: { id: operatorId },
    select: { id: true, name: true, email: true },
  });

  if (!operator) {
    // Session is valid but operator no longer exists. Treat as logged out.
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50">
      <header className="border-b border-neutral-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-lg font-semibold">
              Q-Not
            </Link>
            <Link
              href="/dashboard"
              className="text-sm text-neutral-400 hover:text-white"
            >
              Routes
            </Link>
            <Link
              href="/dashboard/routes/new"
              className="text-sm text-neutral-400 hover:text-white"
            >
              New route
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-neutral-400">{operator.name}</span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-sm text-neutral-400 hover:text-white"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
