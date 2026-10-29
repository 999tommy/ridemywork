-- Views run as the caller so the underlying trip, request, and block-list RLS
-- policies remain active when the authenticated search surface is queried.
create or replace view public.trip_search
with (security_invoker = true, security_barrier = true)
as
select t.id, t.host_id, t.vehicle_id, t.origin, t.destination, t.pickup_point, t.dropoff_point,
       t.origin_lat, t.origin_lng, t.destination_lat, t.destination_lng, t.departure_at,
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
