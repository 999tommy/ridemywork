-- Keep exact trip and pickup coordinates private until a seat is approved.
-- The public trip row stores only rounded neighborhood-level map coordinates.
create table if not exists public.trip_private_locations (
  trip_id uuid primary key references public.trips(id) on delete cascade,
  host_id uuid not null references public.profiles(id) on delete cascade,
  origin_label text not null check (char_length(origin_label) between 2 and 160),
  origin_lat double precision not null check (origin_lat between -90 and 90),
  origin_lng double precision not null check (origin_lng between -180 and 180),
  destination_label text not null check (char_length(destination_label) between 2 and 160),
  destination_lat double precision not null check (destination_lat between -90 and 90),
  destination_lng double precision not null check (destination_lng between -180 and 180),
  pickup_label text check (char_length(pickup_label) <= 160),
  pickup_lat double precision check (pickup_lat between -90 and 90),
  pickup_lng double precision check (pickup_lng between -180 and 180),
  dropoff_label text check (char_length(dropoff_label) <= 160),
  dropoff_lat double precision check (dropoff_lat between -90 and 90),
  dropoff_lng double precision check (dropoff_lng between -180 and 180),
  created_at timestamptz not null default now(),
  check ((pickup_lat is null) = (pickup_lng is null)),
  check ((dropoff_lat is null) = (dropoff_lng is null))
);
comment on table public.trip_private_locations is 'Exact trip and pickup points are visible only to the Trip Host and approved passengers.';
alter table public.trip_private_locations enable row level security;
grant select, insert, update, delete on public.trip_private_locations to authenticated;

drop policy if exists "Trip participants see exact journey locations" on public.trip_private_locations;
create policy "Trip participants see exact journey locations" on public.trip_private_locations
  for select to authenticated using (
    host_id = (select auth.uid())
    or exists (
      select 1 from public.seat_requests r
      where r.trip_id = trip_private_locations.trip_id
        and r.passenger_id = (select auth.uid())
        and r.status in ('approved','boarded','completed')
    )
  );
drop policy if exists "Trip Hosts save exact journey locations" on public.trip_private_locations;
create policy "Trip Hosts save exact journey locations" on public.trip_private_locations
  for insert to authenticated with check (
    host_id = (select auth.uid())
    and exists (select 1 from public.trips t where t.id = trip_id and t.host_id = (select auth.uid()))
  );
drop policy if exists "Trip Hosts update exact journey locations" on public.trip_private_locations;
create policy "Trip Hosts update exact journey locations" on public.trip_private_locations
  for update to authenticated using (host_id = (select auth.uid())) with check (
    host_id = (select auth.uid())
    and exists (select 1 from public.trips t where t.id = trip_id and t.host_id = (select auth.uid()))
  );
drop policy if exists "Trip Hosts remove exact journey locations" on public.trip_private_locations;
create policy "Trip Hosts remove exact journey locations" on public.trip_private_locations
  for delete to authenticated using (host_id = (select auth.uid()));

-- Store only approximate map coordinates on the public-facing trip record.
alter table public.trips drop column if exists pickup_lat;
alter table public.trips drop column if exists pickup_lng;
alter table public.trips drop column if exists dropoff_lat;
alter table public.trips drop column if exists dropoff_lng;

-- Make the database reject a host's attempt to create a seat request even if a
-- client bypasses the app and tries a direct table insert.
drop policy if exists "Passengers request their own seats" on public.seat_requests;
drop policy if exists "Passengers request their own seat" on public.seat_requests;
create policy "Passengers request their own seat" on public.seat_requests
  for insert to authenticated with check (
    passenger_id = (select auth.uid())
    and exists (
      select 1 from public.trips t
      where t.id = trip_id
        and t.status = 'open'
        and t.host_id <> (select auth.uid())
    )
  );

-- Preserve the authenticated search contract but hide exact pickup labels and
-- round coordinates to a broad area until the booking has been approved.
create or replace view public.trip_search
with (security_invoker = true, security_barrier = true)
as
select t.id, t.host_id, t.vehicle_id, t.origin, t.destination,
       null::text as pickup_point, null::text as dropoff_point,
       round(t.origin_lat::numeric, 2)::double precision as origin_lat,
       round(t.origin_lng::numeric, 2)::double precision as origin_lng,
       round(t.destination_lat::numeric, 2)::double precision as destination_lat,
       round(t.destination_lng::numeric, 2)::double precision as destination_lng,
       t.departure_at,
       t.available_seats - coalesce(sum(r.seats_requested) filter (where r.status in ('pending','approved','boarded')),0)::integer as available_seats,
       t.contribution_per_seat, t.trip_reason, t.notes, t.created_at
from public.trips t
left join public.seat_requests r on r.trip_id = t.id
where t.status = 'open'
  and not exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = t.host_id)
       or (b.blocker_id = t.host_id and b.blocked_id = auth.uid())
  )
group by t.id
having t.available_seats - coalesce(sum(r.seats_requested) filter (where r.status in ('pending','approved','boarded')),0)::integer > 0;
revoke all on public.trip_search from public, anon;
grant select on public.trip_search to authenticated;
