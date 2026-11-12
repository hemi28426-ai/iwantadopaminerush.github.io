-- Farming Unblocked: the Admin Abuse password check (Duke only).
-- Paste into Supabase Dashboard > SQL Editor > Run (once). Then set the password with the line at the bottom.
-- Only a hash of the password is stored, in a table nobody can read; the game sends the hash of what Duke types and
-- gets back a one-time token per command, which the host redeems before sending the event to everyone (P2P).
-- Never write the real password into this file: the repo is public.

create table if not exists fu_admin_key (id int primary key default 1 check (id = 1), hash text not null);
create table if not exists fu_admin_cmd (
  tok uuid primary key default gen_random_uuid(),
  x text not null, k text not null default '', d int not null default 0,
  at timestamptz not null default now(), used boolean not null default false
);
create table if not exists fu_admin_fail (at timestamptz not null default now());

-- nobody reads or writes these tables directly, only through the functions below
alter table fu_admin_key enable row level security;
alter table fu_admin_cmd enable row level security;
alter table fu_admin_fail enable row level security;
revoke all on fu_admin_key, fu_admin_cmd, fu_admin_fail from anon, authenticated;

-- right password? After 20 wrong tries in 5 minutes everyone has to wait (stops guessing)
create or replace function fu_admin_ok(p_hash text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from fu_admin_fail where at > now() - interval '5 minutes') >= 20 then
    raise exception 'Too many wrong tries. Wait a few minutes.';
  end if;
  if exists (select 1 from fu_admin_key where id = 1 and hash = p_hash) then return true; end if;
  insert into fu_admin_fail default values;
  delete from fu_admin_fail where at < now() - interval '1 hour';
  return false;
end $$;
revoke all on function fu_admin_ok(text) from public, anon, authenticated;

-- the panel's Unlock button
create or replace function fu_admin_check(p_hash text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  return fu_admin_ok(p_hash);
end $$;

-- an event button: a one-time token (null = wrong password)
create or replace function fu_admin_cmd_new(p_hash text, p_x text, p_k text, p_d int) returns uuid
language plpgsql security definer set search_path = public as $$
declare t uuid;
begin
  if not fu_admin_ok(p_hash) then return null; end if;
  if p_x not in ('start', 'stop') or length(coalesce(p_k, '')) > 24 then raise exception 'bad command'; end if;
  delete from fu_admin_cmd where at < now() - interval '1 day';
  insert into fu_admin_cmd (x, k, d) values (p_x, coalesce(p_k, ''), greatest(0, least(coalesce(p_d, 0), 900))) returning tok into t;
  return t;
end $$;

-- the host: redeem a token once, within 2 minutes
create or replace function fu_admin_cmd_take(p_tok uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r fu_admin_cmd%rowtype;
begin
  update fu_admin_cmd set used = true where tok = p_tok and not used and at > now() - interval '2 minutes' returning * into r;
  if not found then return null; end if;
  return jsonb_build_object('x', r.x, 'k', r.k, 'd', r.d);
end $$;

grant execute on function fu_admin_check(text) to anon, authenticated;
grant execute on function fu_admin_cmd_new(text, text, text, int) to anon, authenticated;
grant execute on function fu_admin_cmd_take(uuid) to anon, authenticated;

-- Set or change the admin password: run this line on its own, with your password in place of YOUR-PASSWORD.
-- insert into fu_admin_key (id, hash) values (1, encode(sha256(convert_to('YOUR-PASSWORD' || '::fu-admin', 'UTF8')), 'hex')) on conflict (id) do update set hash = excluded.hash;
