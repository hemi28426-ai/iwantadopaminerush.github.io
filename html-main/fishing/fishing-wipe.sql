-- Fishing Unblocked: FULL PROGRESS WIPE (wipe #1). Paste once into Supabase -> SQL Editor and run.
-- Run it AFTER fishing-setup.sql (and fishing-save-guard.sql if you used it; this script works either way).
--
-- What it does, in order, all inside ONE transaction (if anything fails, nothing at all changes):
--   1. Backs up fish_saves (and fish_save_rejected if it exists) into *_backup_wipe1 tables. Backups are
--      only created if missing, so re-running this script can never overwrite the original backup.
--   2. Backs up, then empties, any fishing leaderboard-looking table (fish... + lb/leader/score/top).
--   3. Deletes the old saves (and parked rejected saves).
--   4. Replaces fish_save() so only saves carrying "wipe": 1 (or higher) are accepted. Old copies of the
--      game (no "wipe" field) can no longer write anything; their saves are parked in fish_save_rejected.
--   5. Shows counts so you can check it worked.
-- At the bottom there is a commented-out UNDO section.
--
-- Safe to re-run: backups are never overwritten and the save deletes only remove saves that are still
-- pre-wipe (wipe < 1), so a re-run will not delete progress players have made since the wipe.
-- (Leaderboard tables are emptied completely each time because we do not know their layout.)

begin;

-- Helper: the "wipe" number of a save. Missing, non-numeric, negative or silly values count as 0.
create or replace function public.fish_wipe_of(d jsonb) returns int
language sql immutable as $$
  select case when jsonb_typeof(d->'wipe') = 'number'
              then least(greatest(floor((d->>'wipe')::numeric), 0), 1000000)::int
              else 0 end
$$;

-- Helper: total catches in a save (same as fishing-save-guard.sql, recreated so this script stands alone).
create or replace function public.fish_catches(d jsonb) returns int
language sql immutable as $$
  select coalesce(sum(case when jsonb_typeof(v->'n') = 'number' then (v->>'n')::numeric else 0 end), 0)::int
  from jsonb_each(case when jsonb_typeof(d->'book') = 'object' then d->'book' else '{}'::jsonb end) as e(k, v)
$$;

-- Make sure the "parked saves" table exists (same shape as in fishing-save-guard.sql).
create table if not exists public.fish_save_rejected (
  username text primary key,
  data     jsonb not null,
  at       timestamptz not null default now()
);
alter table public.fish_save_rejected enable row level security;

-- ============================================================================
-- 1. BACKUPS (only if they do not exist yet; RLS on with no policies = private)
-- ============================================================================
do $$
begin
  if to_regclass('public.fish_saves_backup_wipe1') is null then
    create table public.fish_saves_backup_wipe1 as
      select *, now() as backed_up_at from public.fish_saves;
    alter table public.fish_saves_backup_wipe1 alter column backed_up_at set default now();
    alter table public.fish_saves_backup_wipe1 enable row level security;
    raise notice 'Created backup public.fish_saves_backup_wipe1';
  else
    raise notice 'Backup public.fish_saves_backup_wipe1 already exists - left untouched';
  end if;

  if to_regclass('public.fish_save_rejected') is not null then
    if to_regclass('public.fish_save_rejected_backup_wipe1') is null then
      create table public.fish_save_rejected_backup_wipe1 as
        select *, now() as backed_up_at from public.fish_save_rejected;
      alter table public.fish_save_rejected_backup_wipe1 alter column backed_up_at set default now();
      alter table public.fish_save_rejected_backup_wipe1 enable row level security;
      raise notice 'Created backup public.fish_save_rejected_backup_wipe1';
    else
      raise notice 'Backup public.fish_save_rejected_backup_wipe1 already exists - left untouched';
    end if;
  end if;
end $$;

-- ============================================================================
-- 2. LEADERBOARD: back up then empty any fishing leaderboard-style table
--    (name starts with "fish" and contains lb, leader, score or top)
-- ============================================================================
do $$
declare r record; bk text; n bigint; found_any boolean := false;
begin
  for r in
    select tablename from pg_tables
    where schemaname = 'public'
      and tablename ilike 'fish%'
      and tablename ~* '(lb|leader|score|top)'
      and tablename !~ '_backup_wipe1$'
    order by tablename
  loop
    found_any := true;
    bk := r.tablename || '_backup_wipe1';
    if to_regclass(format('public.%I', bk)) is null then
      execute format('create table public.%I as select * from public.%I', bk, r.tablename);
      execute format('alter table public.%I enable row level security', bk);
      raise notice 'Backed up public.% to public.%', r.tablename, bk;
    else
      raise notice 'Backup public.% already exists - left untouched', bk;
    end if;
    execute format('delete from public.%I', r.tablename);
    get diagnostics n = row_count;
    raise notice 'Emptied leaderboard table public.% (% rows deleted)', r.tablename, n;
  end loop;
  if not found_any then
    raise notice 'no fishing leaderboard table found';
  end if;
end $$;

-- ============================================================================
-- 3. WIPE the old saves (only ones that are still pre-wipe, so a re-run is harmless)
-- ============================================================================
delete from public.fish_saves         where public.fish_wipe_of(data) < 1;
delete from public.fish_save_rejected where public.fish_wipe_of(data) < 1;

-- ============================================================================
-- 4. NEW fish_save: only accepts saves with "wipe" >= 1, and never goes back to an older wipe
-- ============================================================================
create or replace function public.fish_save(p_user text, p_hash text, p_data jsonb)
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare t timestamptz := now(); old fish_saves%rowtype; w_new int; w_old int; had_row boolean;
begin
  if not exists (select 1 from shooter_players where username = p_user and password_hash = p_hash) then
    raise exception 'bad login' using errcode = '28000';
  end if;
  if octet_length(p_data::text) > 300000 then
    raise exception 'save too big';
  end if;
  w_new := fish_wipe_of(p_data);
  select * into old from fish_saves where username = p_user;
  had_row := found;  -- remember now: later inserts reset FOUND

  if w_new < 1 then
    -- pre-wipe save (old copy of the game): never store it, even if there is no row; park it
    insert into fish_save_rejected (username, data, at) values (p_user, p_data, t)
    on conflict (username) do update set data = excluded.data, at = t;
    return case when had_row then old.saved_at else t end;
  end if;

  if had_row then
    w_old := fish_wipe_of(old.data);
    if w_new < w_old
       or (w_new = w_old and fish_catches(p_data) < fish_catches(old.data)) then
      -- older wipe, or same wipe but fewer catches than the cloud copy: keep cloud copy, park the newcomer
      insert into fish_save_rejected (username, data, at) values (p_user, p_data, t)
      on conflict (username) do update set data = excluded.data, at = t;
      return old.saved_at;
    end if;
  end if;

  -- newer wipe, or same wipe with at least as many catches, or first save: accept
  insert into fish_saves (username, data, saved_at) values (p_user, p_data, t)
  on conflict (username) do update set data = excluded.data, saved_at = t;
  return t;
end $$;

revoke all on function public.fish_save(text, text, jsonb) from public;
grant execute on function public.fish_save(text, text, jsonb) to anon, authenticated;

-- "Keep this computer's progress" button (from bug-fixes-2026-11-22.sql), now also refusing pre-wipe saves.
create or replace function public.fish_save_force(p_user text, p_hash text, p_data jsonb)
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare t timestamptz := now(); old fish_saves%rowtype;
begin
  if not exists (select 1 from shooter_players where username = p_user and password_hash = p_hash) then
    raise exception 'bad login' using errcode = '28000';
  end if;
  if octet_length(p_data::text) > 300000 then
    raise exception 'save too big';
  end if;
  if fish_wipe_of(p_data) < 1 then
    raise exception 'old save';
  end if;
  select * into old from fish_saves where username = p_user;
  if found then
    insert into fish_save_rejected (username, data, at) values (p_user, old.data, t)
    on conflict (username) do update set data = excluded.data, at = t;
  end if;
  insert into fish_saves (username, data, saved_at) values (p_user, p_data, t)
  on conflict (username) do update set data = excluded.data, saved_at = t;
  return t;
end $$;
revoke all on function public.fish_save_force(text, text, jsonb) from public;
grant execute on function public.fish_save_force(text, text, jsonb) to anon, authenticated;

commit;

-- ============================================================================
-- 5. CHECK: row counts (fish_saves should be 0 right after the wipe)
-- ============================================================================
select
  (select count(*) from public.fish_saves_backup_wipe1) as saves_backed_up,
  (select count(*) from public.fish_save_rejected_backup_wipe1) as rejected_backed_up,
  (select count(*) from public.fish_saves) as fish_saves_now;

-- ============================================================================
-- UNDO (commented out). To restore the old saves, select the lines below and run them.
-- This puts the backed-up saves back (it overwrites any same-username rows made since the wipe).
-- Note: the new fish_save() above still refuses pre-wipe saves from the game, so to let the old
-- progress actually be used you would also need to re-run fishing-save-guard.sql (the old fish_save).
-- ============================================================================
-- begin;
--   insert into public.fish_saves (username, data, saved_at)
--   select username, data, saved_at from public.fish_saves_backup_wipe1
--   on conflict (username) do update set data = excluded.data, saved_at = excluded.saved_at;
--   -- optional: also restore parked saves
--   -- insert into public.fish_save_rejected (username, data, at)
--   -- select username, data, at from public.fish_save_rejected_backup_wipe1
--   -- on conflict (username) do update set data = excluded.data, at = excluded.at;
-- commit;
