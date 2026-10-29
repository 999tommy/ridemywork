"use client";

import { useEffect, useState } from "react";
import { LocateFixed, MapPin, Search } from "lucide-react";

export type Place = { label: string; area: string; lat: number; lng: number };

export default function PlacePicker({ label, value, onChange, placeholder, required = true }: {
  label: string;
  value: string;
  onChange: (place: Place | null, text: string) => void;
  placeholder: string;
  required?: boolean;
}) {
  const [query, setQuery] = useState(value);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedLabel, setSelectedLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setQuery(value), [value]);
  useEffect(() => {
    if (query.trim().length < 3 || query === selectedLabel) { setPlaces([]); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setBusy(true);
      try {
        const response = await fetch(`/api/places?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
        const data = await response.json();
        setPlaces(data.places ?? []);
        setError(response.ok ? "" : "Place search is unavailable. You can still enter the place manually.");
      } catch (cause) {
        if (!controller.signal.aborted) setError("Place search is unavailable. You can still enter the place manually.");
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, selectedLabel]);

  const chooseCurrentLocation = () => {
    setError("");
    if (!navigator.geolocation) { setError("This browser cannot share its location. Search for a place instead."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude: lat, longitude: lng } = position.coords;
      try {
        const response = await fetch(`/api/places?reverse=true&lat=${lat}&lng=${lng}`);
        const data = await response.json();
        const place = data.places?.[0] as Place | undefined;
        const location = place ?? { label: `My location (${lat.toFixed(5)}, ${lng.toFixed(5)})`, area: "My current area", lat, lng };
        setSelectedLabel(location.label);
        setQuery(location.label);
        onChange(location, location.label);
      } catch {
        const location = { label: `My location (${lat.toFixed(5)}, ${lng.toFixed(5)})`, area: "My current area", lat, lng };
        setSelectedLabel(location.label);
        setQuery(location.label);
        onChange(location, location.label);
      } finally { setLocating(false); }
    }, (cause) => {
      setLocating(false);
      setError(cause.code === cause.PERMISSION_DENIED ? "Location permission is off. Allow it in your browser or search for a place." : "We couldn’t get your location. Search for a place instead.");
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  };

  return <div className="place-picker">
    <div className="place-picker-input"><Search size={15} aria-hidden="true"/><input required={required} minLength={required ? 2 : undefined} maxLength={160} value={query} placeholder={placeholder} aria-label={label} autoComplete="off" onChange={(event) => { setSelectedLabel(""); setQuery(event.target.value); setError(""); onChange(null, event.target.value); }}/><button type="button" onClick={chooseCurrentLocation} disabled={locating} aria-label="Use my current location" title="Use my current location"><LocateFixed size={16}/><span>{locating ? "Finding…" : "Use location"}</span></button></div>
    {(busy || places.length > 0) && <div className="place-suggestions" role="listbox" aria-label={`${label} suggestions`}>{busy && <span className="place-searching">Searching places…</span>}{places.map((place, index) => <button type="button" role="option" aria-selected="false" key={`${place.lat}-${place.lng}-${index}`} onClick={() => { setSelectedLabel(place.label); setQuery(place.label); setPlaces([]); setError(""); onChange(place, place.label); }}><MapPin size={14}/><span>{place.label}</span></button>)}</div>}
    {error && <small className="place-error" role="status">{error}</small>}
    <small className="place-attribution">Search by OpenStreetMap contributors</small>
  </div>;
}
