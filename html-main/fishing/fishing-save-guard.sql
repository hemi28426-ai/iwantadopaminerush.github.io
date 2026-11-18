-- Fishing Unblocked: save guard (Nov 17). Run once in Supabase -> SQL Editor, after fishing-setup.sql.
-- Stops a cloud save from being replaced by one with FEWER catches (a blank or stale copy of the game),
-- and keeps the copy it refused in fish_save_rejected so nothing is ever lost. Same fish_save signature,
-- so the game needs no other change, and it adds no extra requests.

create or replace function public.fish_catches(d jsonb) returns int
language sql immutable as $$
  select coalesce(sum(case when jsonb_typeof(v->'n') = 'number' then (v->>'n')::numeric else 0 end), 0)::int
  from jsonb_each(case when jsonb_typeof(d->'book') = 'object' then d->'book' else '{}'::jsonb end) as e(k, v)
$$;

create table if not exists public.fish_save_rejected (
  username text primary key,
  data     jsonb not null,
  at       timestamptz not null default now()
);
alter table public.fish_save_rejected enable row level security;

create or replace function public.fish_save(p_user text, p_hash text, p_data jsonb)
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
  select * into old from fish_saves where username = p_user;
  if found and fish_catches(p_data) < fish_catches(old.data) then
    -- fewer catches than the cloud copy: keep the cloud copy, park the newcomer (one row per player)
    insert into fish_save_rejected (username, data, at) values (p_user, p_data, t)
    on conflict (username) do update set data = excluded.data, at = t;
    return old.saved_at;
  end if;
  insert into fish_saves (username, data, saved_at) values (p_user, p_data, t)
  on conflict (username) do update set data = excluded.data, saved_at = t;
  return t;
end $$;

revoke all on function public.fish_save(text, text, jsonb) from public;
grant execute on function public.fish_save(text, text, jsonb) to anon, authenticated;
