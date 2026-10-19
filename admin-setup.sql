-- Admin tools for the "duke" account. Paste into Supabase Dashboard > SQL Editor > Run (once, after
-- leaderboard-setup.sql). Every admin function checks duke's password hash (same hashing as the site
-- login) before doing anything, so the public key alone can't use them.

-- per-game bans ('unblockednite', 'shoot-and-open', 'chess', or '*' for every game)
create table if not exists bans (
  username text not null,
  game text not null,
  reason text default '',
  created_at timestamptz not null default now(),
  primary key (username, game)
);
alter table bans enable row level security;
drop policy if exists "bans readable" on bans;
create policy "bans readable" on bans for select using (true); -- games read this to refuse banned players

create or replace function dr_is_admin(p_user text, p_hash text) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from shooter_players where lower(username) = 'duke' and lower(p_user) = 'duke' and password_hash = p_hash);
$$;

-- tables the admin page may touch
create or replace function dr_admin_table_ok(p_table text) returns boolean language sql immutable as $$
  select p_table = any (array['unf_wins','players','collection','trades','transactions','auctions','stock_shares','shooter_players','shooter_saves','chess_rooms','bans']);
$$;

-- list rows (password hashes are never returned), optional text search over the whole row
create or replace function admin_list(p_user text, p_hash text, p_table text, p_search text default '', p_limit int default 200)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if not dr_is_admin(p_user, p_hash) then raise exception 'not admin'; end if;
  if not dr_admin_table_ok(p_table) then raise exception 'table not allowed'; end if;
  execute format('select coalesce(jsonb_agg(r), ''[]''::jsonb) from (select to_jsonb(t) - ''password_hash'' as r from %I t where $1 = '''' or to_jsonb(t)::text ilike ''%%'' || $1 || ''%%'' limit $2) s', p_table)
    into v using coalesce(p_search, ''), least(greatest(p_limit, 1), 1000);
  return v;
end $$;

-- set one value: the row is found by p_key_col = p_key; the value is cast to the column's own type
create or replace function admin_set(p_user text, p_hash text, p_table text, p_key_col text, p_key text, p_col text, p_value jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not dr_is_admin(p_user, p_hash) then raise exception 'not admin'; end if;
  if not dr_admin_table_ok(p_table) then raise exception 'table not allowed'; end if;
  if p_col = 'password_hash' then raise exception 'not editable here'; end if;
  execute format('update %I set %I = (jsonb_populate_record(null::%I, jsonb_build_object(%L, $1))).%I where %I::text = $2', p_table, p_col, p_table, p_col, p_col, p_key_col)
    using p_value, p_key;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function admin_delete(p_user text, p_hash text, p_table text, p_key_col text, p_key text)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not dr_is_admin(p_user, p_hash) then raise exception 'not admin'; end if;
  if not dr_admin_table_ok(p_table) or p_table = 'shooter_players' then raise exception 'table not allowed'; end if;
  execute format('delete from %I where %I::text = $1', p_table, p_key_col) using p_key;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function admin_ban(p_user text, p_hash text, p_target text, p_game text, p_reason text default '', p_unban boolean default false)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not dr_is_admin(p_user, p_hash) then raise exception 'not admin'; end if;
  if p_unban then delete from bans where username = p_target and game = p_game;
  else insert into bans (username, game, reason) values (p_target, p_game, coalesce(p_reason, '')) on conflict (username, game) do update set reason = excluded.reason, created_at = now();
  end if;
end $$;

-- Unblockednite: banned players can't record wins
create or replace function unf_record_win(p_user text, p_hash text, p_elims int)
returns int language plpgsql security definer set search_path = public as $$
declare v_name text; v_wins int;
begin
  select username into v_name from shooter_players where username = p_user and password_hash = p_hash;
  if v_name is null then raise exception 'not signed in'; end if;
  if exists (select 1 from bans where username = v_name and game in ('unblockednite', '*')) then raise exception 'banned'; end if;
  if exists (select 1 from unf_wins where username = v_name and updated_at > now() - interval '60 seconds') then
    select wins into v_wins from unf_wins where username = v_name; return v_wins;
  end if;
  insert into unf_wins as w (username, wins, best_elims, updated_at)
  values (v_name, 1, greatest(0, least(coalesce(p_elims, 0), 500)), now())
  on conflict (username) do update set wins = w.wins + 1, best_elims = greatest(w.best_elims, least(coalesce(p_elims, 0), 500)), updated_at = now()
  returning wins into v_wins;
  return v_wins;
end $$;

revoke all on function admin_list(text, text, text, text, int), admin_set(text, text, text, text, text, text, jsonb), admin_delete(text, text, text, text, text), admin_ban(text, text, text, text, text, boolean) from public;
grant execute on function admin_list(text, text, text, text, int), admin_set(text, text, text, text, text, text, jsonb), admin_delete(text, text, text, text, text), admin_ban(text, text, text, text, text, boolean), unf_record_win(text, text, int) to anon, authenticated;
revoke execute on function dr_is_admin(text, text) from anon, authenticated;
