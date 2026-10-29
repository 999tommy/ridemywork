"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import PlacePicker, { type Place } from "./PlacePicker";
import { z } from "zod";
import { Activity, ArrowDownUp, ArrowLeft, ArrowRight, BadgeCheck, Bell, CalendarDays, CarFront, Check, ChevronRight, CircleHelp, Compass, Home, Inbox, LocateFixed, LogOut, MapPin, MessageCircle, Plus, Search, Shield, SlidersHorizontal, Sparkles, Star, Users, Wallet, X } from "lucide-react";

const RouteMap = dynamic(() => import("./RouteMap"), { ssr: false, loading: () => <div className="route-map-loading">Loading map…</div> });

type PrivateLocations = { origin_label:string;origin_lat:number;origin_lng:number;destination_label:string;destination_lat:number;destination_lng:number;pickup_label:string|null;pickup_lat:number|null;pickup_lng:number|null;dropoff_label:string|null;dropoff_lat:number|null;dropoff_lng:number|null };
type Trip = { id: string; origin: string; destination: string; departure_at: string; available_seats: number; contribution_per_seat: number; host_id: string; vehicle_id?: string | null; origin_lat?: number|null; origin_lng?: number|null; destination_lat?: number|null; destination_lng?: number|null; private_locations?: PrivateLocations|null; vehicle?: { make:string;model:string;color:string;verified:boolean } | null; profiles?: { display_name: string; username: string; avatar_path?: string | null; rating_average?: number | null; verified?: boolean } | null };
type SavedVehicle = { id: string; make: string; model: string; color: string; seats: number };
type SeatRequest = { id: string; status: string; boarding_code: string | null; seats_requested: number; passenger?: { display_name: string; verified:boolean; rating_average:number; avatar_path:string|null } | null; trip?: { id: string; origin: string; destination: string; departure_at: string; host_id: string } | null };
const nav = [
  { href: "/ride", label: "Home", icon: Home }, { href: "/ride/find", label: "Find", icon: Compass },
  { href: "/ride/offer", label: "Offer", icon: Plus }, { href: "/ride/activity", label: "Trips", icon: CalendarDays }, { href: "/ride/profile", label: "Profile", icon: Users },
];
const money = (n: number) => `₦${new Intl.NumberFormat("en-NG").format(n)}`;
const dayTime = (s: string) => new Date(s).toLocaleString("en-NG", { weekday: "short", hour: "numeric", minute: "2-digit" });
const tripSchema = z.object({ origin: z.string().trim().min(2).max(120), destination: z.string().trim().min(2).max(120), pickup: z.string().trim().max(160), dropoff: z.string().trim().max(160), make: z.string().trim().min(1).max(40), model: z.string().trim().min(1).max(50), color: z.string().trim().min(1).max(30), when: z.string().min(1), seats: z.coerce.number().int().min(1).max(8), contribution: z.coerce.number().int().min(0).max(5000), reason: z.enum(["Work","School","Appointment","Visiting family or friends","Event","Personal errand"]) }).refine((value)=>new Date(value.when).getTime()>Date.now(),{path:["when"]});

export default function RideApp() {
  const path = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [savedVehicles, setSavedVehicles] = useState<SavedVehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [query, setQuery] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [searchSeats, setSearchSeats] = useState("1");
  const [today, setToday] = useState("");
  const [working, setWorking] = useState(false);
  const [requests, setRequests] = useState<SeatRequest[]>([]);
  const [pushReady, setPushReady] = useState(false);
  const [boardingCodes, setBoardingCodes] = useState<Record<string,string>>({});
  const [backendError, setBackendError] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [routeEstimate, setRouteEstimate] = useState<{ distanceKm: number; durationMinutes: number; alternatives: number } | null>(null);
  const [routeEstimateMessage, setRouteEstimateMessage] = useState("");
  const [form, setForm] = useState({ origin: "", destination: "", originLabel: "", destinationLabel: "", pickupLabel: "", dropoffLabel: "", originLat: "", originLng: "", destinationLat: "", destinationLng: "", pickup: "", dropoff: "", pickupLat: "", pickupLng: "", dropoffLat: "", dropoffLng: "", make: "", model: "", color: "", when: "", seats: "2", contribution: "0", reason: "Work", vehicleId: "" });
  const isDemo = !supabase;

  useEffect(() => {
    if (!supabase) { setTrips([]); setReady(true); return; }
    let live = true;
    const start = async () => {
      const { data: { user: current } } = await supabase.auth.getUser();
      if (!live) return;
      setUser(current);
      if (current) {
        const { data } = await (supabase as any).from("profiles").select("*").eq("id", current.id).maybeSingle();
        let profileData=data;
        if(data?.avatar_path){const {data:signed}=await supabase.storage.from("member-media").createSignedUrl(data.avatar_path,3600);profileData={...data,avatar_url:signed?.signedUrl??null};}
        if (live) setProfile(profileData);
        const { data: ownedVehicles } = await (supabase as any).from("vehicles").select("id,make,model,color,seats").eq("owner_id", current.id).order("created_at", { ascending: false });
        if (live) setSavedVehicles((ownedVehicles as SavedVehicle[] | null) ?? []);
        const { data: requestData } = await (supabase as any).from("seat_requests").select("id,status,boarding_code,seats_requested,passenger:profiles!seat_requests_passenger_id_fkey(display_name,verified,rating_average,avatar_path),trip:trips!inner(id,origin,destination,departure_at,host_id)").order("created_at", { ascending: false }).limit(30);
        if (live) setRequests((requestData as SeatRequest[] | null) ?? []);
      }
      const { data, error } = await (supabase as any).from("trip_search").select("id,origin,destination,pickup_point,dropoff_point,departure_at,available_seats,contribution_per_seat,host_id,vehicle_id,origin_lat,origin_lng,destination_lat,destination_lng").gte("departure_at", new Date().toISOString()).order("departure_at").limit(12);
      let enriched: Trip[] = (data as Trip[] | null) ?? [];
      if (!error && enriched.length) {
        const hostIds = [...new Set(enriched.map((trip) => trip.host_id))];
        const vehicleIds = [...new Set(enriched.map((trip) => trip.vehicle_id).filter((id): id is string => Boolean(id)))];
        const [profiles,vehicles] = await Promise.all([
          (supabase as any).from("profiles").select("id,display_name,username,avatar_path,rating_average,verified").in("id",hostIds),
          vehicleIds.length ? (supabase as any).from("vehicles").select("id,make,model,color,verified").in("id",vehicleIds) : Promise.resolve({data:[]}),
        ]);
        enriched = enriched.map((trip) => ({ ...trip, profiles:profiles.data?.find((profile:any)=>profile.id===trip.host_id)??null, vehicle:vehicles.data?.find((vehicle:any)=>vehicle.id===trip.vehicle_id)??null }));
        const { data: privateLocations } = await (supabase as any).from("trip_private_locations").select("trip_id,origin_label,origin_lat,origin_lng,destination_label,destination_lat,destination_lng,pickup_label,pickup_lat,pickup_lng,dropoff_label,dropoff_lat,dropoff_lng").in("trip_id", enriched.map((trip)=>trip.id));
        enriched = enriched.map((trip) => ({ ...trip, private_locations:privateLocations?.find((location:any)=>location.trip_id===trip.id)??null }));
      }
      if (live) { setBackendError(Boolean(error)); setTrips(enriched); setReady(true); }
    };
    void start();
    const channel = supabase.channel("ride-live").on("postgres_changes", { event: "*", schema: "public", table: "trips" }, () => { void start(); }).on("postgres_changes", { event: "*", schema: "public", table: "seat_requests" }, () => { void start(); }).subscribe();
    return () => { live = false; void supabase.removeChannel(channel); };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !user) return;
    let live = true;
    const refresh = async () => {
      const {data} = await (supabase as any).from("notifications").select("id,kind,title,body,href,read_at,created_at").order("created_at",{ascending:false}).limit(12);
      if(live) setNotifications(data??[]);
    };
    void refresh();
    const channel=supabase.channel("ride-notifications").on("postgres_changes",{event:"INSERT",schema:"public",table:"notifications",filter:`owner_id=eq.${user.id}`},()=>void refresh()).subscribe();
    return()=>{live=false;void supabase.removeChannel(channel);};
  },[supabase,user]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").then(() => setPushReady(true)).catch(() => setPushReady(false));
  }, []);

  useEffect(() => {
    setToday(new Intl.DateTimeFormat("en-NG", { weekday: "long", month: "long", day: "numeric" }).format(new Date()).toUpperCase());
    setDepartureDate(new Date().toISOString().slice(0, 10));
  }, []);
  useEffect(() => {
    if (!form.originLat || !form.originLng || !form.destinationLat || !form.destinationLng) { setRouteEstimate(null); setRouteEstimateMessage(""); return; }
    const controller = new AbortController();
    const params = new URLSearchParams({ originLat: form.originLat, originLng: form.originLng, destinationLat: form.destinationLat, destinationLng: form.destinationLng });
    setRouteEstimateMessage("Finding the fastest mapped route…");
    void fetch(`/api/route-estimate?${params}`, { signal: controller.signal }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Route estimate unavailable.");
      setRouteEstimate(result);
      const fuelReference = 1600; // NBS May 2026 national monthly average, rounded for an illustrative estimate.
      const litresPer100Km = 8;
      const cityTrafficFactor = 1.35;
      const sharedFuel = result.distanceKm * fuelReference * litresPer100Km / 100 * cityTrafficFactor / (Number(form.seats) + 1);
      setForm((current) => ({ ...current, contribution: String(Math.min(5000, Math.max(0, Math.round(sharedFuel / 100) * 100))) }));
      setRouteEstimateMessage("");
    }).catch((cause) => { if (!controller.signal.aborted) { setRouteEstimate(null); setRouteEstimateMessage(cause instanceof Error ? cause.message : "Route estimate unavailable."); } });
    return () => controller.abort();
  }, [form.originLat, form.originLng, form.destinationLat, form.destinationLng, form.seats]);
  useEffect(() => {
    if (!path.includes("find")) return;
    const params = new URLSearchParams(window.location.search);
    const from = params.get("from") ?? "";
    const to = params.get("to") ?? "";
    setOrigin(from); setDestination(to);
    setQuery([from, to].filter(Boolean).join(" "));
    setDepartureDate(params.get("when") ?? "");
    setSearchSeats(params.get("seats") ?? "1");
  }, [path]);

  const notify = useCallback((message: string) => { setToast(message); window.setTimeout(() => setToast(""), 3200); }, []);
  const signOut = async () => { await supabase?.auth.signOut(); router.push("/auth"); };
  const submitSearch = (event: React.FormEvent) => { event.preventDefault(); const params = new URLSearchParams(); if (origin) params.set("from", origin); if (destination) params.set("to", destination); if (departureDate) params.set("when", departureDate); if (searchSeats) params.set("seats", searchSeats); router.push(`/ride/find?${params.toString()}`); };
  const filtered = trips.filter((t) => query.trim().toLowerCase().split(/\s+/).filter(Boolean).every((part) => `${t.origin} ${t.destination}`.toLowerCase().includes(part)) && (!departureDate || new Date(t.departure_at).toISOString().slice(0,10) === departureDate) && t.available_seats >= Number(searchSeats || 1));
  const isTripHost = profile?.account_type === "trip_host";
  const hostedTrips = trips.filter((trip) => trip.host_id === user?.id);
  const incomingRequests = requests.filter((request) => request.trip?.host_id === user?.id && request.status === "pending");
  const createTrip = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.originLat || !form.originLng || !form.destinationLat || !form.destinationLng) { notify("Choose the starting point and destination from the map suggestions, or use your current location."); return; }
    const parsed = tripSchema.safeParse(form);
    if (!parsed.success) { notify("Check the route, departure time, seats and contribution, then try again."); return; }
    if (!supabase || !user) { router.push("/auth"); return; }
    setWorking(true);
    const response = await fetch("/api/trips", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...parsed.data, originLabel: form.originLabel, destinationLabel: form.destinationLabel, pickupLabel: form.pickupLabel, dropoffLabel: form.dropoffLabel, originLat: Number(form.originLat), originLng: Number(form.originLng), destinationLat: Number(form.destinationLat), destinationLng: Number(form.destinationLng), pickupLat: form.pickupLat ? Number(form.pickupLat) : null, pickupLng: form.pickupLng ? Number(form.pickupLng) : null, dropoffLat: form.dropoffLat ? Number(form.dropoffLat) : null, dropoffLng: form.dropoffLng ? Number(form.dropoffLng) : null, vehicleId: form.vehicleId || null, departureAt: new Date(parsed.data.when).toISOString(), existingJourneyConfirmed: true }) });
    const result = await response.json().catch(() => ({}));
    setWorking(false);
    if (!response.ok) notify(result.error ?? "We couldn’t publish this trip. Try again."); else { notify("Your trip is live. Passengers can now request a seat."); router.push("/ride/activity"); }
  };
  const requestSeat = async (trip: Trip) => {
    if (!supabase || !user) { router.push("/auth"); return; }
    if (trip.host_id === user.id) { notify("You’re the Trip Host for this journey. You can manage it in Trips, but can’t request a seat in your own vehicle."); return; }
    const { error } = await (supabase as any).rpc("request_trip_seat", { p_trip_id: trip.id, p_seats: 1 });
    notify(error ? error.message : "Request sent to the Trip Host.");
    if (!error) { const {data}=await (supabase as any).from("seat_requests").select("id,status,boarding_code,seats_requested,passenger:profiles!seat_requests_passenger_id_fkey(display_name,verified,rating_average,avatar_path),trip:trips!inner(id,origin,destination,departure_at,host_id)").order("created_at",{ascending:false}).limit(30); setRequests((data as SeatRequest[]|null)??[]); router.push("/ride/activity"); }
  };
  const reviewRequest = async (requestId: string, decision: "approved" | "rejected") => {
    if (!supabase) return;
    const { error } = await (supabase as any).rpc("review_seat_request", { p_request_id: requestId, p_decision: decision });
    if (error) notify(error.message); else { notify(decision === "approved" ? "Seat approved. A boarding code was created." : "Request declined."); setRequests((items) => items.map((item) => item.id === requestId ? { ...item, status: decision } : item)); }
  };
  const confirmBoarding = async (requestId: string) => {
    if (!supabase) return;
    const { error } = await (supabase as any).rpc("confirm_trip_boarding", { p_request_id: requestId, p_code: boardingCodes[requestId] ?? "" });
    if (error) notify(error.message); else { notify("Boarding confirmed. Have a safe journey."); setRequests((items) => items.map((item) => item.id === requestId ? { ...item, status: "boarded" } : item)); }
  };
  const enablePush = async () => {
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!supabase || !user || !key || !pushReady) { notify("Background push needs a configured VAPID key and Supabase connection."); return; }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") { notify("Notifications are disabled in your browser settings."); return; }
    const registration = await navigator.serviceWorker.ready;
    const applicationServerKey = Uint8Array.from(atob(key.replace(/-/g, "+").replace(/_/g, "/")), (char) => char.charCodeAt(0));
    const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
    const { error } = await (supabase as any).from("push_subscriptions").upsert({ owner_id: user.id, endpoint: subscription.endpoint, subscription: subscription.toJSON() }, { onConflict: "endpoint" });
    notify(error ? error.message : "This device is ready for RideMyWork notifications.");
  };

  const current = path === "/ride" ? "Home" : path.includes("find") ? "Find a ride" : path.includes("offer") ? "Offer a ride" : path.includes("activity") ? "Your trips" : path.includes("inbox") ? "Messages" : path.includes("profile") ? "Your profile" : path.includes("commutes") ? "Recurring commute" : path.includes("communities") ? "Communities" : path.includes("safety") ? "Safety" : path.includes("trips/") ? "Trip details" : "RideMyWork";

  return <div className="rmw-app">
    <aside className="rmw-sidebar"><Link className="rmw-brand" href="/ride"><span className="rmw-brand-mark">R</span><span>RideMyWork<small>Move together</small></span></Link><p className="rmw-nav-label">YOUR SPACE</p><nav>{nav.map(({ href, label, icon: Icon }) => <Link key={href} className={current === label || (href === "/ride" && current === "Home") ? "rmw-nav-link active" : "rmw-nav-link"} href={href}><Icon size={19}/>{label}{label === "Offer" && <span className="nav-plus">+</span>}</Link>)}</nav><div className="rmw-sidebar-spacer"/><Link href="/ride/inbox" className="rmw-nav-link"><MessageCircle size={19}/>Messages</Link><Link href="/ride/commutes" className="rmw-nav-link"><ArrowDownUp size={19}/>My commute</Link><Link href="/ride/communities" className={current === "Communities" ? "rmw-nav-link active" : "rmw-nav-link"}><Users size={19}/>Communities</Link><Link href="/ride/safety" className={current === "Safety" ? "rmw-nav-link active" : "rmw-nav-link"}><Shield size={19}/>Safety & support</Link><Link href="/about" className="rmw-nav-link"><CircleHelp size={19}/>About RideMyWork</Link><div className="rmw-account"><div className="avatar">{profile?.display_name?.slice(0, 1) ?? "R"}</div><div><strong>{profile?.display_name ?? "Your account"}</strong><small>{profile?.verified ? "Verified member" : "Complete your profile"}</small></div><button aria-label="Sign out" onClick={signOut}><LogOut size={17}/></button></div></aside>
    <main className="rmw-main"><header className="rmw-topbar"><div className="rmw-mobile-brand"><span className="rmw-brand-mark">R</span> RideMyWork</div><div className="rmw-breadcrumb">Lagos <ChevronRight size={14}/> {current}</div><div className="top-actions"><span className="online-dot"/> Lagos, Nigeria <button aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen(!notificationsOpen)}><Bell size={18}/>{notifications.some((item)=>!item.read_at)&&<i className="notification-dot"/>}</button></div>{notificationsOpen&&<div className="notification-popover"><div className="notification-header"><strong>Notifications</strong><button onClick={()=>setNotificationsOpen(false)} aria-label="Close notifications"><X size={15}/></button></div>{notifications.length?notifications.map((item)=><Link key={item.id} href={item.href?.startsWith("/")?item.href:"/ride/activity"} onClick={()=>{if(supabase)void (supabase as any).from("notifications").update({read_at:new Date().toISOString()}).eq("id",item.id);setNotifications((rows)=>rows.map((row)=>row.id===item.id?{...row,read_at:new Date().toISOString()}:row));setNotificationsOpen(false);}} className={`notification-item ${item.read_at?"":"unread"}`}><strong>{item.title}</strong><span>{item.body}</span><small>{new Date(item.created_at).toLocaleString("en-NG",{weekday:"short",hour:"numeric",minute:"2-digit"})}</small></Link>):<p className="notification-empty">No updates yet. New trip requests and messages will show here.</p>}</div>}</header>
      <div className="rmw-content">
        {(isDemo || backendError) && <div className="setup-note"><Sparkles size={16}/><span><strong>{isDemo?"Preview mode.":"Database setup needed."}</strong> {isDemo?"Add your Supabase project URL and anon key to activate accounts and live trips.":"Run the RideMyWork SQL migration in your Supabase SQL Editor to create the app tables and access policies."}</span>{isDemo&&<Link href="/auth">Set up account <ArrowRight size={15}/></Link>}</div>}
        {path === "/ride" && <>
          {isTripHost ? <>
            <section className="welcome-row"><div><span className="overline">TRIP HOST SPACE · {today||"LAGOS, NIGERIA"}</span><h1>Your journeys{profile?.display_name ? `, ${profile.display_name.split(" ")[0]}` : ""}.</h1><p>Manage the trips you already planned and the passengers joining you.</p></div><Link className="button secondary-action" href="/ride/offer"><Plus size={17}/> Share a journey</Link></section>
            <section className="host-dashboard-summary"><article><span className="overline">NEEDS YOUR REVIEW</span><strong>{incomingRequests.length}</strong><p>Passenger seat requests</p><Link href="/ride/activity">Review requests <ArrowRight size={15}/></Link></article><article><span className="overline">YOUR OPEN JOURNEYS</span><strong>{hostedTrips.length}</strong><p>Trips currently visible to passengers</p><Link href="/ride/offer">Add a trip <ArrowRight size={15}/></Link></article><article><span className="overline">TRAVEL BOTH WAYS</span><strong>Passenger too</strong><p>Your account can also join a trip.</p><Link href="/ride/find">Find a trip <ArrowRight size={15}/></Link></article></section>
          </> : <>
            <section className="welcome-row"><div><span className="overline">{today||"LAGOS, NIGERIA"}</span><h1>Where are you headed{profile?.display_name ? `, ${profile.display_name.split(" ")[0]}` : ""}?</h1><p>Find someone already going your way.</p></div><Link className="button secondary-action" href="/ride/offer"><Plus size={17}/> Share a journey</Link></section>
            <form onSubmit={submitSearch} className="search-panel"><div className="search-fields"><label><span>FROM</span><MapPin size={17}/><input value={origin} onChange={e=>setOrigin(e.target.value)} placeholder="Your starting point" aria-label="Starting point"/></label><div className="swap-icon"><ArrowDownUp size={17}/></div><label><span>TO</span><LocateFixed size={17}/><input value={destination} onChange={e=>setDestination(e.target.value)} placeholder="Where to?" aria-label="Destination"/></label><label className="date-field"><span>WHEN</span><CalendarDays size={17}/><input aria-label="Departure date" type="date" value={departureDate} onChange={e=>setDepartureDate(e.target.value)}/></label><label className="seat-field"><span>SEATS</span><CarFront size={17}/><select aria-label="Number of seats" value={searchSeats} onChange={e=>setSearchSeats(e.target.value)}><option value="1">1 seat</option><option value="2">2 seats</option><option value="3">3 seats</option></select></label></div><button className="button primary-action" type="submit"><Search size={18}/> Find a trip</button></form>
            <div className="quick-routes"><span>Popular routes</span>{["Lekki → Victoria Island", "Ikeja → Lekki", "Yaba → VI"].map(route=><button key={route} onClick={()=>{const [a,b]=route.split(" → ");setOrigin(a);setDestination(b);}}>{route}</button>)}</div>
          </>}
          <section className="section-block"><div className="section-title-row"><div><span className="overline">{isTripHost?"YOUR UPCOMING TRIPS":"MADE FOR YOUR ROUTINE"}</span><h2>{isTripHost?"Journeys you’re hosting":"Trips near your route"}</h2></div><Link href={isTripHost?"/ride/activity":"/ride/find"}>{isTripHost?"Manage trips":"See all trips"} <ArrowRight size={16}/></Link></div><div className="trip-layout"><div className="trip-list">{!ready ? <div className="skeleton-trip"/> : isTripHost ? hostedTrips.length ? hostedTrips.slice(0,2).map((trip)=><TripCard key={trip.id} trip={trip} isOwn onRequest={()=>void requestSeat(trip)}/>) : <div className="inline-empty"><strong>No trips hosted yet</strong><span>Share a journey you already planned to welcome passengers.</span><Link href="/ride/offer">Create a trip <ArrowRight size={14}/></Link></div> : trips.length ? trips.slice(0,2).map((trip)=><TripCard key={trip.id} trip={trip} isOwn={trip.host_id===user?.id} onRequest={()=>void requestSeat(trip)}/>) : <div className="inline-empty"><strong>No open trips yet</strong><span>Share a journey or check back soon.</span><Link href="/ride/offer">Offer a trip <ArrowRight size={14}/></Link></div>}</div><MapPanel trips={(isTripHost?hostedTrips:trips).slice(0,2)}/></div></section>
          {!isTripHost&&<section className="bottom-promo"><div className="promo-icon"><CarFront size={23}/></div><div><span className="overline">ALREADY ON THE ROAD?</span><h3>Share the seats you have open.</h3><p>Offer a trip you were already making and meet verified people travelling your way.</p></div><Link className="button light-action" href="/ride/offer">Offer a trip <ArrowRight size={16}/></Link></section>}
        </>}
        {path.includes("find") && <><BackLink/><div className="page-heading"><span className="overline">FIND YOUR WAY TOGETHER</span><h1>Trips going your way</h1><p>Compare journeys, contributions and the people you could travel with.</p></div><div className="filter-bar"><div className="filter-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search a place or route"/></div><label className="filter-control"><CalendarDays size={16}/><input aria-label="Filter by date" type="date" value={departureDate} onChange={e=>setDepartureDate(e.target.value)}/></label><label className="filter-control"><CarFront size={16}/><select aria-label="Minimum available seats" value={searchSeats} onChange={e=>setSearchSeats(e.target.value)}><option value="1">1+ seat</option><option value="2">2+ seats</option><option value="3">3+ seats</option></select></label></div><div className="trip-layout results-layout"><div className="trip-list">{filtered.length ? filtered.map(t=><TripCard key={t.id} trip={t} isOwn={t.host_id===user?.id} onRequest={()=>void requestSeat(t)}/>) : <EmptyState title="No trips match this search" copy="Try a nearby location or another date. New journeys are added regularly." action="Offer a trip" href="/ride/offer"/>}</div><MapPanel trips={filtered.slice(0,2)}/></div></>}
        {path.includes("offer") && <><BackLink/><div className="page-heading"><span className="overline">SHARE A JOURNEY</span><h1>Where are you already going?</h1><p>List seats on a trip you planned independently of RideMyWork passengers.</p></div><div className="offer-layout"><form className="form-card offer-form" onSubmit={createTrip} noValidate>
  <div className="step-indicator"><span className="step-active">1</span><i/><span>2</span><i/><span>3</span><small>TRIP DETAILS</small></div>
  <div className="form-section-title"><h2>Your route</h2><p>Start with the journey you already have planned.</p></div>
  <div className="field-label"><span>Starting point</span><PlacePicker label="Starting point" value={form.originLabel} placeholder="Search an area or use your location" onChange={(place: Place | null, text: string) => setForm((current) => ({ ...current, origin: place?.area ?? text, originLabel: text, originLat: place ? String(place.lat) : "", originLng: place ? String(place.lng) : "" }))}/></div>
  <div className="field-label"><span>Destination</span><PlacePicker label="Destination" value={form.destinationLabel} placeholder="Search a destination" onChange={(place: Place | null, text: string) => setForm((current) => ({ ...current, destination: place?.area ?? text, destinationLabel: text, destinationLat: place ? String(place.lat) : "", destinationLng: place ? String(place.lng) : "" }))}/></div>
  <p className="place-privacy-note">Other members see the general route first. Exact points are shared with approved passengers.</p>
  <div className="field-row"><div className="field-label"><span>Pickup point <small>(optional)</small></span><PlacePicker required={false} label="Pickup point" value={form.pickupLabel} placeholder="Search or use your location" onChange={(place: Place | null, text: string) => setForm((current) => ({ ...current, pickup: place?.area ?? text, pickupLabel: text, pickupLat: place ? String(place.lat) : "", pickupLng: place ? String(place.lng) : "" }))}/></div><div className="field-label"><span>Drop-off point <small>(optional)</small></span><PlacePicker required={false} label="Drop-off point" value={form.dropoffLabel} placeholder="Search a drop-off place" onChange={(place: Place | null, text: string) => setForm((current) => ({ ...current, dropoff: place?.area ?? text, dropoffLabel: text, dropoffLat: place ? String(place.lat) : "", dropoffLng: place ? String(place.lng) : "" }))}/></div></div>
  <div className="field-row"><label className="field-label">Departure<input required type="datetime-local" value={form.when} onChange={e=>setForm({...form,when:e.target.value})}/></label><label className="field-label">Available seats<select value={form.seats} onChange={e=>setForm({...form,seats:e.target.value})}>{Array.from({length:Math.min(4,savedVehicles.find(vehicle=>vehicle.id===form.vehicleId)?.seats??4)},(_,index)=><option key={index+1} value={index+1}>{index+1} seat{index===0?"":"s"}</option>)}</select></label></div>
  <div className="form-section-title vehicle-title"><h2>Your vehicle</h2><p>New vehicles are saved to your profile for next time.</p></div>
  <label className="field-label">Saved vehicle<select value={form.vehicleId} onChange={event=>{const vehicle=savedVehicles.find(item=>item.id===event.target.value);setForm(current=>({...current,vehicleId:event.target.value,make:vehicle?.make??"",model:vehicle?.model??"",color:vehicle?.color??"",seats:vehicle?String(Math.min(Number(current.seats),vehicle.seats)):current.seats}));}}><option value="">Add a vehicle</option>{savedVehicles.map(vehicle=><option key={vehicle.id} value={vehicle.id}>{vehicle.color} {vehicle.make} {vehicle.model} · up to {vehicle.seats} seats</option>)}</select></label>
  {!form.vehicleId&&<><div className="field-row"><label className="field-label">Make<input required maxLength={40} placeholder="e.g. Toyota" value={form.make} onChange={e=>setForm({...form,make:e.target.value})}/></label><label className="field-label">Model<input required maxLength={50} placeholder="e.g. Corolla" value={form.model} onChange={e=>setForm({...form,model:e.target.value})}/></label></div><label className="field-label">Vehicle colour<input required maxLength={30} placeholder="e.g. Silver" value={form.color} onChange={e=>setForm({...form,color:e.target.value})}/></label></>}
  <label className="field-label">Why are you making this trip?<select value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})}>{["Work","School","Appointment","Visiting family or friends","Event","Personal errand"].map(x=><option key={x}>{x}</option>)}</select></label>
  <div className="contribution-box"><div><Wallet size={18}/><div><strong>Shared cost per seat</strong><small>{routeEstimate?`Suggested fuel share · about ${routeEstimate.distanceKm.toFixed(1)} km`:(routeEstimateMessage||"Choose a route to estimate the shared cost")}</small></div></div><label aria-label="Contribution per seat"><span>₦</span><input type="number" min="0" max="5000" step="100" value={form.contribution} onChange={e=>setForm({...form,contribution:e.target.value})}/></label></div>
  {routeEstimate&&<p className="route-estimate-note">Fastest mapped route: about {Math.round(routeEstimate.durationMinutes)} min{routeEstimate.alternatives>1?` · ${routeEstimate.alternatives-1} alternative route${routeEstimate.alternatives>2?"s":""} found`:""}. Fuel estimate uses about ₦1,600/litre, 8 L/100 km and a 35% city-driving allowance, split between the host and listed seats. Adjust it as needed; it does not use live traffic or include tolls.</p>}
  <label className="check-row"><input type="checkbox" required/><span>I am already making this trip independently of passengers joining through RideMyWork.</span></label><p className="helper-text"><Shield size={14}/> RideMyWork is carpooling, not commercial driving. Contributions are for sharing the cost of an existing journey.</p><button disabled={working} className="button primary-action full-action">{working ? "Publishing…" : "Share this trip"}<ArrowRight size={17}/></button>
</form><aside className="offer-aside"><div className="map-placeholder large-map"><MapPanel trips={[]} preview={{origin:form.pickup||form.origin,destination:form.dropoff||form.destination,origin_lat:Number(form.pickupLat||form.originLat)||null,origin_lng:Number(form.pickupLng||form.originLng)||null,destination_lat:Number(form.dropoffLat||form.destinationLat)||null,destination_lng:Number(form.dropoffLng||form.destinationLng)||null}}/></div><div className="aside-tip"><BadgeCheck size={20}/><div><strong>Trust starts before pickup</strong><p>Passengers can view your profile, vehicle information and trip history before requesting a seat.</p></div></div></aside></div></>}
        {path.includes("activity") && <><div className="page-heading"><span className="overline">YOUR JOURNEYS</span><h1>Your trips</h1><p>Stay on top of requests, confirmations and upcoming journeys.</p></div><div className="tabs-row"><button className="selected">Requests & bookings <span>{requests.length}</span></button></div>{requests.length ? <div className="request-list">{requests.map((request)=><article key={request.id} className="request-card"><div><span className="overline">{request.trip?.host_id===user?.id?"PASSENGER REQUEST":"YOUR SEAT REQUEST"}</span>{request.trip?.host_id===user?.id&&request.passenger&&<div className="passenger-summary"><span className="passenger-avatar">{request.passenger.display_name.slice(0,1)}</span><span><strong>{request.passenger.display_name}</strong><small>{request.passenger.verified?<><BadgeCheck size={12}/> Verified member</>:"Verification pending"} · {request.passenger.rating_average?`${request.passenger.rating_average.toFixed(1)} rating`:"New member"}</small></span></div>}<h2>{request.trip?.origin ?? "Trip"} <span>→</span> {request.trip?.destination ?? ""}</h2><p>{request.trip ? dayTime(request.trip.departure_at) : "Journey details"} · {request.seats_requested} seat{request.seats_requested===1?"":"s"}</p><span className={`request-status status-${request.status}`}>{request.status.replace("_"," ")}</span>{request.boarding_code&&<div className="boarding-code"><small>BOARDING CODE</small><strong>{request.boarding_code}</strong></div>}</div>{request.trip?.host_id===user?.id&&request.status==="pending"&&<div className="request-actions"><button className="button primary-action" onClick={()=>void reviewRequest(request.id,"approved")}>Approve</button><button className="button outline-action" onClick={()=>void reviewRequest(request.id,"rejected")}>Decline</button></div>}{request.trip?.host_id===user?.id&&request.status==="approved"&&<div className="boarding-confirm"><input aria-label="Passenger boarding code" placeholder="Enter boarding code" value={boardingCodes[request.id]??""} onChange={e=>setBoardingCodes({...boardingCodes,[request.id]:e.target.value.toUpperCase()})}/><button className="button primary-action" onClick={()=>void confirmBoarding(request.id)}>Confirm boarding</button></div>}</article>)}</div>:<EmptyState title="Your next journey starts here" copy="When you request a seat or share a trip, you’ll find the details here." action="Find a trip" href="/ride/find"/>}</>}
        {path.includes("inbox") && <InboxView supabase={supabase} user={user} requests={requests} notify={notify}/>}
        {path.includes("profile") && <><div className="page-heading"><span className="overline">YOUR RIDE PROFILE</span><h1>Your profile</h1><p>Help other members feel confident about sharing a journey with you.</p></div><div className="profile-card"><div className="profile-avatar" style={profile?.avatar_url?{backgroundImage:`url(${profile.avatar_url})`}:undefined}>{profile?.display_name?.slice(0,1) ?? "R"}</div><div><h2>{profile?.display_name ?? "Welcome to RideMyWork"}</h2><p>{profile?.username ? `@${profile.username}` : "Your account details will appear here."}</p></div><span className="verified-pill"><BadgeCheck size={15}/>{profile?.verified ? "Verified" : "Verification pending"}</span><div className="profile-stats"><span><strong>{profile?.trips_completed ?? 0}</strong>Trips completed</span><span><strong>{profile?.rating_average ? profile.rating_average.toFixed(1) : "—"}</strong>Rating</span><span><strong>{profile?.co2_saved_kg ? `${profile.co2_saved_kg}kg` : "—"}</strong>CO₂ saved</span></div><ProfileEditor supabase={supabase} user={user} profile={profile} onSaved={setProfile} notify={notify}/><div className="profile-links"><Link href="/ride/commutes"><ArrowDownUp/> Recurring commutes <ChevronRight/></Link><Link href="/ride/communities"><Users/> Communities <ChevronRight/></Link><Link href="/ride/safety"><Shield/> Safety & support <ChevronRight/></Link><Link href="/ride/inbox"><MessageCircle/> Messages <ChevronRight/></Link><button onClick={()=>void enablePush()}><Bell/> Enable notifications <ChevronRight/></button><button onClick={()=>void signOut()}><LogOut/> Sign out <ChevronRight/></button></div></div></>}
        {path.includes("commutes") && <><BackLink/><div className="page-heading"><span className="overline">SET IT ONCE. RIDE IT REGULARLY.</span><h1>Your commute happens every week.</h1><p>Save a regular route and find people sharing the same routine.</p></div><CommuteForm supabase={supabase} user={user} notify={notify}/></>}
        {path.includes("communities") && <CommunitiesView supabase={supabase} user={user} notify={notify}/>}
        {path.includes("safety") && <SafetyView supabase={supabase} user={user} notify={notify}/>}
        {path.includes("trips/") && <TripDetail id={path.split("/").pop() ?? ""} trips={trips} userId={user?.id} requestSeat={requestSeat}/>}
      </div>
    </main>
    <nav className="rmw-bottom-nav" aria-label="Main navigation">{nav.map(({href,label,icon:Icon})=><Link key={href} href={href} className={current===label?"active":""}><Icon size={20}/><span>{label}</span></Link>)}</nav>
    {toast && <div role="status" className="toast"><Check size={17}/>{toast}<button onClick={()=>setToast("")} aria-label="Dismiss"><X size={15}/></button></div>}
  </div>;
}

function BackLink(){return <Link href="/ride" className="back-link"><ArrowLeft size={16}/> Back to home</Link>}
function TripCard({trip,onRequest,isOwn=false}:{trip:Trip;onRequest:()=>void;isOwn?:boolean}){return <article className="trip-card"><div className="trip-card-top"><div className="driver-avatar">{trip.profiles?.display_name?.slice(0,1) ?? "R"}</div><div className="driver-info"><strong>{trip.profiles?.display_name ?? "RideMyWork member"} {trip.profiles?.verified && <BadgeCheck size={15} className="verified-icon"/>}</strong><span><Star size={13} fill="currentColor"/> {trip.profiles?.rating_average?.toFixed(1) ?? "New member"} <i/> Trip Host</span>{trip.vehicle&&<small className="vehicle-meta">{trip.vehicle.color} {trip.vehicle.make} {trip.vehicle.model}</small>}</div><span className="seats-tag"><CarFront size={14}/>{trip.available_seats} seats</span></div><div className="route-summary"><div className="route-stops"><div><i className="origin-dot"/><span>{trip.origin}</span></div><span className="route-connector"/><div><i className="destination-dot"/><span>{trip.destination}</span></div></div><div className="trip-time">{dayTime(trip.departure_at)}</div></div><div className="trip-card-bottom"><div><small>Shared cost per seat</small><strong className="trip-price">{money(trip.contribution_per_seat)}</strong></div><Link className="button outline-action card-cta" href={isOwn?"/ride/activity":`/ride/trips/${trip.id}`}>{isOwn?"Manage requests":"View trip"} <ArrowRight size={15}/></Link></div>{!isOwn&&<button aria-label={`Request a seat with ${trip.profiles?.display_name ?? "Trip Host"}`} className="trip-quick-request" onClick={onRequest}>Request a seat</button>}</article>}
function MapPanel({trips,preview}:{trips:Trip[];preview?:Partial<Trip>}) {
  const mappedTrip = preview ?? trips.find((trip) => trip.origin_lat && trip.origin_lng && trip.destination_lat && trip.destination_lng);
  const exact = mappedTrip?.private_locations;
  const routeStartLat = exact?.pickup_lat ?? exact?.origin_lat ?? mappedTrip?.origin_lat;
  const routeStartLng = exact?.pickup_lng ?? exact?.origin_lng ?? mappedTrip?.origin_lng;
  const routeEndLat = exact?.dropoff_lat ?? exact?.destination_lat ?? mappedTrip?.destination_lat;
  const routeEndLng = exact?.dropoff_lng ?? exact?.destination_lng ?? mappedTrip?.destination_lng;
  const hasRoute = routeStartLat != null && routeStartLng != null && routeEndLat != null && routeEndLng != null;
  const startLat = hasRoute ? Number(routeStartLat) : 6.465;
  const startLng = hasRoute ? Number(routeStartLng) : 3.406;
  const endLat = hasRoute ? Number(routeEndLat) : startLat;
  const endLng = hasRoute ? Number(routeEndLng) : startLng;
  const directionsUrl = hasRoute ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${startLat}%2C${startLng}%3B${endLat}%2C${endLng}` : "";
  const trafficUrl = hasRoute ? `https://www.google.com/maps/dir/?api=1&origin=${startLat},${startLng}&destination=${endLat},${endLng}&travelmode=driving` : "";
  const label = mappedTrip?.origin && mappedTrip?.destination ? `${mappedTrip.origin} to ${mappedTrip.destination}` : trips.length ? `${trips.length} trips nearby` : "Lagos, Nigeria";
  const startPoint = hasRoute ? { lat: startLat, lng: startLng, label: exact?.pickup_label ?? exact?.origin_label ?? mappedTrip?.origin ?? "Trip start" } : undefined;
  const endPoint = hasRoute ? { lat: endLat, lng: endLng, label: exact?.dropoff_label ?? exact?.destination_label ?? mappedTrip?.destination ?? "Destination" } : undefined;
  return <aside className="map-panel"><div className="map-head"><div><span className="overline">ROUTE PREVIEW</span><strong>{label}</strong></div><span className="map-live"><i/> MAP</span></div><div className="map-frame"><RouteMap start={startPoint} end={endPoint}/><div className="map-overlay-pill"><MapPin size={14}/> {label}</div></div><div className="map-legend"><span><i className="legend-start"/> Start</span><span><i className="legend-end"/> Destination</span>{directionsUrl&&<a href={directionsUrl} target="_blank" rel="noreferrer">Open mapped route <ArrowRight size={13}/></a>}{trafficUrl&&<a href={trafficUrl} target="_blank" rel="noreferrer">Check live traffic <ArrowRight size={13}/></a>}</div></aside>;
}
function EmptyState({title,copy,action,href}:{title:string;copy:string;action:string;href:string}){return <div className="empty-state"><span className="empty-icon"><Compass size={22}/></span><h2>{title}</h2><p>{copy}</p><Link className="button primary-action" href={href}>{action}<ArrowRight size={16}/></Link></div>}
function CommuteForm({supabase,user,notify}:{supabase:any;user:any;notify:(message:string)=>void}) {
  const [origin,setOrigin]=useState("");const [destination,setDestination]=useState("");const [time,setTime]=useState("07:00");const [seats,setSeats]=useState("1");const [days,setDays]=useState([1,2,3,4,5]);
  const save=async(event:React.FormEvent)=>{event.preventDefault();if(!supabase||!user){notify("Connect your account before saving a commute.");return;}const {error}=await supabase.from("recurring_commutes").insert({owner_id:user.id,origin,destination,weekdays:days,preferred_time:time,seats:Number(seats),role:"passenger"});notify(error?error.message:"Your recurring commute is saved.");};
  return <form className="form-card commute-form" onSubmit={save}><h2>Build your regular route</h2><label className="field-label">From<input required minLength={2} value={origin} onChange={e=>setOrigin(e.target.value)} placeholder="e.g. Lekki Phase 1"/></label><label className="field-label">To<input required minLength={2} value={destination} onChange={e=>setDestination(e.target.value)} placeholder="e.g. Victoria Island"/></label><div className="weekday-picker">{["M","T","W","T","F","S","S"].map((d,i)=><label key={i}><input type="checkbox" checked={days.includes(i+1)} onChange={()=>setDays(days.includes(i+1)?days.filter(x=>x!==i+1):[...days,i+1].sort())}/><span>{d}</span></label>)}</div><div className="field-row"><label className="field-label">Preferred time<input type="time" value={time} onChange={e=>setTime(e.target.value)}/></label><label className="field-label">Seats<select value={seats} onChange={e=>setSeats(e.target.value)}><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></label></div><button disabled={days.length===0} className="button primary-action full-action">Save commute <ArrowRight size={17}/></button></form>;
}
function ProfileEditor({supabase,user,profile,onSaved,notify}:{supabase:any;user:any;profile:any;onSaved:(profile:any)=>void;notify:(message:string)=>void}) {
  const [open,setOpen]=useState(false);const [name,setName]=useState(profile?.display_name??"");const [bio,setBio]=useState(profile?.bio??"");const [area,setArea]=useState(profile?.home_area??"");const [busy,setBusy]=useState(false);
  useEffect(()=>{setName(profile?.display_name??"");setBio(profile?.bio??"");setArea(profile?.home_area??"");},[profile]);
  const save=async(event:React.FormEvent)=>{event.preventDefault();if(!supabase||!user)return;setBusy(true);const {data,error}=await supabase.from("profiles").update({display_name:name.trim(),bio:bio.trim()||null,home_area:area.trim()||null}).eq("id",user.id).select("*").single();setBusy(false);if(error)notify(error.message);else{onSaved({...data,avatar_url:profile?.avatar_url});setOpen(false);notify("Profile updated.");}};
  const upload=async(event:React.ChangeEvent<HTMLInputElement>)=>{const file=event.target.files?.[0];if(!file||!supabase||!user)return;if(file.size>5*1024*1024){notify("Choose an image under 5 MB.");return;}const path=`${user.id}/avatar-${Date.now()}.${file.name.split(".").pop()?.toLowerCase()??"jpg"}`;const {error}=await supabase.storage.from("member-media").upload(path,file,{contentType:file.type,upsert:true});if(error){notify(error.message);return;}const {data:update,error:updateError}=await supabase.from("profiles").update({avatar_path:path}).eq("id",user.id).select("*").single();if(updateError){notify(updateError.message);return;}const {data:signed}=await supabase.storage.from("member-media").createSignedUrl(path,3600);onSaved({...update,avatar_url:signed?.signedUrl??null});notify("Profile photo uploaded.");};
  return <div className="profile-editor"><div className="profile-edit-actions"><label className="button outline-action upload-action">Upload photo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>void upload(e)}/></label><button className="button outline-action" onClick={()=>setOpen(!open)}>{open?"Close":"Edit profile"}</button></div>{open&&<form className="profile-edit-form" onSubmit={save}><label className="field-label">Display name<input required minLength={2} maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label><label className="field-label">Home area<input maxLength={80} value={area} onChange={e=>setArea(e.target.value)} placeholder="e.g. Yaba"/></label><label className="field-label">About you<textarea maxLength={280} rows={3} value={bio} onChange={e=>setBio(e.target.value)} placeholder="A little about your commute routine"/></label><button disabled={busy} className="button primary-action">{busy?"Saving…":"Save profile"}</button></form>}</div>;
}
function InboxView({supabase,user,requests,notify}:{supabase:any;user:any;requests:SeatRequest[];notify:(message:string)=>void}) {
  const [selected,setSelected]=useState("");const [messages,setMessages]=useState<any[]>([]);const [body,setBody]=useState("");const [busy,setBusy]=useState(false);
  const available=requests.filter((r)=>["pending","approved","boarded"].includes(r.status)&&r.trip?.id);
  useEffect(()=>{if(!supabase||!selected){setMessages([]);return;}let live=true;const load=async()=>{const {data,error}=await supabase.from("messages").select("id,body,created_at,sender_id,profiles!messages_sender_id_fkey(display_name)").eq("trip_id",selected).order("created_at");if(live){if(error)notify(error.message);setMessages(data??[]);}};void load();const channel=supabase.channel(`messages-${selected}`).on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:`trip_id=eq.${selected}`},()=>void load()).subscribe();return()=>{live=false;void supabase.removeChannel(channel);};},[supabase,selected,notify]);
  const send=async(event:React.FormEvent)=>{event.preventDefault();if(!supabase||!user||!selected||!body.trim())return;setBusy(true);const {error}=await supabase.from("messages").insert({trip_id:selected,sender_id:user.id,body:body.trim()});setBusy(false);if(error)notify(error.message);else setBody("");};
  if(!available.length)return <><div className="page-heading"><span className="overline">STAY IN THE LOOP</span><h1>Messages</h1><p>Coordinate with the people on your upcoming trips.</p></div><EmptyState title="No conversations yet" copy="Once you send or receive a seat request, you can coordinate here." action="Find a trip" href="/ride/find"/></>;
  return <><div className="page-heading"><span className="overline">STAY IN THE LOOP</span><h1>Messages</h1><p>Coordinate with the people on your upcoming trips.</p></div><div className="chat-panel"><aside className="chat-trips">{available.map(r=><button key={r.id} onClick={()=>setSelected(r.trip?.id??"")} className={selected===r.trip?.id?"selected":""}><strong>{r.trip?.origin} → {r.trip?.destination}</strong><span>{dayTime(r.trip?.departure_at??new Date().toISOString())}</span></button>)}</aside><section className="chat-conversation">{selected?<><div className="chat-scroll">{messages.length?messages.map(m=><article key={m.id} className={m.sender_id===user?.id?"chat-message own":"chat-message"}><span>{m.profiles?.display_name??"Member"}</span><p>{m.body}</p><small>{new Date(m.created_at).toLocaleTimeString("en-NG",{hour:"numeric",minute:"2-digit"})}</small></article>):<p className="chat-empty">No messages yet. Keep trip coordination clear and respectful.</p>}</div><form className="chat-compose" onSubmit={send}><input value={body} onChange={e=>setBody(e.target.value)} maxLength={2000} placeholder="Write a message…"/><button disabled={busy||!body.trim()} className="button primary-action" aria-label="Send message"><ArrowRight size={17}/></button></form></>:<p className="chat-empty">Choose a trip conversation to get started.</p>}</section></div></>;
}
function CommunitiesView({supabase,user,notify}:{supabase:any;user:any;notify:(message:string)=>void}) {
  const [items,setItems]=useState<any[]>([]);const [memberships,setMemberships]=useState<any[]>([]);const [ready,setReady]=useState(false);
  useEffect(()=>{if(!supabase){setReady(true);return;}let live=true;void Promise.all([supabase.from("communities").select("id,name,kind,description,verified,is_demo").order("name"),supabase.from("community_memberships").select("community_id,status")]).then(([directory,memberRows]:any[])=>{if(live){setItems(directory.data??[]);setMemberships(memberRows.data??[]);setReady(true);if(directory.error)notify(directory.error.message);}});return()=>{live=false;};},[supabase,notify]);
  const join=async(id:string)=>{if(!supabase||!user){notify("Sign in to request membership.");return;}const {error}=await supabase.from("community_memberships").insert({community_id:id,member_id:user.id,status:"pending"});if(error)notify(error.message);else{notify("Membership request sent for review.");setMemberships((rows)=>[...rows,{community_id:id,status:"pending"}]);}};
  return <><div className="page-heading"><span className="overline">TRUSTED ROUTES START WITH COMMUNITY</span><h1>Find your commuting people.</h1><p>Join a workplace, school or neighbourhood community and meet more members travelling your way.</p></div>{!ready?<div className="skeleton-trip"/>:items.length?<div className="community-list">{items.map(c=>{const membership=memberships.find(m=>m.community_id===c.id);return <article key={c.id} className="community-card"><span className="community-mark"><Users size={21}/></span><div className="community-copy"><span className="overline">{c.kind.replace("_"," ")}{c.verified&&" · VERIFIED"}{c.is_demo&&" · SAMPLE"}</span><h2>{c.name}</h2><p>{c.description||"Find members who share your commute."}</p></div>{membership?<span className={`request-status status-${membership.status}`}>{membership.status}</span>:<button className="button outline-action" onClick={()=>void join(c.id)}>Request to join <ArrowRight size={15}/></button>}</article>})}</div>:<EmptyState title="Your community is still growing" copy="Verified workplaces, campuses and neighbourhood groups will appear here as they join RideMyWork." action="Explore trips" href="/ride/find"/>}</>;
}
function SafetyView({supabase,user,notify}:{supabase:any;user:any;notify:(message:string)=>void}) {
  const [category,setCategory]=useState("safety");const [details,setDetails]=useState("");const [reported,setReported]=useState("");const [contactName,setContactName]=useState("");const [contactPhone,setContactPhone]=useState("");const [busy,setBusy]=useState(false);
  const [blockedName,setBlockedName]=useState("");const [blocks,setBlocks]=useState<any[]>([]);
  useEffect(()=>{if(!supabase||!user)return;let live=true;void (supabase as any).from("user_blocks").select("blocked_id,profiles!user_blocks_blocked_id_fkey(username,display_name)").then(({data}:any)=>{if(live)setBlocks(data??[]);});return()=>{live=false;};},[supabase,user]);
  const report=async(event:React.FormEvent)=>{event.preventDefault();const parsed=z.object({details:z.string().trim().min(10).max(3000),category:z.enum(["safety","conduct","fake_trip","other"]),username:z.string().trim().max(30)}).safeParse({details,category,username:reported});if(!parsed.success){notify("Add at least 10 characters describing what happened.");return;}if(!supabase||!user)return;setBusy(true);let reported_user_id:null|string=null;if(parsed.data.username){const {data}=await supabase.from("profiles").select("id").eq("username",parsed.data.username.toLowerCase()).maybeSingle();reported_user_id=data?.id??null;}const {error}=await supabase.from("safety_reports").insert({reporter_id:user.id,reported_user_id,category:parsed.data.category,details:parsed.data.details});setBusy(false);notify(error?error.message:"Your report is with RideMyWork Operations.");if(!error){setDetails("");setReported("");}};
  const saveContact=async(event:React.FormEvent)=>{event.preventDefault();if(!supabase||!user)return;const parsed=z.object({name:z.string().trim().min(2).max(80),phone:z.string().trim().min(7).max(25)}).safeParse({name:contactName,phone:contactPhone});if(!parsed.success){notify("Check the trusted contact name and phone number.");return;}const {error}=await supabase.from("trusted_contacts").insert({owner_id:user.id,name:parsed.data.name,phone:parsed.data.phone});notify(error?error.message:"Trusted contact saved privately to your account.");if(!error){setContactName("");setContactPhone("");}};
  const addBlock=async(event:React.FormEvent)=>{event.preventDefault();if(!supabase||!user)return;const username=blockedName.trim().toLowerCase().replace(/^@/,"");if(username.length<3){notify("Enter a member username.");return;}const {data:member}=await supabase.from("profiles").select("id,username,display_name").eq("username",username).maybeSingle();if(!member){notify("No member was found with that username.");return;}if(member.id===user.id){notify("You can’t block your own account.");return;}const {error}=await supabase.from("user_blocks").insert({blocker_id:user.id,blocked_id:member.id});if(error)notify(error.message);else{setBlocks((rows)=>[...rows,{blocked_id:member.id,profiles:{username:member.username,display_name:member.display_name}}]);setBlockedName("");notify("Member blocked.");}};
  const unblock=async(id:string)=>{if(!supabase||!user)return;const {error}=await supabase.from("user_blocks").delete().eq("blocked_id",id);if(error)notify(error.message);else setBlocks((rows)=>rows.filter((row)=>row.blocked_id!==id));};
  return <><div className="page-heading"><span className="overline">TRUST AND SUPPORT</span><h1>Travel with a little more confidence.</h1><p>Report a concern or add someone you trust to your safety contacts.</p></div><div className="safety-grid"><form className="form-card" onSubmit={report}><h2>Report a concern</h2><p className="form-intro">Reports go to RideMyWork Operations. If you are in immediate danger, contact local emergency services directly.</p><label className="field-label">What is this about?<select value={category} onChange={e=>setCategory(e.target.value)}><option value="safety">Safety concern</option><option value="conduct">Member conduct</option><option value="fake_trip">Trip does not appear genuine</option><option value="other">Something else</option></select></label><label className="field-label">Member username (optional)<input value={reported} onChange={e=>setReported(e.target.value)} placeholder="e.g. ada-okafor"/></label><label className="field-label">What happened?<textarea required minLength={10} maxLength={3000} rows={5} value={details} onChange={e=>setDetails(e.target.value)} placeholder="Share details that can help our team review this."/></label><button disabled={busy} className="button primary-action full-action">{busy?"Sending…":"Send report"}<ArrowRight size={16}/></button></form><div className="safety-side"><form className="form-card" onSubmit={saveContact}><h2>Trusted contact</h2><p className="form-intro">We keep this information private. RideMyWork does not currently dispatch emergency services.</p><label className="field-label">Contact name<input required minLength={2} maxLength={80} value={contactName} onChange={e=>setContactName(e.target.value)} placeholder="e.g. Sam Okafor"/></label><label className="field-label">Phone number<input required minLength={7} maxLength={25} type="tel" value={contactPhone} onChange={e=>setContactPhone(e.target.value)} placeholder="+234…"/></label><button className="button outline-action full-action">Save trusted contact <Shield size={15}/></button></form><form className="form-card block-form" onSubmit={addBlock}><h2>Block a member</h2><p className="form-intro">You won’t see trips from members you block. This setting stays private.</p><label className="field-label">Member username<input required value={blockedName} onChange={e=>setBlockedName(e.target.value)} placeholder="e.g. ada-okafor"/></label><button className="button outline-action full-action">Block member <X size={15}/></button>{blocks.map((row)=><div className="blocked-row" key={row.blocked_id}><span><strong>{row.profiles?.display_name??"RideMyWork member"}</strong><small>@{row.profiles?.username??"member"}</small></span><button onClick={()=>void unblock(row.blocked_id)} type="button">Unblock</button></div>)}</form></div></div></>;
}
function TripDetail({ id, trips, userId, requestSeat }: { id: string; trips: Trip[]; userId?: string; requestSeat: (trip: Trip) => Promise<void> }) {
  const trip = trips.find((item) => item.id === id);
  if (!trip) return <EmptyState title="This trip isn’t available" copy="It may have filled up or been removed. Explore other available journeys." action="Find a trip" href="/ride/find" />;
  return (
    <>
      <BackLink />
      <div className="page-heading">
        <span className="overline">EXISTING JOURNEY · LAGOS</span>
        <h1>{trip.origin} <span className="heading-arrow">→</span> {trip.destination}</h1>
        <p>{dayTime(trip.departure_at)} · {trip.available_seats} seats available</p>
      </div>
      <div className="detail-grid">
        <div className="detail-route">
          <h2>Your journey</h2>
          <div className="route-summary detail-route-summary">
            <div className="route-stops">
              <div><i className="origin-dot" /><span>{trip.origin}</span></div>
              <span className="route-connector" />
              <div><i className="destination-dot" /><span>{trip.destination}</span></div>
            </div>
            <strong>{dayTime(trip.departure_at)}</strong>
          </div>
          {(trip.private_locations?.pickup_label) && <p>Pickup: {trip.private_locations.pickup_label}</p>}{trip.private_locations?.dropoff_label && <p>Drop-off: {trip.private_locations.dropoff_label}</p>}
        </div>
        <div className="detail-host">
          <div className="driver-avatar large-avatar">{trip.profiles?.display_name?.slice(0, 1) ?? "R"}</div>
          <div>
            <span className="overline">YOUR TRIP HOST</span>
            <h2>{trip.profiles?.display_name ?? "RideMyWork member"} {trip.profiles?.verified && <BadgeCheck size={17} className="verified-icon" />}</h2>
            <p><Star size={14} fill="currentColor" /> {trip.profiles?.rating_average?.toFixed(1) ?? "New member"} · Verified profile</p>
            {trip.vehicle && <small className="vehicle-meta detail-vehicle">{trip.vehicle.color} {trip.vehicle.make} {trip.vehicle.model}</small>}
          </div>
        </div>
        <MapPanel trips={[trip]} />
      </div>
      <aside className="booking-bar">
        <div><small>Shared cost per seat</small><strong>{money(trip.contribution_per_seat)}</strong></div>
        {trip.host_id===userId ? <Link className="button primary-action" href="/ride/activity">Manage my trip <ArrowRight size={16}/></Link> : <button className="button primary-action" onClick={() => void requestSeat(trip)}>Request a seat <ArrowRight size={16} /></button>}
      </aside>
    </>
  );
}



