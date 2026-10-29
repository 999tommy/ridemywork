import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

const createTripSchema = z.object({
  origin: z.string().trim().min(2).max(120),
  destination: z.string().trim().min(2).max(120),
  pickup: z.string().trim().max(160).optional().default(""),
  dropoff: z.string().trim().max(160).optional().default(""),
  originLat: z.number().min(-90).max(90).nullable().optional(),
  originLng: z.number().min(-180).max(180).nullable().optional(),
  destinationLat: z.number().min(-90).max(90).nullable().optional(),
  destinationLng: z.number().min(-180).max(180).nullable().optional(),
  originLabel: z.string().trim().min(2).max(160),
  destinationLabel: z.string().trim().min(2).max(160),
  pickupLabel: z.string().trim().max(160).optional().default(""),
  dropoffLabel: z.string().trim().max(160).optional().default(""),
  pickupLat: z.number().min(-90).max(90).nullable().optional(),
  pickupLng: z.number().min(-180).max(180).nullable().optional(),
  dropoffLat: z.number().min(-90).max(90).nullable().optional(),
  dropoffLng: z.number().min(-180).max(180).nullable().optional(),
  vehicleId: z.string().uuid().nullable().optional(),
  make: z.string().trim().max(40).optional().default(""),
  model: z.string().trim().max(50).optional().default(""),
  color: z.string().trim().max(30).optional().default(""),
  departureAt: z.string().datetime({ offset: true }).refine((value) => new Date(value).getTime() > Date.now(), "Departure must be in the future"),
  seats: z.number().int().min(1).max(8),
  contribution: z.number().int().min(0).max(5000),
  reason: z.enum(["Work", "School", "Appointment", "Visiting family or friends", "Event", "Personal errand"]),
  existingJourneyConfirmed: z.literal(true),
});

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to offer a trip." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createTripSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Check the trip details and try again.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });

  const values = parsed.data;
  let vehicleId = values.vehicleId ?? null;
  let newlyCreatedVehicleId: string | null = null;
  if (vehicleId) {
    const { data: savedVehicle, error: savedVehicleError } = await supabase.from("vehicles").select("id,seats").eq("id", vehicleId).eq("owner_id", user.id).maybeSingle();
    if (savedVehicleError || !savedVehicle) return NextResponse.json({ error: "Choose one of your saved vehicles or add a new one." }, { status: 400 });
    if (savedVehicle.seats < values.seats) return NextResponse.json({ error: "That vehicle has fewer available seats. Choose another vehicle or reduce the seats offered." }, { status: 400 });
  } else {
    if (!values.make || !values.model || !values.color) return NextResponse.json({ error: "Add the vehicle make, model and colour before publishing." }, { status: 400 });
    const { data: vehicle, error: vehicleError } = await supabase.from("vehicles").insert({ owner_id: user.id, make: values.make, model: values.model, color: values.color, seats: values.seats }).select("id").single();
    if (vehicleError) return NextResponse.json({ error: "We couldn’t save that vehicle. Check the vehicle details and try again." }, { status: 400 });
    vehicleId = vehicle.id;
    newlyCreatedVehicleId = vehicle.id;
  }
  const approximate = (coordinate: number | null | undefined) => coordinate == null ? null : Math.round(coordinate * 100) / 100;
  const { data: trip, error: tripError } = await supabase.from("trips").insert({ host_id: user.id, vehicle_id: vehicleId, origin: values.origin, destination: values.destination, pickup_point: null, dropoff_point: null, origin_lat: approximate(values.originLat), origin_lng: approximate(values.originLng), destination_lat: approximate(values.destinationLat), destination_lng: approximate(values.destinationLng), departure_at: values.departureAt, available_seats: values.seats, contribution_per_seat: values.contribution, trip_reason: values.reason, existing_journey_confirmed: true, status: "open" }).select("id").single();
  if (tripError) {
    if (newlyCreatedVehicleId) await supabase.from("vehicles").delete().eq("id", newlyCreatedVehicleId);
    return NextResponse.json({ error: "We couldn’t publish this trip. Check the route, seats and departure time, then try again." }, { status: 400 });
  }
  const { error: locationsError } = await (supabase as any).from("trip_private_locations").insert({
    trip_id: trip.id, host_id: user.id,
    origin_label: values.originLabel, origin_lat: values.originLat, origin_lng: values.originLng,
    destination_label: values.destinationLabel, destination_lat: values.destinationLat, destination_lng: values.destinationLng,
    pickup_label: values.pickupLabel || null, pickup_lat: values.pickupLat ?? null, pickup_lng: values.pickupLng ?? null,
    dropoff_label: values.dropoffLabel || null, dropoff_lat: values.dropoffLat ?? null, dropoff_lng: values.dropoffLng ?? null,
  });
  if (locationsError) {
    await supabase.from("trips").delete().eq("id", trip.id);
    if (newlyCreatedVehicleId) await supabase.from("vehicles").delete().eq("id", newlyCreatedVehicleId);
    return NextResponse.json({ error: "We couldn’t save the private route details. Apply the latest RideMyWork SQL migration and try again." }, { status: 503 });
  }
  return NextResponse.json({ id: trip.id }, { status: 201 });
}
