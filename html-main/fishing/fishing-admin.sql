-- Fishing Unblocked admin: set a player's money in their cloud save (duke only).
-- Run once in Supabase -> SQL Editor (after fishing-setup.sql).
create or replace function public.fish_admin_set_money(p_user text, p_hash text, p_target text, p_money numeric)
returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not (lower(p_user) = 'duke' and exists (select 1 from shooter_players where username = p_user and password_hash = p_hash)) then
    raise exception 'not admin' using errcode = '28000';
  end if;
  if p_money < 0 then raise exception 'money must be 0 or more'; end if;
  -- also bump the save's own timestamp so the game treats this cloud copy as the newest
  update fish_saves
     set data = jsonb_set(jsonb_set(data, '{money}', to_jsonb(floor(p_money))), '{savedAt}', to_jsonb((extract(epoch from now()) * 1000)::bigint + 60000)),
         saved_at = now()
   where lower(username) = lower(p_target);
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.fish_admin_set_money(text, text, text, numeric) from public;
grant execute on function public.fish_admin_set_money(text, text, text, numeric) to anon, authenticated;
