-- Farming Unblocked: cloud saves + leaderboard.
-- Run once in the Supabase SQL editor (same project as the site's shooter_players accounts).
-- Uses the site's shared login: p_hash is the same password hash the site's sign-in uses.

create table if not exists fu_saves (
  username text primary key,
  data jsonb not null,
  saved_at timestamptz not null default now()
);
alter table fu_saves enable row level security;  -- no policies: only the functions below read/write it

create table if not exists fu_scores (
  username text primary key,
  farm_value bigint not null default 0,
  earned bigint not null default 0,
  harvested bigint not null default 0,
  fields int not null default 0,
  updated_at timestamptz not null default now()
);
alter table fu_scores enable row level security;
drop policy if exists fu_scores_read on fu_scores;
create policy fu_scores_read on fu_scores for select using (true);  -- anyone can read the leaderboard

create or replace function fu_auth(p_user text, p_hash text) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from shooter_players where username = p_user and password_hash = p_hash);
$$;
revoke execute on function fu_auth(text, text) from public, anon, authenticated;

-- save the whole farm (JSON from the game's save system); returns the server time it was stored
create or replace function fu_save(p_user text, p_hash text, p_data jsonb) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare t timestamptz := now();
begin
  if not fu_auth(p_user, p_hash) then raise exception 'bad login'; end if;
  if pg_column_size(p_data) > 2000000 then raise exception 'save too big'; end if;
  insert into fu_saves (username, data, saved_at) values (p_user, p_data, t)
  on conflict (username) do update set data = excluded.data, saved_at = excluded.saved_at;
  return t;
end $$;

-- returns {"data": <save>, "saved_at": <time>} or null when the account has no cloud save yet
create or replace function fu_load(p_user text, p_hash text) returns jsonb
language plpgsql security definer set search_path = public stable as $$
begin
  if not fu_auth(p_user, p_hash) then raise exception 'bad login'; end if;
  return (select jsonb_build_object('data', data, 'saved_at', saved_at) from fu_saves where username = p_user);
end $$;

-- leaderboard: one row per player, overwritten with the latest numbers (clamped to sane ranges)
create or replace function fu_submit_score(p_user text, p_hash text, p_value bigint, p_earned bigint, p_harvested bigint, p_fields int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not fu_auth(p_user, p_hash) then raise exception 'bad login'; end if;
  insert into fu_scores (username, farm_value, earned, harvested, fields, updated_at)
  values (p_user, greatest(0, least(p_value, 1000000000)), greatest(0, least(p_earned, 1000000000)),
          greatest(0, least(p_harvested, 1000000000)), greatest(0, least(p_fields, 13)), now())
  on conflict (username) do update set farm_value = excluded.farm_value, earned = excluded.earned,
    harvested = excluded.harvested, fields = excluded.fields, updated_at = now();
end $$;

grant execute on function fu_save(text, text, jsonb), fu_load(text, text),
  fu_submit_score(text, text, bigint, bigint, bigint, int) to anon, authenticated;
