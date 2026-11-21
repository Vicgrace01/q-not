import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = {
  title: {
    default: "Q-not — Shared transport, coordinated",
    template: "%s | Q-not",
  },
  description:
    "Q-not connects passengers, independent commercial drivers, transport operators and terminals. Discover shared transport, compare departures, follow eligible trips and coordinate capacity across routes.",
  applicationName: "Q-not",
  icons: { icon: "/qnot-mark.svg" },
  appleWebApp: { capable: true, title: "Q-not", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#071311",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body><PageTransition>{children}</PageTransition></body>
    </html>
  );
}
