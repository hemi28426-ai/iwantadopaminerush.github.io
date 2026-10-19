-- Unblockednite win leaderboard. Paste into Supabase Dashboard > SQL Editor > Run (once).
-- Uses the site accounts (shooter_players, same login as Shoot & Open). Anyone can read the board;
-- wins can only be added through unf_record_win, which checks the account's password hash.

create table if not exists unf_wins (
  username text primary key,
  wins int not null default 0,
  best_elims int not null default 0,
  updated_at timestamptz not null default now()
);

alter table unf_wins enable row level security;
drop policy if exists "unf_wins readable by everyone" on unf_wins;
create policy "unf_wins readable by everyone" on unf_wins for select using (true);
-- (no insert/update policies: writes only happen inside the function below)

create or replace function unf_record_win(p_user text, p_hash text, p_elims int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_wins int;
begin
  -- the account must exist and the password hash must match (same check the site login does)
  select username into v_name from shooter_players where username = p_user and password_hash = p_hash;
  if v_name is null then
    raise exception 'not signed in';
  end if;
  -- at most one win a minute per account (stops scripted spam)
  if exists (select 1 from unf_wins where username = v_name and updated_at > now() - interval '60 seconds') then
    select wins into v_wins from unf_wins where username = v_name;
    return v_wins;
  end if;
  insert into unf_wins as w (username, wins, best_elims, updated_at)
  values (v_name, 1, greatest(0, least(coalesce(p_elims, 0), 500)), now())
  on conflict (username) do update
    set wins = w.wins + 1,
        best_elims = greatest(w.best_elims, least(coalesce(p_elims, 0), 500)),
        updated_at = now()
  returning wins into v_wins;
  return v_wins;
end;
$$;

revoke all on function unf_record_win(text, text, int) from public;
grant execute on function unf_record_win(text, text, int) to anon, authenticated;
