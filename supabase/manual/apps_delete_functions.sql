-- Run once in the Supabase SQL editor (the migration tool used for the live apply stalls on statements containing DELETE).
-- These are the same two functions as in migrations/20261013000000_apps_mail_kid_login.sql, plus their grants.
create or replace function public.app_revoke(p_app text, p_uid uuid) returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if not is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  delete from app_access where app = p_app and uid = p_uid;
end $$;

create or replace function public.kid_login_remove(p_kid text) returns void
language plpgsql security definer set search_path = public, auth as $$
declare u uuid;
begin
  if not is_parent() then raise exception 'Parents only.' using errcode = '42501'; end if;
  select l.auth_uid into u from kid_logins l where l.family = auth.uid() and l.kid = p_kid;
  if u is null then return; end if;
  delete from auth.users where id = u;
  update kids set login_email = null where family = auth.uid() and id = p_kid;
end $$;

revoke all on function public.app_revoke(text,uuid) from public, anon;
revoke all on function public.kid_login_remove(text) from public, anon;
grant execute on function public.app_revoke(text,uuid) to authenticated;
grant execute on function public.kid_login_remove(text) to authenticated;
