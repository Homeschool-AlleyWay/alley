-- net_allowed only reads net_users, which signed-in users can already read: run it as the caller.
alter function public.net_allowed(text, text) security invoker;
revoke execute on function public.net_allowed(text, text) from anon, public;
grant execute on function public.net_allowed(text, text) to authenticated;
-- Supabase event-trigger helper: nothing in the app calls it.
revoke execute on function public.rls_auto_enable() from anon, authenticated, public;
-- get_share stays definer on purpose: a share code is the only key, and it is read by anonymous visitors.
