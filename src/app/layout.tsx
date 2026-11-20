import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Q-not — Move before the queue moves",
    template: "%s | Q-not",
  },
  description:
    "Transit intelligence for Nigerian bus terminals. Find departures, see seat availability and take your place in a virtual boarding queue.",
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
