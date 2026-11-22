import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { getSessionOperatorId } from "@/lib/session";

/**
 * Operators are pending until a network reviewer verifies their identity and
 * authority. The trusted network-admin allowlist is the bootstrap exception.
 */
export async function getOperatorManagementAccess() {
  const operatorId = await getSessionOperatorId();
  if (!operatorId) redirect("/login");

  const operator = await prisma.operator.findUnique({
    where: { id: operatorId },
    select: { email: true, verificationStatus: true },
  });
  if (!operator) redirect("/login");

  const adminEmails = (env.QNOT_NETWORK_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const isNetworkAdmin = adminEmails.includes(operator.email.toLowerCase());

  if (operator.verificationStatus !== "APPROVED" && !isNetworkAdmin) {
    redirect("/dashboard?error=operator-review-pending");
  }

  return { operatorId, isNetworkAdmin, verificationStatus: operator.verificationStatus };
}

export async function requireOperatorManagementAccess(): Promise<string> {
  return (await getOperatorManagementAccess()).operatorId;
}
