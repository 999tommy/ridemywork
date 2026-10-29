import { NextResponse } from "next/server";
import { z } from "zod";

const coordinates = z.object({ lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180) });

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const origin = coordinates.safeParse({ lat: params.get("originLat"), lng: params.get("originLng") });
  const destination = coordinates.safeParse({ lat: params.get("destinationLat"), lng: params.get("destinationLng") });
  if (!origin.success || !destination.success) return NextResponse.json({ error: "Choose a starting point and destination from map suggestions." }, { status: 400 });
  const { lat: fromLat, lng: fromLng } = origin.data;
  const { lat: toLat, lng: toLng } = destination.data;
  const endpoint = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=false&alternatives=true&steps=false`;
  try {
    const response = await fetch(endpoint.replace("overview=false", "overview=full&geometries=geojson"), { headers: { "user-agent": "RideMyWork/1.0 (driving route estimate)" }, next: { revalidate: 300 } });
    if (!response.ok) return NextResponse.json({ error: "Route estimate is temporarily unavailable." }, { status: 502 });
    const result = await response.json() as { code?: string; routes?: { distance: number; duration: number; geometry?: { coordinates?: [number,number][] } }[] };
    if (result.code !== "Ok" || !result.routes?.length) return NextResponse.json({ error: "No driving route was found between these places." }, { status: 404 });
    const fastest = [...result.routes].sort((a, b) => a.duration - b.duration)[0];
    return NextResponse.json({ distanceKm: fastest.distance / 1000, durationMinutes: fastest.duration / 60, alternatives: result.routes.length, coordinates: fastest.geometry?.coordinates ?? [] });
  } catch {
    return NextResponse.json({ error: "Route estimate is temporarily unavailable." }, { status: 502 });
  }
}
