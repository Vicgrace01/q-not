import { redirect } from "next/navigation";
import { getDriverId } from "@/lib/session";

export default async function DriverPage() {
  const driverId = await getDriverId();
  redirect(driverId ? "/driver/dashboard" : "/driver/login");
}
