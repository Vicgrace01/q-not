import { Suspense } from "react";
import { PassengerAccessExperience } from "@/components/auth/passenger-access-experience";

export default function CommuterLoginPage() {
  return (
    <Suspense fallback={<main className="qnot-passenger-access-loading">Preparing your passenger space…</main>}>
      <PassengerAccessExperience />
    </Suspense>
  );
}
