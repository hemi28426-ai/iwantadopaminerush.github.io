-- Admin.HTML rename fix. Paste ALL of this into Supabase -> SQL Editor -> Run. Safe to run more than once.
-- Fixes: renames failing on players who published Unbloxed Studio games (foreign key), renames failing when old
-- leftover rows already used the new name, and renamed players staying signed in under their old name.

-- 1) the admin check (same as admin-setup.sql)
create or replace function public.dr_is_admin(p_user text, p_hash text) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from shooter_players where lower(username) = 'duke' and lower(p_user) = 'duke' and password_hash = p_hash);
$$;

-- 2) anything that points at an account (shooter_saves.username, ubx_games.author, ...) now follows a rename
--    instead of blocking it. admin_rename also re-runs this every time, so tables added later are covered too.
create or replace function public.dr_fix_username_fks() returns int
language plpgsql security definer set search_path = public as $$
declare c record; def text; n int := 0;
begin
  for c in
    select distinct con.oid, con.conname, con.conrelid::regclass as tbl, pg_get_constraintdef(con.oid) as d
    from pg_constraint con
    join pg_attribute a on a.attrelid = con.confrelid and a.attnum = any (con.confkey)
    where con.contype = 'f' and con.connamespace = 'public'::regnamespace
      and (con.confupdtype <> 'c' or not con.condeferrable)
      and (a.attname = 'username' or con.confrelid = 'public.shooter_players'::regclass)
  loop
    def := regexp_replace(c.d, ' ON UPDATE (RESTRICT|SET NULL|SET DEFAULT|NO ACTION|CASCADE)', '');
    def := regexp_replace(def, ' (NOT )?DEFERRABLE( INITIALLY (DEFERRED|IMMEDIATE))?', '', 'g');
    def := regexp_replace(def, '(REFERENCES [^)]*\))', '\1 ON UPDATE CASCADE') || ' DEFERRABLE INITIALLY IMMEDIATE';
    execute format('alter table %s drop constraint %I', c.tbl, c.conname);
    execute format('alter table %s add constraint %I %s', c.tbl, c.conname, def);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.dr_fix_username_fks() from public, anon, authenticated;
select public.dr_fix_username_fks();

-- 3) remember renames, so a player still signed in with the old name gets told the new one
create table if not exists public.account_renames (
  old_name text primary key,
  new_name text not null,
  at timestamptz not null default now()
);
alter table public.account_renames enable row level security;  -- no policies: only the functions below use it

-- 4) reset password (unchanged)
create or replace function public.admin_reset_pw(p_user text, p_hash text, p_target text, p_newhash text)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not dr_is_admin(p_user, p_hash) then raise exception 'not admin'; end if;
  if p_newhash !~ '^[0-9a-f]{64}$' then raise exception 'bad hash'; end if;
  update shooter_players set password_hash = p_newhash where lower(username) = lower(p_target);
  get diagnostics n = row_count;
  if n = 0 then raise exception 'no such account'; end if;
  return n;
end $$;

-- 5) rename: moves the account plus every row that names the player (saves, scores, bans, studio games, ...)
drop function if exists public.admin_rename(text, text, text, text, text);
create function public.admin_rename(p_user text, p_hash text, p_target text, p_newname text, p_newhash text)
returns int language plpgsql security definer set search_path = public as $$
declare v_old text; n int := 0; k int; r record; same boolean;
begin
  if not dr_is_admin(p_user, p_hash) then raise exception 'not admin'; end if;
  p_target := trim(coalesce(p_target, '')); p_newname := trim(coalesce(p_newname, ''));
  if lower(p_target) = 'duke' then raise exception 'cannot rename the admin account'; end if;
  if p_newname !~ '^[A-Za-z0-9_.]{3,20}$' then raise exception 'bad name (3-20 letters, numbers, _ or .)'; end if;
  if lower(p_newname) = 'duke' then raise exception 'that name is reserved'; end if;
  if p_newhash !~ '^[0-9a-f]{64}$' then raise exception 'bad hash'; end if;
  select username into v_old from shooter_players where lower(username) = lower(p_target) order by (username = p_target) desc limit 1;
  if v_old is null then raise exception 'no such account'; end if;
  perform dr_fix_username_fks();          -- make every link to the account follow the rename
  set constraints all deferred;           -- and only check those links once everything has moved
  same := lower(v_old) = lower(p_newname);
  if not same and exists (select 1 from shooter_players where lower(username) = lower(p_newname)) then raise exception 'that name is taken'; end if;

  -- 1st: clear leftover rows from an old, deleted account that already used the new name (they would block the move)
  if not same then
    for r in select c.table_name from information_schema.columns c
             join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
             where c.table_schema = 'public' and t.table_type = 'BASE TABLE' and c.column_name = 'username'
               and c.data_type in ('text', 'character varying')
               and c.table_name not in ('shooter_players', 'account_renames', 'admin_requests') loop
      execute format('delete from public.%I where lower(username) = lower($1)', r.table_name) using p_newname;
    end loop;
  end if;

  -- 2nd: the account itself (linked tables like shooter_saves and ubx_games follow it automatically)
  update shooter_players set username = p_newname, password_hash = p_newhash where username = v_old;

  -- 3rd: every other table with a column that holds a player name
  for r in select c.table_name, c.column_name from information_schema.columns c
           join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
           where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
             and c.column_name in ('username', 'author', 'host', 'owner', 'user_name', 'player_name')
             and c.data_type in ('text', 'character varying')
             and c.table_name not in ('shooter_players', 'account_renames', 'admin_requests') loop
    begin
      execute format('update public.%I set %I = $1 where lower(%I) = lower($2)', r.table_name, r.column_name, r.column_name) using p_newname, v_old;
      get diagnostics k = row_count; n := n + k;
    exception when others then
      raise exception 'rename stopped at table %.% : %', r.table_name, r.column_name, sqlerrm;
    end;
  end loop;
  set constraints all immediate;          -- check every link now, so a problem shows here with a clear message

  if not same then
    update account_renames set new_name = p_newname, at = now() where lower(new_name) = lower(v_old);
    insert into account_renames (old_name, new_name) values (lower(v_old), p_newname)
      on conflict (old_name) do update set new_name = excluded.new_name, at = now();
    delete from account_renames where lower(old_name) = lower(p_newname);
  end if;
  return n;
end $$;

-- 6) pages call this once per visit: is my saved login still good? if not, was I renamed?
create or replace function public.dr_login_check(p_user text, p_hash text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if exists (select 1 from shooter_players where lower(username) = lower(p_user) and password_hash = p_hash) then
    return jsonb_build_object('ok', true);
  end if;
  return jsonb_build_object('ok', false, 'renamed_to', (select new_name from account_renames where old_name = lower(p_user)));
end $$;

revoke all on function public.admin_reset_pw(text, text, text, text), public.admin_rename(text, text, text, text, text), public.dr_login_check(text, text) from public;
grant execute on function public.admin_reset_pw(text, text, text, text), public.admin_rename(text, text, text, text, text), public.dr_login_check(text, text) to anon, authenticated;
