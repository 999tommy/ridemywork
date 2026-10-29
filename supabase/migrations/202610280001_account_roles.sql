-- Add a preferred starting experience while keeping every account able to use
-- both passenger and Trip Host features.
alter table public.profiles
  add column if not exists account_type text not null default 'passenger'
  check (account_type in ('passenger', 'trip_host'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  requested_username text;
  requested_type text;
begin
  requested_username := lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  requested_type := coalesce(new.raw_user_meta_data->>'account_type', 'passenger');
  if requested_type not in ('passenger', 'trip_host') then requested_type := 'passenger'; end if;
  insert into public.profiles(id, username, display_name, account_type)
  values (
    new.id,
    requested_username,
    coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), requested_username),
    requested_type
  );
  return new;
end; $$;

-- Trigger functions do not need client RPC access. PostgreSQL grants EXECUTE
-- to PUBLIC by default, so remove it to keep this SECURITY DEFINER function
-- inaccessible to Data API roles.
revoke all on function public.handle_new_user() from public, anon, authenticated;
