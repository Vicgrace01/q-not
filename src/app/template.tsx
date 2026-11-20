import type { ReactNode } from "react";

/** Remounts on App Router navigation so each destination gets a short entrance transition. */
export default function Template({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="q-route-transition">{children}</div>;
}
