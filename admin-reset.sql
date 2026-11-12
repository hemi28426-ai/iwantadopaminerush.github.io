-- Dopamine Rush admin: reset a player's password, or rename a player (for classmates who forgot their login).
-- Paste into Supabase Dashboard > SQL Editor > Run (once, after admin-setup.sql). Only the duke account can use these.
-- Passwords are stored one-way hashed, so these SET a new one; they never reveal anyone's existing password.
-- The admin page hashes the new password in the browser (same salt as sign-in), so the plaintext never leaves it.

-- Reset a player's password. p_newhash = sha256(newpassword || '::shooter::' || lower(target)), sent by the admin page.
create or replace function admin_reset_pw(p_user text, p_hash text, p_target text, p_newhash text)
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

-- Rename a player and set a new password at the same time (the stored login is salted with the username, so a
-- rename can't keep the old password). Everything keyed by username — saves, scores, bans — moves to the new name,
-- across every public table that has a username column. p_newhash is salted with the NEW name.
create or replace function admin_rename(p_user text, p_hash text, p_target text, p_newname text, p_newhash text)
returns int language plpgsql security definer set search_path = public as $$
declare n int; r record;
begin
  if not dr_is_admin(p_user, p_hash) then raise exception 'not admin'; end if;
  if lower(p_target) = 'duke' then raise exception 'cannot rename the admin account'; end if;
  if p_newname !~ '^[A-Za-z0-9_.]{3,20}$' then raise exception 'bad name (3-20 letters, numbers, _ or .)'; end if;
  if lower(p_newname) = 'duke' then raise exception 'that name is reserved'; end if;
  if p_newhash !~ '^[0-9a-f]{64}$' then raise exception 'bad hash'; end if;
  if not exists (select 1 from shooter_players where lower(username) = lower(p_target)) then raise exception 'no such account'; end if;
  if exists (select 1 from shooter_players where lower(username) = lower(p_newname) and lower(username) <> lower(p_target)) then raise exception 'that name is taken'; end if;
  -- move every username-keyed row (the account, cloud saves, scores, bans, …) onto the new name
  for r in select c.table_name from information_schema.columns c
           join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
           where c.table_schema = 'public' and c.column_name = 'username' and t.table_type = 'BASE TABLE' loop
    execute format('update public.%I set username = $1 where lower(username) = lower($2)', r.table_name) using p_newname, p_target;
  end loop;
  update shooter_players set password_hash = p_newhash where lower(username) = lower(p_newname);
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function admin_reset_pw(text, text, text, text), admin_rename(text, text, text, text, text) from public;
grant execute on function admin_reset_pw(text, text, text, text), admin_rename(text, text, text, text, text) to anon, authenticated;
