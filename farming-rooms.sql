-- Farming Unblocked: the list of co-op farms being hosted. Duke's Admin Abuse panel shows them, codes included,
-- so he can join any farm. Paste into Supabase Dashboard > SQL Editor > Run (once, after farming-admin.sql).
-- A hosting game sends one tiny update a minute; farms drop off the list 3 minutes after their last update.

create table if not exists fu_rooms (
  code text primary key,
  host text not null default '',
  players int not null default 1,
  seen timestamptz not null default now()
);
alter table fu_rooms enable row level security; -- nobody reads it directly, only through the functions below
revoke all on fu_rooms from anon, authenticated;

-- a host: "my farm is still open"
create or replace function fu_room_beat(p_code text, p_host text, p_players int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_code is null or p_code !~ '^[A-HJ-NP-Z]{4}$' or p_code = 'FARM' then return; end if;
  delete from fu_rooms where seen < now() - interval '3 minutes';
  if (select count(*) from fu_rooms) >= 300 and not exists (select 1 from fu_rooms where code = p_code) then return; end if;
  insert into fu_rooms (code, host, players, seen)
    values (p_code, left(coalesce(p_host, ''), 20), greatest(1, least(coalesce(p_players, 1), 16)), now())
    on conflict (code) do update set host = excluded.host, players = excluded.players, seen = now();
end $$;

-- a host closed the farm
create or replace function fu_room_end(p_code text) returns void
language sql security definer set search_path = public as $$
  delete from fu_rooms where code = p_code;
$$;

-- Duke's panel: every open farm (needs the admin password, checked by fu_admin_ok from farming-admin.sql)
create or replace function fu_room_list(p_hash text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not fu_admin_ok(p_hash) then return null; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('code', code, 'host', host, 'players', players) order by seen desc)
    from fu_rooms where seen > now() - interval '3 minutes'), '[]'::jsonb);
end $$;

grant execute on function fu_room_beat(text, text, int) to anon, authenticated;
grant execute on function fu_room_end(text) to anon, authenticated;
grant execute on function fu_room_list(text) to anon, authenticated;
