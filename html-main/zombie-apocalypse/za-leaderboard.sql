-- Zombie Apocalypse global leaderboard (Supabase). Run once in the SQL editor.
-- Keeps each name's best run; anon clients can only go through the two RPCs below.
create table if not exists public.za_scores(
  name text primary key,
  wave int not null,
  kills int not null default 0,
  diff text not null default 'normal',
  at timestamptz not null default now()
);
alter table public.za_scores enable row level security;   -- no policies: direct table access is denied
revoke all on table public.za_scores from anon, authenticated;

create or replace function public.za_submit(p_name text, p_wave int, p_kills int, p_diff text)
returns void language plpgsql security definer set search_path = public as $$
declare n text := btrim(regexp_replace(coalesce(p_name, ''), '[<>&"\x00-\x1f]', '', 'g'));
        k int := least(greatest(coalesce(p_kills, 0), 0), 1000000);
        d text := case when p_diff in ('easy', 'normal', 'nightmare') then p_diff else 'normal' end;
begin
  if length(n) < 1 or length(n) > 20 then return; end if;
  if p_wave is null or p_wave < 1 or p_wave > 999 then return; end if;
  insert into public.za_scores(name, wave, kills, diff, at) values (n, p_wave, k, d, now())
  on conflict (name) do update set wave = excluded.wave, kills = excluded.kills, diff = excluded.diff, at = excluded.at
  where excluded.wave > za_scores.wave or (excluded.wave = za_scores.wave and excluded.kills > za_scores.kills);
end $$;

create or replace function public.za_top()
returns table(name text, wave int, kills int, diff text, at timestamptz)
language sql stable security definer set search_path = public as $$
  select s.name, s.wave, s.kills, s.diff, s.at from public.za_scores s order by s.wave desc, s.kills desc, s.at asc limit 10
$$;

revoke all on function public.za_submit(text, int, int, text) from public;
revoke all on function public.za_top() from public;
grant execute on function public.za_submit(text, int, int, text) to anon, authenticated;
grant execute on function public.za_top() to anon, authenticated;
