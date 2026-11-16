-- Fishing Unblocked cloud saves. Run once in Supabase → SQL Editor.
-- Uses the site's shared logins (public.shooter_players: username + password_hash), same as Farming Unblocked.
-- The table has row-level security on and no policies, so it can only be read/written through the two functions below,
-- which check the username + password hash first.

create table if not exists public.fish_saves (
  username  text primary key,
  data      jsonb not null,
  saved_at  timestamptz not null default now()
);
alter table public.fish_saves enable row level security;

create or replace function public.fish_save(p_user text, p_hash text, p_data jsonb)
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare t timestamptz := now();
begin
  if not exists (select 1 from shooter_players where username = p_user and password_hash = p_hash) then
    raise exception 'bad login' using errcode = '28000';
  end if;
  if octet_length(p_data::text) > 300000 then
    raise exception 'save too big';
  end if;
  insert into fish_saves (username, data, saved_at) values (p_user, p_data, t)
  on conflict (username) do update set data = excluded.data, saved_at = t;
  return t;
end $$;

create or replace function public.fish_load(p_user text, p_hash text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare r fish_saves%rowtype;
begin
  if not exists (select 1 from shooter_players where username = p_user and password_hash = p_hash) then
    raise exception 'bad login' using errcode = '28000';
  end if;
  select * into r from fish_saves where username = p_user;
  if not found then return null; end if;
  return jsonb_build_object('data', r.data, 'saved_at', r.saved_at);
end $$;

revoke all on function public.fish_save(text, text, jsonb) from public;
revoke all on function public.fish_load(text, text) from public;
grant execute on function public.fish_save(text, text, jsonb) to anon, authenticated;
grant execute on function public.fish_load(text, text) to anon, authenticated;
