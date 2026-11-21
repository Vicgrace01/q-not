import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCommuterId } from "@/lib/session";
import { releasePendingTripPayment, verifyPaystackReference } from "@/lib/payments/paystack";

export const dynamic = "force-dynamic";

export default async function QFundsReturnPage({ searchParams }: { searchParams: Promise<{ reference?: string }> }) {
  const commuterId = await getCommuterId();
  if (!commuterId) redirect("/c/login");
  const { reference } = await searchParams;
  if (!reference) redirect("/c/q-funds?payment=missing");
  const payment = await prisma.payment.findFirst({ where: { reference, commuterId }, select: { reference: true, status: true, expiresAt: true } });
  if (!payment) redirect("/c/q-funds?payment=missing");
  if (payment.status === "SUCCEEDED") redirect("/c/q-funds?payment=success");
  if (payment.status === "FAILED") redirect("/c/q-funds?payment=failed");
  const result = await verifyPaystackReference(reference);
  if (result === "SUCCESS") redirect("/c/q-funds?payment=success");
  if (result === "FAILED") {
    await releasePendingTripPayment(reference);
    redirect("/c/q-funds?payment=failed");
  }
  if (result === "NOT_FOUND" && payment.expiresAt && payment.expiresAt <= new Date()) {
    await releasePendingTripPayment(reference);
    redirect("/c/q-funds?payment=failed");
  }
  redirect(`/c/q-funds?payment=${result === "PENDING" || result === "NOT_FOUND" ? "processing" : "checking"}`);
}
