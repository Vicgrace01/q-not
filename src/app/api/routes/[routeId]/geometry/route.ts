import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, context: { params: Promise<{ routeId: string }> }) {
  const { routeId } = await context.params;
  const route = await prisma.route.findUnique({
    where: { id: routeId },
    select: { stops: { orderBy: { sequence: "asc" }, select: { latitude: true, longitude: true } } },
  });
  if (!route) return NextResponse.json({ error: "Route not found." }, { status: 404 });
  const stops = route.stops.filter((stop) => Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude)
    && Math.abs(stop.latitude) <= 90 && Math.abs(stop.longitude) <= 180);
  if (stops.length < 2 || stops.length > 30) {
    return NextResponse.json({ error: "This route needs between 2 and 30 valid stop coordinates." }, { status: 422 });
  }

  const coordinates = stops.map((stop) => `${stop.longitude},${stop.latitude}`).join(";");
  const baseUrl = env.QNOT_ROUTING_BASE_URL.replace(/\/$/, "");
  const url = `${baseUrl}/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`;
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600, tags: [`qnot-route-geometry-${routeId}`] },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return NextResponse.json({ error: "Road route is temporarily unavailable." }, { status: 502 });
    const payload = await response.json() as { code?: string; routes?: { geometry?: { coordinates?: [number, number][] }; distance?: number; duration?: number }[] };
    const geometry = payload.routes?.[0]?.geometry?.coordinates;
    if (payload.code !== "Ok" || !geometry || geometry.length < 2 || geometry.length > 20_000) {
      return NextResponse.json({ error: "A road route could not be calculated for these stops." }, { status: 422 });
    }
    return NextResponse.json({
      coordinates: geometry,
      distanceMeters: payload.routes?.[0]?.distance ?? null,
      durationSeconds: payload.routes?.[0]?.duration ?? null,
      provider: "OSRM",
    }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
  } catch {
    return NextResponse.json({ error: "Road routing is temporarily unavailable." }, { status: 503 });
  }
}
