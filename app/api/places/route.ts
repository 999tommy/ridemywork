import { NextResponse } from "next/server";

type PhotonFeature = { properties?: Record<string, unknown>; geometry?: { coordinates?: [number, number] } };

function labelFor(properties: Record<string, unknown> = {}) {
  return [properties.name, properties.street, properties.district, properties.city, properties.state]
    .filter((value, index, values): value is string => typeof value === "string" && Boolean(value) && values.indexOf(value) === index)
    .join(", ");
}

function areaFor(properties: Record<string, unknown> = {}) {
  const area = [properties.district, properties.city, properties.state]
    .filter((value, index, values): value is string => typeof value === "string" && Boolean(value) && values.indexOf(value) === index)
    .join(", ");
  return area || (typeof properties.country === "string" ? properties.country : "Selected area");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim().slice(0, 120);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  const reverse = url.searchParams.get("reverse") === "true";
  if ((!reverse && query.length < 3) || (reverse && (!Number.isFinite(lat) || !Number.isFinite(lng)))) {
    return NextResponse.json({ places: [] });
  }

  const photon = new URL("https://photon.komoot.io/api/");
  if (reverse) {
    photon.pathname = "/reverse/";
    photon.searchParams.set("lat", String(lat));
    photon.searchParams.set("lon", String(lng));
  } else {
    photon.searchParams.set("q", query);
    photon.searchParams.set("limit", "6");
    photon.searchParams.set("lat", "6.46");
    photon.searchParams.set("lon", "3.40");
  }
  try {
    const response = await fetch(photon, { headers: { "user-agent": "RideMyWork/1.0 (place search)" }, next: { revalidate: 3600 } });
    if (!response.ok) return NextResponse.json({ places: [], error: "Place search is temporarily unavailable." }, { status: 502 });
    const result = await response.json() as { features?: PhotonFeature[] };
    const places = (result.features ?? []).flatMap((feature) => {
      const coordinates = feature.geometry?.coordinates;
      const label = labelFor(feature.properties);
      if (!coordinates || !label || !Number.isFinite(coordinates[0]) || !Number.isFinite(coordinates[1])) return [];
      return [{ label, area: areaFor(feature.properties), lng: coordinates[0], lat: coordinates[1] }];
    });
    return NextResponse.json({ places });
  } catch {
    return NextResponse.json({ places: [], error: "Place search is temporarily unavailable." }, { status: 502 });
  }
}
