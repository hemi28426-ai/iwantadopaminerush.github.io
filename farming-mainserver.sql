-- Farming Unblocked: the 🌎 Main Server's one shared save.
-- Run once in the Supabase SQL editor (same project as farming-setup.sql). Safe to run again.
--
-- There is exactly ONE main-world save (row id = 1). Whoever opens the Main Server while nobody is online
-- loads it; only that host saves it. Every save says which version it was based on (p_base): if someone else
-- saved in the meantime the save is refused (returns -1), so no old or fresh copy can replace the shared world.
-- Every 10th version is also kept in fu_main_history (last ~30 kept) in case the world ever needs restoring.

create table if not exists fu_main_world (
  id int primary key default 1 check (id = 1),
  version bigint not null default 0,
  data jsonb,
  saved_at timestamptz not null default now(),
  saved_by text
);
alter table fu_main_world enable row level security;   -- no policies: only the functions below read/write it

create table if not exists fu_main_history (
  version bigint primary key,
  data jsonb not null,
  saved_at timestamptz not null default now(),
  saved_by text
);
alter table fu_main_history enable row level security;

-- the current world: {"version", "data", "saved_at", "saved_by"}, or null before the first save
create or replace function fu_main_load() returns jsonb
language sql security definer set search_path = public stable as $$
  select jsonb_build_object('version', version, 'data', data, 'saved_at', saved_at, 'saved_by', saved_by)
  from fu_main_world where id = 1;
$$;

-- save the world as the next version. Returns the new version, -1 if p_base is not the current version
-- (someone saved first: load again), -2 if the data is missing or too big.
create or replace function fu_main_save(p_base bigint, p_data jsonb, p_by text) returns bigint
language plpgsql security definer set search_path = public as $$
declare v bigint;
begin
  if p_data is null or pg_column_size(p_data) > 5000000 then return -2; end if;
  insert into fu_main_world (id, version) values (1, 0) on conflict (id) do nothing;
  update fu_main_world
     set version = version + 1, data = p_data, saved_at = now(), saved_by = left(coalesce(p_by, ''), 24)
   where id = 1 and version = p_base
  returning version into v;
  if v is null then return -1; end if;
  if v % 10 = 0 then
    insert into fu_main_history (version, data, saved_by) values (v, p_data, left(coalesce(p_by, ''), 24))
    on conflict (version) do nothing;
    delete from fu_main_history where version <= v - 300;
  end if;
  return v;
end $$;

grant execute on function fu_main_load() to anon, authenticated;
grant execute on function fu_main_save(bigint, jsonb, text) to anon, authenticated;

-- ---------- private Main Server chat log ----------
-- The host sends every Main Server chat line (and join/leave lines) here. Nobody can read it through the
-- site: only you, in the Supabase dashboard (Table Editor → fu_chat_log, or the query at the bottom).
-- Lines older than 30 days are deleted automatically.
create table if not exists fu_chat_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  name text,
  text text not null,
  kind text not null default 'chat'
);
alter table fu_chat_log enable row level security;   -- no policies: not readable or writable from the site
create index if not exists fu_chat_log_at on fu_chat_log (at desc);

create or replace function fu_chat_add(p_lines jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare e jsonb; n int := 0;
begin
  if jsonb_typeof(p_lines) <> 'array' then return 0; end if;
  if (select count(*) from fu_chat_log where at > now() - interval '10 seconds') > 200 then return 0; end if; -- flood guard
  for e in select * from jsonb_array_elements(p_lines) limit 50 loop
    if coalesce(e->>'x', '') = '' then continue; end if;
    insert into fu_chat_log (name, text, kind)
    values (left(coalesce(e->>'n', ''), 24), left(e->>'x', 200), case when e->>'k' = 'sys' then 'sys' else 'chat' end);
    n := n + 1;
  end loop;
  if random() < 0.02 then delete from fu_chat_log where at < now() - interval '30 days'; end if;
  return n;
end $$;
grant execute on function fu_chat_add(jsonb) to anon, authenticated;

-- (the leaderboard counted at most 13 fields; the bigger map has 29)
create or replace function fu_submit_score(p_user text, p_hash text, p_value bigint, p_earned bigint, p_harvested bigint, p_fields int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not fu_auth(p_user, p_hash) then raise exception 'bad login'; end if;
  insert into fu_scores (username, farm_value, earned, harvested, fields, updated_at)
  values (p_user, greatest(0, least(p_value, 1000000000)), greatest(0, least(p_earned, 1000000000)),
          greatest(0, least(p_harvested, 1000000000)), greatest(0, least(p_fields, 40)), now())
  on conflict (username) do update set farm_value = excluded.farm_value, earned = excluded.earned,
    harvested = excluded.harvested, fields = excluded.fields, updated_at = now();
end $$;

-- To read the Main Server chat (newest first, times in your time zone):
--   select at at time zone 'America/Chicago' as time, name, text, kind from fu_chat_log order by at desc limit 300;
--
-- To restore an older world (only if someone ever wrecks it): pick a version from
--   select version, saved_at, saved_by from fu_main_history order by version desc;
-- then:
--   update fu_main_world set data = (select data from fu_main_history where version = <N>), version = version + 1 where id = 1;
