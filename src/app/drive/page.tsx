import type { Metadata } from "next";
import { DrivePortalExperience } from "@/components/drive/drive-portal-experience";

export const metadata: Metadata = {
  title: "Q-not Drive | Bring your vehicle into the network",
  description: "Register a Danfo, Korope, passenger van or bus, complete driver and vehicle checks, and request access to eligible Q-not corridors.",
};

export default function DrivePage() {
  return <DrivePortalExperience />;
}
