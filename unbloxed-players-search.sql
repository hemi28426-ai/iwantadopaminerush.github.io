-- Unbloxed People search: usernames only (never password hashes). Empty search = 18 random players; otherwise up to 30 matches.
-- Run once in Supabase -> SQL Editor.
create or replace function public.ubx_find_players(p_q text) returns table(username text)
language plpgsql stable security definer set search_path = public as $$
declare q text := trim(coalesce(p_q, ''));
begin
  if q = '' then
    return query select s.username from shooter_players s order by random() limit 18;
  else
    return query select s.username from shooter_players s
      where s.username ilike '%' || replace(replace(replace(left(q, 40), '\', '\\'), '%', '\%'), '_', '\_') || '%'
      order by length(s.username), s.username limit 30;
  end if;
end $$;
grant execute on function public.ubx_find_players(text) to anon, authenticated;
