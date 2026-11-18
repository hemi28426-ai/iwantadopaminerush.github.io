-- Unbloxed Dominus vote (prize 4) + the Dominus Awards ceremony (all 4 prizes).
-- Paste ALL of this into Supabase -> SQL Editor -> Run. Safe to run more than once.
-- One vote per site account and no voting for yourself (enforced here, not in the browser). Votes can't be read
-- directly: only the totals below. Award winners stay hidden from players until duke ends the ceremony in admin.html.

-- ===== tables (before the functions: they use these row types) =====
create table if not exists public.ubx_poll (
  id          text primary key,
  choices     text[] not null,
  ends_at     timestamptz,
  closed      boolean not null default false,
  winner      text,
  winner_pick text
);
create table if not exists public.ubx_poll_votes (
  poll   text not null,
  voter  text not null,
  choice text not null,
  at     timestamptz not null default now()
);
create unique index if not exists ubx_poll_votes_one on public.ubx_poll_votes (poll, lower(voter));

-- the 4 awards from the giveaway popup. prize = a Dominus id or name from html-main/unbloxed/dominus-choices.js
-- (Most Respectable's prize is whatever Dominus the vote winner picks). Winners and prizes are set from admin.html.
create table if not exists public.ubx_awards (
  id        text primary key,
  sort      int  not null default 0,
  label     text not null,
  prize     text not null default '',
  winner    text,
  game_id   text,   -- Best Game: the Unbloxed Studio game (its creator is the winner)
  game_name text
);
create table if not exists public.ubx_award_ceremony (
  id       text primary key,
  ended    boolean not null default false,
  ended_at timestamptz
);
-- every Dominus handed out (by ending the ceremony, by the vote winner's pick after it, or by duke's Give button).
-- The Unbloxed hub reads the signed-in player's rows and adds those hats to their inventory.
create table if not exists public.ubx_award_grants (
  id       bigserial primary key,
  username text not null,
  prize    text not null,
  award    text not null,   -- an award id, or 'manual'
  at       timestamptz not null default now(),
  given_by text
);
create unique index if not exists ubx_award_grants_once on public.ubx_award_grants (lower(username), award) where award <> 'manual';
create index if not exists ubx_award_grants_user on public.ubx_award_grants (lower(username));

alter table public.ubx_poll enable row level security;        -- no policies: only the functions below touch these
alter table public.ubx_poll_votes enable row level security;
alter table public.ubx_awards enable row level security;
alter table public.ubx_award_ceremony enable row level security;
alter table public.ubx_award_grants enable row level security;

-- the 4 finalists; voting ends Friday 20 Nov 2026, 11:59 PM US Eastern (change it any time from admin.html)
insert into public.ubx_poll (id, choices, ends_at)
values ('dominus', array['Xenox.6','Matt','JonahSmash','Shxrk'], '2026-11-21 04:59:00+00')
on conflict (id) do nothing;

-- prizes as announced: 1 the custom Builder Dominus ('builder' = Dominus Doom in the game), 2 Dominus Aureus, 3 Dominus Pittacium,
-- 4 any Dominus (the vote winner picks)
insert into public.ubx_awards (id, sort, label, prize) values
  ('best_game',   1, 'Best Game',        'builder'),
  ('playtime',    2, 'Most Playtime',    'aureus'),
  ('money',       3, 'Most Money',       'pittacium'),
  ('respectable', 4, 'Most Respectable', '')
on conflict (id) do nothing;
insert into public.ubx_award_ceremony (id) values ('main') on conflict (id) do nothing;

-- ===== functions =====
create or replace function public.ubx_poll_login_ok(p_user text, p_hash text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(p_user, '') <> '' and exists (select 1 from shooter_players where lower(username) = lower(p_user) and password_hash = p_hash);
$$;

create or replace function public.ubx_poll_is_duke(p_user text, p_hash text) returns boolean
language sql stable security definer set search_path = public as $$
  select lower(coalesce(p_user, '')) = 'duke' and ubx_poll_login_ok(p_user, p_hash);
$$;

-- everyone: vote totals, open/closed, winner, (when signed in) your own vote and the Dominus you were given,
-- and the awards (winners only after the ceremony ended; duke always sees them)
create or replace function public.ubx_poll_state(p_user text, p_hash text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p ubx_poll; counts jsonb; total int; mine text; win text; top int; ntop int;
        signed boolean; duke boolean; c_ended boolean; c_ended_at timestamptz; vis boolean; awards jsonb; grants jsonb;
begin
  select * into p from ubx_poll where id = 'dominus';
  if p.id is null then return null; end if;
  select coalesce(jsonb_object_agg(c, (select count(*) from ubx_poll_votes v where v.poll = p.id and lower(v.choice) = lower(c))), '{}'::jsonb)
    into counts from unnest(p.choices) c;
  select count(*) into total from ubx_poll_votes where poll = p.id;
  signed := ubx_poll_login_ok(p_user, p_hash);
  duke := signed and lower(p_user) = 'duke';
  if signed then
    select choice into mine from ubx_poll_votes where poll = p.id and lower(voter) = lower(p_user);
  end if;
  win := p.winner;
  -- time ran out and nobody picked a winner by hand: the leader wins (a tie waits for admin)
  if win is null and (p.closed or (p.ends_at is not null and now() >= p.ends_at)) and total > 0 then
    select max(v::int) into top from jsonb_each_text(counts) e(k, v);
    select count(*) into ntop from jsonb_each_text(counts) e(k, v) where v::int = top;
    if ntop = 1 then select k into win from jsonb_each_text(counts) e(k, v) where v::int = top; end if;
  end if;

  select ended, ended_at into c_ended, c_ended_at from ubx_award_ceremony where id = 'main';
  c_ended := coalesce(c_ended, false);
  vis := c_ended or duke;
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', a.id, 'label', a.label,
           'prize', case when a.id = 'respectable' then coalesce(p.winner_pick, '') else a.prize end,
           'winner', case when not vis then null when a.id = 'respectable' then win else a.winner end,
           'game', case when vis then a.game_name end,
           'game_id', case when duke then a.game_id end) order by a.sort), '[]'::jsonb)
    into awards from ubx_awards a;
  if signed then
    select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'prize', g.prize, 'award', g.award, 'at', g.at) order by g.id), '[]'::jsonb)
      into grants from ubx_award_grants g where lower(g.username) = lower(p_user);
  end if;

  return jsonb_build_object('choices', to_jsonb(p.choices), 'counts', counts, 'total', total, 'mine', mine,
    'open', not p.closed and (p.ends_at is null or now() < p.ends_at), 'ends_at', p.ends_at,
    'winner', win, 'winner_pick', p.winner_pick, 'now', now(),
    'ceremony', jsonb_build_object('ended', c_ended, 'ended_at', c_ended_at),
    'awards', awards, 'grants', coalesce(grants, '[]'::jsonb));
end $$;

-- signed-in players: cast your one vote (it can't be changed, and it can't be for yourself)
create or replace function public.ubx_poll_vote(p_user text, p_hash text, p_choice text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p ubx_poll; c text;
begin
  if not ubx_poll_login_ok(p_user, p_hash) then raise exception 'log in to vote'; end if;
  select * into p from ubx_poll where id = 'dominus';
  if p.id is null or p.closed or (p.ends_at is not null and now() >= p.ends_at) then raise exception 'voting is closed'; end if;
  select x into c from unnest(p.choices) x where lower(x) = lower(trim(coalesce(p_choice, ''))) limit 1;
  if c is null then raise exception 'not a finalist'; end if;
  if lower(c) = lower(p_user) then raise exception 'you can''t vote for yourself'; end if;
  insert into ubx_poll_votes (poll, voter, choice) values (p.id, p_user, c) on conflict do nothing;
  if not found then raise exception 'you already voted'; end if;
  return ubx_poll_state(p_user, p_hash);
end $$;

-- the vote winner: save which Dominus they picked (once). If the ceremony already ended, it is handed out right away.
create or replace function public.ubx_poll_pick(p_user text, p_hash text, p_pick text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s jsonb; v_pick text := left(trim(coalesce(p_pick, '')), 80);
begin
  if not ubx_poll_login_ok(p_user, p_hash) then raise exception 'log in first'; end if;
  if v_pick = '' then raise exception 'pick a Dominus'; end if;
  s := ubx_poll_state(p_user, p_hash);
  if s->>'winner' is null or lower(s->>'winner') <> lower(p_user) then raise exception 'only the winner can pick'; end if;
  if coalesce(s->>'winner_pick', '') <> '' then raise exception 'you already picked'; end if;
  update ubx_poll set winner = coalesce(winner, s->>'winner'), winner_pick = v_pick where id = 'dominus';
  if exists (select 1 from ubx_award_ceremony where id = 'main' and ended) then
    insert into ubx_award_grants (username, prize, award, given_by) values (s->>'winner', v_pick, 'respectable', 'vote') on conflict do nothing;
  end if;
  return ubx_poll_state(p_user, p_hash);
end $$;

-- duke only (admin.html): close | reopen | set_end (p_value = ISO time, '' = no end) | set_winner (p_value = name, '' = clear) | reset_votes
create or replace function public.ubx_poll_admin(p_user text, p_hash text, p_action text, p_value text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not ubx_poll_is_duke(p_user, p_hash) then raise exception 'not admin'; end if;
  if p_action = 'close' then update ubx_poll set closed = true where id = 'dominus';
  elsif p_action = 'reopen' then update ubx_poll set closed = false, winner = null, winner_pick = null,
      ends_at = case when ends_at is not null and ends_at <= now() then null else ends_at end where id = 'dominus';
  elsif p_action = 'set_end' then update ubx_poll set ends_at = nullif(trim(coalesce(p_value, '')), '')::timestamptz where id = 'dominus';
  elsif p_action = 'set_winner' then update ubx_poll set winner = nullif(trim(coalesce(p_value, '')), ''), winner_pick = null, closed = true where id = 'dominus';
  elsif p_action = 'reset_votes' then delete from ubx_poll_votes where poll = 'dominus'; update ubx_poll set winner = null, winner_pick = null where id = 'dominus';
  else raise exception 'unknown action'; end if;
  return ubx_poll_state(p_user, p_hash);
end $$;

-- duke only (admin.html "Dominus awards" card):
--   get
--   set    p_award, p_winner (username) or p_game (an Unbloxed Studio game id: its creator wins), p_prize
--   end    ends the ceremony: every award winner gets their award's Dominus (the vote winner gets theirs once they pick)
--   reopen hides the winners again (Dominus already handed out stay)
--   give   p_winner, p_prize: hand any player a Dominus right away
create or replace function public.ubx_awards_admin(p_user text, p_hash text, p_action text,
  p_award text default '', p_winner text default '', p_prize text default '', p_game text default '') returns jsonb
language plpgsql security definer set search_path = public as $$
declare s jsonb; w text; gname text; gauthor text;
begin
  if not ubx_poll_is_duke(p_user, p_hash) then raise exception 'not admin'; end if;
  if p_action = 'set' then
    if not exists (select 1 from ubx_awards where id = p_award) then raise exception 'unknown award'; end if;
    if p_award = 'respectable' then raise exception 'Most Respectable comes from the vote: set its winner in the Dominus vote card'; end if;
    if coalesce(trim(p_game), '') <> '' then
      select g.name, g.author into gname, gauthor from ubx_games g where g.id::text = trim(p_game);
      if gauthor is null then raise exception 'no such game'; end if;
      select username into w from shooter_players where lower(username) = lower(gauthor);
      w := coalesce(w, gauthor);
    elsif coalesce(trim(p_winner), '') <> '' then
      select username into w from shooter_players where lower(username) = lower(trim(p_winner));
      if w is null then raise exception 'no such account: %', trim(p_winner); end if;
    end if;
    update ubx_awards set winner = w, prize = left(trim(coalesce(p_prize, '')), 80),
      game_id = case when gname is not null then trim(p_game) end, game_name = gname
      where id = p_award;
  elsif p_action = 'end' then
    update ubx_award_ceremony set ended = true, ended_at = now() where id = 'main';
    s := ubx_poll_state(p_user, p_hash);
    insert into ubx_award_grants (username, prize, award, given_by)
      select a->>'winner', a->>'prize', a->>'id', 'ceremony' from jsonb_array_elements(s->'awards') a
      where coalesce(a->>'winner', '') <> '' and coalesce(a->>'prize', '') <> ''
    on conflict do nothing;
  elsif p_action = 'reopen' then
    update ubx_award_ceremony set ended = false where id = 'main';
  elsif p_action = 'give' then
    select username into w from shooter_players where lower(username) = lower(trim(coalesce(p_winner, '')));
    if w is null then raise exception 'no such account: %', trim(coalesce(p_winner, '')); end if;
    if coalesce(trim(p_prize), '') = '' then raise exception 'pick a Dominus'; end if;
    insert into ubx_award_grants (username, prize, award, given_by) values (w, left(trim(p_prize), 80), 'manual', p_user);
  elsif p_action <> 'get' then
    raise exception 'unknown action';
  end if;
  return jsonb_build_object('state', ubx_poll_state(p_user, p_hash),
    'grants', (select coalesce(jsonb_agg(to_jsonb(x) order by x.id desc), '[]'::jsonb)
               from (select id, username, prize, award, at, given_by from ubx_award_grants order by id desc limit 40) x));
end $$;

revoke all on function public.ubx_poll_login_ok(text, text) from public, anon, authenticated;
revoke all on function public.ubx_poll_is_duke(text, text) from public, anon, authenticated;
grant execute on function public.ubx_poll_state(text, text), public.ubx_poll_vote(text, text, text),
  public.ubx_poll_pick(text, text, text), public.ubx_poll_admin(text, text, text, text),
  public.ubx_awards_admin(text, text, text, text, text, text, text) to anon, authenticated;
