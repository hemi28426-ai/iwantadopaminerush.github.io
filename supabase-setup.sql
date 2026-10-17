-- Paste into Supabase Dashboard > SQL Editor > Run
create table if not exists players (
  id bigint generated always as identity primary key,
  username text unique not null,
  password_hash text,
  display_name text,
  coins bigint default 1000,
  total_packs int default 0,
  total_cards int default 0,
  total_sold int default 0,
  battle_runs int default 0,
  won boolean default false,
  flagged boolean default false,
  join_date text,
  coins_gained_today bigint default 0,
  gain_date text
);
create table if not exists collection (
  id bigint generated always as identity primary key,
  player_id bigint references players(id) on delete cascade,
  card_id int, card_name text, rarity text,
  buy_price bigint, obtained_at text, uid text unique
);
create table if not exists trades (
  id bigint generated always as identity primary key,
  from_id bigint, to_id bigint, from_name text, to_name text,
  offered jsonb, requested jsonb, status text default 'pending'
);
create table if not exists transactions (
  id bigint generated always as identity primary key,
  player_id bigint references players(id) on delete cascade,
  type text, detail text, coins bigint, tx_date text
);
-- Game uses the public key directly, so allow access
alter table players disable row level security;
alter table collection disable row level security;
alter table trades disable row level security;
alter table transactions disable row level security;
