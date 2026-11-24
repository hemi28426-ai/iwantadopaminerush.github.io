-- Sub-admins: can press any admin button, but every action becomes a request that duke must approve.
-- Run once in Supabase -> SQL Editor. Uses the site's shared logins (public.shooter_players).

create table if not exists public.admin_subs (
  username text primary key
);
alter table public.admin_subs enable row level security;

create table if not exists public.admin_requests (
  id          bigserial primary key,
  requester   text not null,
  fn          text not null,
  args        jsonb not null default '{}'::jsonb,
  summary     text not null default '',
  status      text not null default 'pending',  -- pending | approved | denied | failed
  note        text not null default '',
  created_at  timestamptz not null default now(),
  decided_at  timestamptz
);
alter table public.admin_requests enable row level security;

insert into public.admin_subs (username) values ('xenox.6') on conflict do nothing;

-- login checks
create or replace function public.dr_login_ok(p_user text, p_hash text) returns boolean
language sql security definer set search_path = public as $$
  select exists (select 1 from shooter_players where username = p_user and password_hash = p_hash);
$$;
create or replace function public.dr_is_duke(p_user text, p_hash text) returns boolean
language sql security definer set search_path = public as $$
  select lower(p_user) = 'duke' and dr_login_ok(p_user, p_hash);
$$;
create or replace function public.dr_is_sub(p_user text, p_hash text) returns boolean
language sql security definer set search_path = public as $$
  select dr_login_ok(p_user, p_hash) and exists (select 1 from admin_subs where lower(username) = lower(p_user));
$$;

-- sub-admin: ask duke to run an admin action
create or replace function public.sub_request(p_user text, p_hash text, p_fn text, p_args jsonb, p_summary text) returns bigint
language plpgsql security definer set search_path = public as $$
declare rid bigint;
begin
  if not dr_is_sub(p_user, p_hash) then raise exception 'not a sub-admin' using errcode = '28000'; end if;
  if p_fn not in ('fish_admin_set_money','admin_ban','admin_reset_pw','admin_rename','fu_motm_set','fu_admin_set_money','dr_set_site_status','admin_set','admin_delete') then
    raise exception 'unknown action';
  end if;
  if (select count(*) from admin_requests where requester = p_user and status = 'pending') >= 20 then
    raise exception 'too many pending requests, wait for duke';
  end if;
  insert into admin_requests (requester, fn, args, summary) values (p_user, p_fn, coalesce(p_args, '{}'::jsonb), left(coalesce(p_summary, ''), 300))
  returning id into rid;
  return rid;
end $$;

-- sub-admin: see your own requests; duke: see all
create or replace function public.sub_requests(p_user text, p_hash text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if dr_is_duke(p_user, p_hash) then
    return coalesce((select jsonb_agg(to_jsonb(r) order by r.id desc) from (select * from admin_requests order by id desc limit 100) r), '[]'::jsonb);
  end if;
  if not dr_is_sub(p_user, p_hash) then raise exception 'not a sub-admin' using errcode = '28000'; end if;
  return coalesce((select jsonb_agg(to_jsonb(r) order by r.id desc) from (select * from admin_requests where requester = p_user order by id desc limit 50) r), '[]'::jsonb);
end $$;

-- duke: how many requests are waiting (for the site-wide notification)
create or replace function public.sub_pending(p_user text, p_hash text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not dr_is_duke(p_user, p_hash) then return null; end if;
  return (select jsonb_build_object('count', count(*), 'latest', max(requester || ': ' || summary)) from admin_requests where status = 'pending');
end $$;

-- duke: mark a request approved / denied / failed (approved actions are run by duke's own admin page first)
create or replace function public.sub_decide(p_user text, p_hash text, p_id bigint, p_status text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not dr_is_duke(p_user, p_hash) then raise exception 'not admin' using errcode = '28000'; end if;
  if p_status not in ('approved','denied','failed') then raise exception 'bad status'; end if;
  update admin_requests set status = p_status, note = left(coalesce(p_note, ''), 300), decided_at = now() where id = p_id and status = 'pending';
end $$;

revoke all on function public.dr_login_ok(text,text), public.dr_is_duke(text,text), public.dr_is_sub(text,text) from public, anon, authenticated;
grant execute on function public.sub_request(text,text,text,jsonb,text), public.sub_requests(text,text), public.sub_pending(text,text), public.sub_decide(text,text,bigint,text,text) to anon, authenticated;
