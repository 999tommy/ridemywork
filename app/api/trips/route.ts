import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

const createTripSchema = z.object({
  origin: z.string().trim().min(2).max(120),
  destination: z.string().trim().min(2).max(120),
  pickup: z.string().trim().max(160).optional().default(""),
  dropoff: z.string().trim().max(160).optional().default(""),
  make: z.string().trim().min(1).max(40),
  model: z.string().trim().min(1).max(50),
  color: z.string().trim().min(1).max(30),
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
  const { data: vehicle, error: vehicleError } = await supabase.from("vehicles").insert({ owner_id: user.id, make: values.make, model: values.model, color: values.color, seats: values.seats }).select("id").single();
  if (vehicleError) return NextResponse.json({ error: vehicleError.message }, { status: 400 });
  const { data: trip, error: tripError } = await supabase.from("trips").insert({ host_id: user.id, vehicle_id: vehicle.id, origin: values.origin, destination: values.destination, pickup_point: values.pickup || null, dropoff_point: values.dropoff || null, departure_at: values.departureAt, available_seats: values.seats, contribution_per_seat: values.contribution, trip_reason: values.reason, existing_journey_confirmed: true, status: "open" }).select("id").single();
  if (tripError) {
    await supabase.from("vehicles").delete().eq("id", vehicle.id);
    return NextResponse.json({ error: tripError.message }, { status: 400 });
  }
  return NextResponse.json({ id: trip.id }, { status: 201 });
}
