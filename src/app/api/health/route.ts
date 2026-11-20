import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "q-not",
    mode: "prototype",
    timestamp: new Date().toISOString(),
  });
}
