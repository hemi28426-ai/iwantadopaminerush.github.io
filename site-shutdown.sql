-- Dopamine Rush: site-wide shut-down switch.
-- Run once in Supabase Dashboard > SQL Editor (after admin-setup.sql, which defines dr_is_admin).
--
-- To shut the site down, either
--   * use the "Website" card at the top of admin.html (Shut down / Open), or
--   * Supabase Table Editor > site_status > set closed = true (and optionally a message / until), or
--   * SQL:  update site_status set closed = true, message = 'Back after school!' where id = 1;
-- Open it again with closed = false. If "until" is set, the site opens by itself at that time.
-- Every page checks this when it opens and about once a minute; open pages jump to closed.html.
-- The duke account can still use the site while it is closed.

create table if not exists site_status (
  id int primary key default 1 check (id = 1),
  closed boolean not null default false,
  message text not null default '',
  until timestamptz,
  updated_at timestamptz not null default now()
);
insert into site_status (id) values (1) on conflict (id) do nothing;
alter table site_status enable row level security;  -- no policies: the public key can't read or change it directly

-- what every page asks: {closed, message, until}; the admin (duke + password hash) always gets closed = false
create or replace function dr_site_status(p_user text default '', p_hash text default '') returns jsonb
language plpgsql security definer set search_path = public stable as $$
declare r site_status;
begin
  select * into r from site_status where id = 1;
  if not found then return jsonb_build_object('closed', false); end if;
  if r.closed and r.until is not null and r.until <= now() then
    return jsonb_build_object('closed', false);
  end if;
  if r.closed and coalesce(p_user, '') <> '' and dr_is_admin(p_user, p_hash) then
    return jsonb_build_object('closed', false, 'admin_bypass', true, 'message', r.message, 'until', r.until);
  end if;
  return jsonb_build_object('closed', r.closed, 'message', r.message, 'until', r.until);
end $$;

-- admin.html's Shut down / Open buttons
create or replace function dr_set_site_status(p_user text, p_hash text, p_closed boolean,
  p_message text default '', p_until timestamptz default null) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not dr_is_admin(p_user, p_hash) then raise exception 'not admin'; end if;
  update site_status set closed = p_closed, message = left(coalesce(p_message, ''), 300),
    until = p_until, updated_at = now() where id = 1;
  return (select to_jsonb(s) from site_status s where id = 1);
end $$;

grant execute on function dr_site_status(text, text) to anon, authenticated;
grant execute on function dr_set_site_status(text, text, boolean, text, timestamptz) to anon, authenticated;
