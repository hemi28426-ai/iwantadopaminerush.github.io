-- Duke Tokens: one currency for every game on the site. Run once in Supabase -> SQL Editor.
-- Uses the shared logins (public.shooter_players). Tokens are never bought or redeemed: the server
-- works them out from what each game already records, so they arrive automatically.
--   Unblockednite : 1 token per win            (unf_wins.wins)
--   Trench War    : 1 token per match win      (duke_wallet.tw_wins, via duke_tw_win)
--   Farming       : 1 token per $100,000 earned (fu_scores.earned)
--   Fishing       : 1 token per $10,000 earned  (fish_saves.data->>'earned')
-- A skin costs 10 tokens.

create table if not exists public.duke_wallet (
  username  text primary key,
  spent     int  not null default 0,
  skins     text[] not null default '{}',
  equipped  text not null default 'jonesy',
  tw_wins   int  not null default 0,
  tw_last   timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.duke_wallet enable row level security;

create or replace function public.duke_ok(p_user text, p_hash text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from shooter_players where username = p_user and password_hash = p_hash) then
    raise exception 'bad login' using errcode = '28000';
  end if;
  insert into duke_wallet (username) values (p_user) on conflict do nothing;
end $$;

-- earned per game; a game whose table isn't set up yet just counts 0
create or replace function public.duke_earned(p_user text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u int := 0; f int := 0; fi int := 0; t int := 0;
begin
  begin execute 'select coalesce(max(wins),0) from unf_wins where username = $1' into u using p_user; exception when others then u := 0; end;
  begin execute 'select coalesce(floor(max(earned)/100000),0) from fu_scores where username = $1' into f using p_user; exception when others then f := 0; end;
  begin execute $q$select coalesce(floor(ln(1 + max((data->>'earned')::numeric) * 0.1 / 50000) / ln(1.1)),0) from fish_saves where username = $1$q$ into fi using p_user; exception when others then fi := 0; end;
  select coalesce(tw_wins,0) into t from duke_wallet where username = p_user;
  return jsonb_build_object('unblockednite', u, 'farming', f, 'fishing', fi, 'trench', coalesce(t,0));
end $$;

create or replace function public.duke_get(p_user text, p_hash text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e jsonb; w duke_wallet%rowtype; tot int;
begin
  perform duke_ok(p_user, p_hash);
  e := duke_earned(p_user);
  tot := (e->>'unblockednite')::int + (e->>'farming')::int + (e->>'fishing')::int + (e->>'trench')::int;
  select * into w from duke_wallet where username = p_user;
  return jsonb_build_object('earned', tot, 'by', e, 'spent', w.spent, 'balance', tot - w.spent, 'skins', to_jsonb(w.skins), 'equipped', w.equipped);
end $$;

create or replace function public.duke_buy(p_user text, p_hash text, p_skin text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare j jsonb;
begin
  if p_skin not in ('banana','spidey','thanos','cap','ironman','strange','hulk','doom','venom','trooper','vader','kylo','obiwan','grievous') then
    raise exception 'unknown skin';
  end if;
  j := duke_get(p_user, p_hash);
  if j->'skins' ? p_skin then return j; end if;
  if (j->>'balance')::int < 10 then raise exception 'not enough Duke Tokens'; end if;
  update duke_wallet set spent = spent + 10, skins = array_append(skins, p_skin), equipped = p_skin, updated_at = now() where username = p_user;
  return duke_get(p_user, p_hash);
end $$;

create or replace function public.duke_equip(p_user text, p_hash text, p_skin text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform duke_ok(p_user, p_hash);
  update duke_wallet set equipped = p_skin, updated_at = now() where username = p_user and (p_skin = 'jonesy' or p_skin = any(skins));
  return duke_get(p_user, p_hash);
end $$;

-- Trench War match win (at most one every 90 seconds)
create or replace function public.duke_tw_win(p_user text, p_hash text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform duke_ok(p_user, p_hash);
  update duke_wallet set tw_wins = tw_wins + 1, tw_last = now()
   where username = p_user and (tw_last is null or tw_last < now() - interval '90 seconds');
  return duke_get(p_user, p_hash);
end $$;

-- anyone can see which skin a player wears (other players need it to draw them)
create or replace function public.duke_skin_of(p_user text) returns text
language sql security definer set search_path = public as $$
  select coalesce((select equipped from duke_wallet where username = p_user), 'jonesy');
$$;

revoke all on function public.duke_ok(text,text), public.duke_earned(text) from public;
grant execute on function public.duke_get(text,text), public.duke_buy(text,text,text), public.duke_equip(text,text,text),
  public.duke_tw_win(text,text), public.duke_skin_of(text) to anon, authenticated;
