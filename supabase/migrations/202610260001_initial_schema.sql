-- RideMyWork MVP schema. Run once in the SQL Editor of the intended Supabase project.
-- All user data is protected by RLS. The service-role key is never needed by this app.
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9-]{3,30}$'),
  display_name text not null check (char_length(display_name) between 2 and 80),
  avatar_path text,
  bio text check (char_length(bio) <= 280),
  home_area text,
  verified boolean not null default false,
  rating_average numeric(2,1) not null default 0 check (rating_average between 0 and 5),
  trips_completed integer not null default 0 check (trips_completed >= 0),
  co2_saved_kg numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Member profiles. Public fields are readable to authenticated users; only the owner may edit.';

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare requested_username text;
begin
  requested_username := lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  insert into public.profiles(id, username, display_name)
  values (new.id, requested_username, coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), requested_username));
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  make text not null check (char_length(make) between 1 and 40),
  model text not null check (char_length(model) between 1 and 50),
  color text not null check (char_length(color) between 1 and 30),
  plate_last_four text check (plate_last_four ~ '^[A-Z0-9]{2,6}$'),
  seats integer not null check (seats between 1 and 8),
  verified boolean not null default false,
  created_at timestamptz not null default now()
);
comment on table public.vehicles is 'Vehicle details shown to confirmed trip participants; editable only by the owner.';

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 100),
  kind text not null check (kind in ('workplace','university','estate','organization','event','other')),
  description text check (char_length(description) <= 500),
  verified boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
comment on table public.communities is 'Organization-managed commute communities. Creation is restricted to project operations.';

create table if not exists public.community_memberships (
  community_id uuid not null references public.communities(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','active','rejected')),
  joined_at timestamptz not null default now(),
  primary key (community_id, member_id)
);
comment on table public.community_memberships is 'A member can see their own memberships; other members are visible only in active shared communities.';

-- Clearly marked sample communities make local development easier; remove them before public launch if undesired.
insert into public.communities(name,kind,description,is_demo) values
  ('ABC Company','workplace','Sample workplace community for previewing colleague commute matching.',true),
  ('University of Lagos','university','Sample campus community for previewing shared journeys.',true),
  ('Lekki Neighbourhood Network','estate','Sample neighbourhood group for previewing familiar routes.',true)
on conflict (name) do nothing;

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  origin text not null check (char_length(origin) between 2 and 120),
  destination text not null check (char_length(destination) between 2 and 120),
  pickup_point text check (char_length(pickup_point) <= 160),
  dropoff_point text check (char_length(dropoff_point) <= 160),
  origin_lat double precision,
  origin_lng double precision,
  destination_lat double precision,
  destination_lng double precision,
  departure_at timestamptz not null,
  available_seats integer not null check (available_seats between 1 and 8),
  contribution_per_seat integer not null check (contribution_per_seat between 0 and 5000),
  trip_reason text not null check (trip_reason in ('Work','School','Appointment','Visiting family or friends','Event','Personal errand')),
  existing_journey_confirmed boolean not null default false check (existing_journey_confirmed),
  recurrence_id uuid,
  status text not null default 'open' check (status in ('open','full','in_progress','completed','cancelled')),
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists trips_search_idx on public.trips(status, departure_at) where status = 'open';
create index if not exists trips_host_idx on public.trips(host_id, departure_at desc);
comment on table public.trips is 'An existing journey offered by a Trip Host; contribution is per seat and capped at ₦5,000 for MVP.';

create table if not exists public.recurring_commutes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  origin text not null check (char_length(origin) between 2 and 120),
  destination text not null check (char_length(destination) between 2 and 120),
  weekdays smallint[] not null check (cardinality(weekdays) between 1 and 7 and weekdays <@ array[1,2,3,4,5,6,7]::smallint[]),
  preferred_time time not null,
  seats integer not null default 1 check (seats between 1 and 8),
  role text not null check (role in ('host','passenger')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.recurring_commutes is 'A member-owned weekly route preference.';

create table if not exists public.seat_requests (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  passenger_id uuid not null references public.profiles(id) on delete cascade,
  seats_requested integer not null default 1 check (seats_requested between 1 and 4),
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled','boarded','completed')),
  boarding_code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, passenger_id)
);
create index if not exists seat_requests_passenger_idx on public.seat_requests(passenger_id, created_at desc);
comment on table public.seat_requests is 'Passenger seat requests. Only the passenger and the trip host can read/update the request.';

-- This safe search view exposes only open trip summaries and remaining seat counts.
create or replace view public.trip_search with (security_invoker = true, security_barrier = true) as
select t.id, t.host_id, t.vehicle_id, t.origin, t.destination, t.pickup_point, t.dropoff_point,
       t.origin_lat, t.origin_lng, t.destination_lat, t.destination_lng, t.departure_at,
       t.available_seats - coalesce(sum(r.seats_requested) filter (where r.status in ('pending','approved','boarded')),0)::integer as available_seats,
       t.contribution_per_seat, t.trip_reason, t.notes, t.created_at
from public.trips t
left join public.seat_requests r on r.trip_id = t.id
where t.status = 'open'
group by t.id
having t.available_seats - coalesce(sum(r.seats_requested) filter (where r.status in ('pending','approved','boarded')),0)::integer > 0;
revoke all on public.trip_search from public, anon;
grant select on public.trip_search to authenticated;
comment on view public.trip_search is 'Authenticated search surface with remaining seats; it does not reveal booking or passenger details.';

create or replace function public.assign_boarding_code()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' and new.boarding_code is null then
  new.boarding_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  end if;
  return new;
end; $$;
drop trigger if exists on_request_approved on public.seat_requests;
create trigger on_request_approved before update of status on public.seat_requests for each row execute function public.assign_boarding_code();

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists messages_trip_idx on public.messages(trip_id, created_at);
comment on table public.messages is 'Private trip chat, readable only by the host and approved or pending passengers.';

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.profiles(id) on delete cascade,
  score integer not null check (score between 1 and 5),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  unique (trip_id, author_id, subject_id),
  check (author_id <> subject_id)
);
comment on table public.ratings is 'Trip participant ratings. Only trip participants can create a rating.';

create table if not exists public.safety_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete set null,
  trip_id uuid references public.trips(id) on delete set null,
  category text not null check (category in ('safety','conduct','fake_trip','other')),
  details text not null check (char_length(details) between 10 and 3000),
  status text not null default 'new' check (status in ('new','reviewing','resolved')),
  created_at timestamptz not null default now()
);
comment on table public.safety_reports is 'Reports are private to their author and project operations. The app does not dispatch emergency services.';

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
comment on table public.user_blocks is 'Private user blocking list; only the blocker can see or change it.';

-- The owner-style view can suppress journeys where either party has blocked the other.
create or replace view public.trip_search with (security_invoker = true, security_barrier = true) as
select t.id, t.host_id, t.vehicle_id, t.origin, t.destination, t.pickup_point, t.dropoff_point,
       t.origin_lat, t.origin_lng, t.destination_lat, t.destination_lng, t.departure_at,
       t.available_seats - coalesce(sum(r.seats_requested) filter (where r.status in ('pending','approved','boarded')),0)::integer as available_seats,
       t.contribution_per_seat, t.trip_reason, t.notes, t.created_at
from public.trips t
left join public.seat_requests r on r.trip_id = t.id
where t.status = 'open'
  and not exists (select 1 from public.user_blocks b where (b.blocker_id = auth.uid() and b.blocked_id = t.host_id) or (b.blocker_id = t.host_id and b.blocked_id = auth.uid()))
group by t.id
having t.available_seats - coalesce(sum(r.seats_requested) filter (where r.status in ('pending','approved','boarded')),0)::integer > 0;

create table if not exists public.trusted_contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  phone text not null check (char_length(phone) between 7 and 25),
  created_at timestamptz not null default now()
);
comment on table public.trusted_contacts is 'Private contacts used for safety check-ins; accessible only by the owner.';

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);
comment on table public.push_subscriptions is 'Private browser push endpoint registration, owned by one member.';

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('seat_request','request_update','message','trip_update','safety')),
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 500),
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
comment on table public.notifications is 'Private in-app notifications for one member.';

-- These narrowly scoped security-definer checks avoid recursive RLS policy lookups.
create or replace function public.is_trip_member(p_trip_id uuid)
returns boolean language sql stable security definer set search_path = '' set row_security = off as $$
  select exists (
    select 1 from public.trips t
    where t.id = p_trip_id
      and (t.host_id = auth.uid() or exists (select 1 from public.seat_requests r where r.trip_id = t.id and r.passenger_id = auth.uid() and r.status in ('pending','approved','boarded','completed')))
      and not exists (select 1 from public.user_blocks b where (b.blocker_id = auth.uid() and b.blocked_id = t.host_id) or (b.blocker_id = t.host_id and b.blocked_id = auth.uid()))
  );
$$;
revoke all on function public.is_trip_member(uuid) from public;
grant execute on function public.is_trip_member(uuid) to authenticated;
create or replace function public.is_user_blocked(p_other_id uuid)
returns boolean language sql stable security definer set search_path = '' set row_security = off as $$
  select exists (select 1 from public.user_blocks b where (b.blocker_id = auth.uid() and b.blocked_id = p_other_id) or (b.blocker_id = p_other_id and b.blocked_id = auth.uid()));
$$;
revoke all on function public.is_user_blocked(uuid) from public;
grant execute on function public.is_user_blocked(uuid) to authenticated;
create or replace function public.is_community_member(p_community_id uuid)
returns boolean language sql stable security definer set search_path = '' set row_security = off as $$
  select exists (select 1 from public.community_memberships m where m.community_id = p_community_id and m.member_id = auth.uid() and m.status = 'active');
$$;
revoke all on function public.is_community_member(uuid) from public;
grant execute on function public.is_community_member(uuid) to authenticated;

-- Enable RLS on every public table and define explicit access policies.
alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.communities enable row level security;
alter table public.community_memberships enable row level security;
alter table public.trips enable row level security;
alter table public.recurring_commutes enable row level security;
alter table public.seat_requests enable row level security;
alter table public.messages enable row level security;
alter table public.ratings enable row level security;
alter table public.safety_reports enable row level security;
alter table public.user_blocks enable row level security;
alter table public.trusted_contacts enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notifications enable row level security;

-- A logged-in member can read profiles, but can change only their own record.
create policy "Authenticated members read profiles" on public.profiles for select to authenticated using (true);
create policy "Members insert own profile" on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy "Members update own profile" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "Members delete own profile" on public.profiles for delete to authenticated using (id = (select auth.uid()));
-- Vehicle details are visible to signed-in members; only the owner may manage them.
create policy "Authenticated members read vehicles" on public.vehicles for select to authenticated using (true);
create policy "Owners manage vehicles" on public.vehicles for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
-- Community directory is authenticated; membership creation is self-service, approval is operations-only.
create policy "Authenticated members read communities" on public.communities for select to authenticated using (true);
create policy "Members read own or shared active memberships" on public.community_memberships for select to authenticated using (member_id = (select auth.uid()) or public.is_community_member(community_id));
create policy "Members join communities as pending" on public.community_memberships for insert to authenticated with check (member_id = (select auth.uid()) and status = 'pending');
create policy "Members leave communities" on public.community_memberships for delete to authenticated using (member_id = (select auth.uid()));
-- Only open trips are discoverable to authenticated members; hosts manage their own trips.
create policy "Members find open trips and their own trip records" on public.trips for select to authenticated using ((status = 'open' and not public.is_user_blocked(host_id)) or host_id = (select auth.uid()) or public.is_trip_member(id));
create policy "Hosts create genuine trips with their own vehicle" on public.trips for insert to authenticated with check (host_id = (select auth.uid()) and existing_journey_confirmed = true and exists (select 1 from public.vehicles v where v.id = vehicle_id and v.owner_id = (select auth.uid()) and v.seats >= available_seats));
create policy "Hosts update own trips with their own vehicle" on public.trips for update to authenticated using (host_id = (select auth.uid())) with check (host_id = (select auth.uid()) and existing_journey_confirmed = true and (vehicle_id is null or exists (select 1 from public.vehicles v where v.id = vehicle_id and v.owner_id = (select auth.uid()) and v.seats >= available_seats)));
create policy "Hosts cancel own trips" on public.trips for delete to authenticated using (host_id = (select auth.uid()));
-- Commute schedules contain private routine locations; only their owner can access them.
create policy "Owners manage recurring commutes" on public.recurring_commutes for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
-- Passengers create their own requests; the related host can review and approve them.
create policy "Participants read seat requests" on public.seat_requests for select to authenticated using (passenger_id = (select auth.uid()) or exists (select 1 from public.trips t where t.id = trip_id and t.host_id = (select auth.uid())));
create policy "Passengers request their own seat" on public.seat_requests for insert to authenticated with check (passenger_id = (select auth.uid()) and exists (select 1 from public.trips t where t.id = trip_id and t.status = 'open' and t.host_id <> (select auth.uid())));
-- Updates go through the guarded RPCs below so passengers cannot approve themselves or edit boarding codes.
create policy "Passengers cancel their request" on public.seat_requests for delete to authenticated using (passenger_id = (select auth.uid()));
-- Only trip host and requesting passengers may exchange private messages.
create policy "Trip participants read messages" on public.messages for select to authenticated using (public.is_trip_member(trip_id));
create policy "Trip participants send messages" on public.messages for insert to authenticated with check (sender_id = (select auth.uid()) and public.is_trip_member(trip_id));
-- Ratings are participant-only, scoped to completed journeys.
create policy "Members read ratings" on public.ratings for select to authenticated using (true);
create policy "Trip participants rate each other" on public.ratings for insert to authenticated with check (author_id = (select auth.uid()) and public.is_trip_member(trip_id) and exists (select 1 from public.trips t where t.id = trip_id and t.status = 'completed'));
-- Safety reports remain private to reporter and operations/service role.
create policy "Reporters read own safety reports" on public.safety_reports for select to authenticated using (reporter_id = (select auth.uid()));
create policy "Members create safety reports" on public.safety_reports for insert to authenticated with check (reporter_id = (select auth.uid()));
-- Block lists, trusted contacts, push endpoints and notifications are private to each owner.
create policy "Owners manage blocks" on public.user_blocks for all to authenticated using (blocker_id = (select auth.uid())) with check (blocker_id = (select auth.uid()));
create policy "Owners manage trusted contacts" on public.trusted_contacts for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Owners manage push subscriptions" on public.push_subscriptions for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Owners read notifications" on public.notifications for select to authenticated using (owner_id = (select auth.uid()));
create policy "Owners update notifications" on public.notifications for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- Storage bucket is private. Authenticated users can manage only files under their own UUID folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('member-media','member-media',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy "Owners read own member media" on storage.objects for select to authenticated using (bucket_id = 'member-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Owners upload own member media" on storage.objects for insert to authenticated with check (bucket_id = 'member-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Owners update own member media" on storage.objects for update to authenticated using (bucket_id = 'member-media' and (storage.foldername(name))[1] = (select auth.uid())::text) with check (bucket_id = 'member-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Owners delete own member media" on storage.objects for delete to authenticated using (bucket_id = 'member-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Keep private trip chat and personal notifications live for signed-in clients.
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.seat_requests;
exception when duplicate_object then null; when undefined_object then null; end $$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger trips_updated_at before update on public.trips for each row execute function public.set_updated_at();
create trigger commutes_updated_at before update on public.recurring_commutes for each row execute function public.set_updated_at();
create trigger requests_updated_at before update on public.seat_requests for each row execute function public.set_updated_at();

-- Request creation locks the trip while checking remaining seats, preventing overbooking.
create or replace function public.request_trip_seat(p_trip_id uuid, p_seats integer default 1)
returns uuid language plpgsql security definer set search_path = '' as $$
declare t public.trips%rowtype; used_seats integer; new_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to request a seat'; end if;
  if p_seats < 1 or p_seats > 4 then raise exception 'Choose between 1 and 4 seats'; end if;
  select * into t from public.trips where id = p_trip_id and status = 'open' for update;
  if not found then raise exception 'This trip is no longer open'; end if;
  if t.host_id = auth.uid() then raise exception 'You cannot request your own trip'; end if;
  if exists (select 1 from public.user_blocks b where (b.blocker_id = auth.uid() and b.blocked_id = t.host_id) or (b.blocker_id = t.host_id and b.blocked_id = auth.uid())) then raise exception 'This member is unavailable'; end if;
  select coalesce(sum(seats_requested),0) into used_seats from public.seat_requests where trip_id = p_trip_id and status in ('pending','approved','boarded');
  if used_seats + p_seats > t.available_seats then raise exception 'There are not enough seats remaining'; end if;
  insert into public.seat_requests(trip_id, passenger_id, seats_requested)
  values (p_trip_id, auth.uid(), p_seats) returning id into new_id;
  insert into public.notifications(owner_id,kind,title,body,href)
  values(t.host_id,'seat_request','New seat request','A verified member would like to join your trip.','/ride/activity');
  return new_id;
end; $$;
revoke all on function public.request_trip_seat(uuid,integer) from public;
grant execute on function public.request_trip_seat(uuid,integer) to authenticated;

-- Hosts can approve/reject only their own trip's pending request; approval generates a code.
create or replace function public.review_seat_request(p_request_id uuid,p_decision text)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.seat_requests%rowtype; host uuid;
begin
  if auth.uid() is null or p_decision not in ('approved','rejected') then raise exception 'Invalid request action'; end if;
  select s, t.host_id into r, host from public.seat_requests s join public.trips t on t.id=s.trip_id where s.id=p_request_id for update of s;
  if not found or host <> auth.uid() or r.status <> 'pending' then raise exception 'This request cannot be changed'; end if;
  if exists (select 1 from public.user_blocks b where (b.blocker_id = auth.uid() and b.blocked_id = r.passenger_id) or (b.blocker_id = r.passenger_id and b.blocked_id = auth.uid())) then raise exception 'This request is unavailable'; end if;
  update public.seat_requests set status=p_decision where id=p_request_id;
  insert into public.notifications(owner_id,kind,title,body,href)
  values(r.passenger_id,'request_update',case when p_decision='approved' then 'Your seat is confirmed' else 'Trip Host update' end,case when p_decision='approved' then 'Your boarding code is ready in Trips.' else 'The Trip Host could not accept this request.' end,'/ride/activity');
end; $$;
revoke all on function public.review_seat_request(uuid,text) from public;
grant execute on function public.review_seat_request(uuid,text) to authenticated;

-- A Trip Host can confirm boarding only when the passenger provides the generated code.
create or replace function public.confirm_trip_boarding(p_request_id uuid,p_code text)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.seat_requests%rowtype; host uuid;
begin
  select s, t.host_id into r, host from public.seat_requests s join public.trips t on t.id=s.trip_id where s.id=p_request_id for update of s;
  if not found or host <> auth.uid() or r.status <> 'approved' or r.boarding_code <> upper(trim(p_code)) then raise exception 'Boarding code did not match'; end if;
  update public.seat_requests set status='boarded' where id=p_request_id;
end; $$;
revoke all on function public.confirm_trip_boarding(uuid,text) from public;
grant execute on function public.confirm_trip_boarding(uuid,text) to authenticated;
