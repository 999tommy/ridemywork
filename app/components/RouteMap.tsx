"use client";

import { useEffect, useState } from "react";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type Point = { lat: number; lng: number; label: string };

function FitPoints({ start, end }: { start?: Point; end?: Point }) {
  const map = useMap();
  const startLat = start?.lat;
  const startLng = start?.lng;
  const endLat = end?.lat;
  const endLng = end?.lng;
  useEffect(() => {
    if (startLat != null && startLng != null && endLat != null && endLng != null) map.fitBounds([[startLat,startLng],[endLat,endLng]], { padding: [24,24], maxZoom: 14 });
    else if (startLat != null && startLng != null) map.setView([startLat,startLng], 14);
  }, [map,startLat,startLng,endLat,endLng]);
  return null;
}

export default function RouteMap({ start, end }: { start?: Point; end?: Point }) {
  const [line, setLine] = useState<[number,number][]>([]);
  const startLat = start?.lat;
  const startLng = start?.lng;
  const endLat = end?.lat;
  const endLng = end?.lng;
  useEffect(() => {
    if (startLat == null || startLng == null || endLat == null || endLng == null) { setLine([]); return; }
    const controller = new AbortController();
    const params = new URLSearchParams({ originLat: String(startLat), originLng: String(startLng), destinationLat: String(endLat), destinationLng: String(endLng) });
    void fetch(`/api/route-estimate?${params}`, { signal: controller.signal }).then((response) => response.json()).then((route) => {
      if (Array.isArray(route.coordinates)) setLine(route.coordinates.map(([lng,lat]:[number,number])=>[lat,lng]));
    }).catch(() => { if (!controller.signal.aborted) setLine([]); });
    return () => controller.abort();
  }, [startLat,startLng,endLat,endLng]);

  return <MapContainer center={[6.465,3.406]} zoom={12} scrollWheelZoom={false} className="route-leaflet-map" aria-label="Map showing the selected trip route">
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
    <FitPoints start={start} end={end}/>
    {line.length>1&&<Polyline positions={line} pathOptions={{color:"#35734d",weight:5,opacity:.85}}/>}
    {start&&<CircleMarker center={[start.lat,start.lng]} radius={8} pathOptions={{color:"#ffffff",weight:3,fillColor:"#35734d",fillOpacity:1}}><Popup>{start.label}</Popup></CircleMarker>}
    {end&&<CircleMarker center={[end.lat,end.lng]} radius={8} pathOptions={{color:"#ffffff",weight:3,fillColor:"#bd8742",fillOpacity:1}}><Popup>{end.label}</Popup></CircleMarker>}
  </MapContainer>;
}
