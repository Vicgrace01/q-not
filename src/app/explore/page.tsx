import { redirect } from "next/navigation";

export const metadata = {
  title: "Explore departures",
  description: "Browse published Q-not transport departures.",
};

export default function ExplorePage() {
  redirect("/trips");
}
