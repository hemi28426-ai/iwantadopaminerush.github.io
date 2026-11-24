-- Unbloxed announcements: duke posts a message from admin.html, every open Unbloxed page shows it within about a minute.
-- Paste ALL of this into Supabase -> SQL Editor -> Run. Safe to run more than once.
-- Only the newest announcement that hasn't run out is shown. The table can't be read or written directly: only through the
-- functions below (posting and clearing check duke's password hash, like the other admin tools).

create table if not exists public.ubx_announce (
  id bigserial primary key,
  msg text not null,
  at timestamptz not null default now(),
  until timestamptz            -- null = stays up until cleared
);
alter table public.ubx_announce enable row level security; -- no policies: no direct access

-- the duke check (same as subadmin-setup.sql, repeated so this file works on its own)
create or replace function public.dr_login_ok(p_user text, p_hash text) returns boolean
language sql security definer set search_path = public as $$
  select exists (select 1 from shooter_players where username = p_user and password_hash = p_hash);
$$;
create or replace function public.dr_is_duke(p_user text, p_hash text) returns boolean
language sql security definer set search_path = public as $$
  select lower(p_user) = 'duke' and dr_login_ok(p_user, p_hash);
$$;

-- everyone: the current announcement, or null
create or replace function public.ubx_announce_get() returns jsonb
language sql security definer set search_path = public as $$
  select coalesce((
    select jsonb_build_object('id', id, 'msg', msg, 'at', at, 'until', until)
    from ubx_announce where until is null or until > now() order by id desc limit 1
  ), 'null'::jsonb);
$$;

-- duke: post one (p_minutes <= 0 = until cleared); keeps the last 50
create or replace function public.ubx_announce_set(p_user text, p_hash text, p_msg text, p_minutes int) returns bigint
language plpgsql security definer set search_path = public as $$
declare nid bigint;
begin
  if not dr_is_duke(p_user, p_hash) then raise exception 'Only duke can post announcements'; end if;
  if p_msg is null or length(trim(p_msg)) = 0 then raise exception 'The announcement is empty'; end if;
  insert into ubx_announce (msg, until)
    values (left(trim(p_msg), 300), case when coalesce(p_minutes, 0) > 0 then now() + make_interval(mins => p_minutes) else null end)
    returning id into nid;
  delete from ubx_announce where id < nid - 50;
  return nid;
end $$;

-- duke: take the current one down
create or replace function public.ubx_announce_clear(p_user text, p_hash text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not dr_is_duke(p_user, p_hash) then raise exception 'Only duke can clear announcements'; end if;
  update ubx_announce set until = now() where until is null or until > now();
end $$;

grant execute on function public.ubx_announce_get() to anon, authenticated;
grant execute on function public.ubx_announce_set(text, text, text, int) to anon, authenticated;
grant execute on function public.ubx_announce_clear(text, text) to anon, authenticated;
