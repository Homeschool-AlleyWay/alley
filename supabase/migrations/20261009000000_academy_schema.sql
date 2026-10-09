-- UNIFY Academy: Supabase schema (already applied to project gfulnzpotabrsffinfpe, "unify-academy").
-- Parents are real (non-anonymous) auth users; kids are rows under the parent (no kid logins, no kid emails).
create or replace function public.is_parent() returns boolean language sql stable set search_path = public, auth as $$
  select auth.uid() is not null and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false $$;

create table public.families (uid uuid primary key references auth.users(id) on delete cascade, profile jsonb, updated_at timestamptz not null default now());
create table public.kids (family uuid not null references public.families(uid) on delete cascade, id text not null, name text not null check (char_length(name) <= 40), age text not null, salt text not null, hash text not null, created bigint not null, color text, icon text, primary key (family, id));
create table public.kid_data (family uuid not null, kid text not null, key text not null, json text not null check (char_length(json) <= 900000), at bigint not null, primary key (family, kid, key), foreign key (family, kid) references public.kids(family, id) on delete cascade);
alter table public.families enable row level security; alter table public.kids enable row level security; alter table public.kid_data enable row level security;
create policy fam_all on public.families for all to authenticated using (uid = auth.uid() and is_parent()) with check (uid = auth.uid() and is_parent());
create policy kids_all on public.kids for all to authenticated using (family = auth.uid() and is_parent()) with check (family = auth.uid() and is_parent());
create policy kd_all on public.kid_data for all to authenticated using (family = auth.uid() and is_parent()) with check (family = auth.uid() and is_parent());

create table public.net_users (id text primary key, owner uuid not null references auth.users(id) on delete cascade, handle text not null unique check (handle ~ '^[a-z0-9_.]{3,20}$'), name text not null check (char_length(name) between 1 and 24), role text not null check (role in ('adult','kid')), band text not null check (band in ('adult','k2','g35','g68','hs')), open boolean not null default false, at bigint not null);
create table public.net_threads (tid text primary key, a text not null references public.net_users(id) on delete cascade, b text not null references public.net_users(id) on delete cascade, owners uuid[] not null, at bigint not null);
create table public.net_msgs (id uuid primary key default gen_random_uuid(), tid text not null references public.net_threads(tid) on delete cascade, from_id text not null references public.net_users(id) on delete cascade, text text not null check (char_length(text) between 1 and 500), at bigint not null);
create index net_msgs_tid_at on public.net_msgs(tid, at);
create table public.net_presence (id text primary key references public.net_users(id) on delete cascade, owner uuid not null references auth.users(id) on delete cascade, doc jsonb not null, viewers uuid[] not null default '{}', at bigint not null);
create index net_presence_viewers on public.net_presence using gin (viewers);

create or replace function public.fam_of(id text) returns text language sql immutable set search_path = public as $$ select split_part(id, '_', 1) $$;
-- the single rule for who may talk (mirrors canChat() in phone-net.js): same family; two grown-ups; two kids in the same grade band who are both open. Never a grown-up and another family's child.
create or replace function public.net_allowed(x text, y text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from net_users a, net_users b where a.id = x and b.id = y and a.id <> b.id and (
    fam_of(a.id) = fam_of(b.id) or (a.role = 'adult' and b.role = 'adult') or (a.role = 'kid' and b.role = 'kid' and a.band = b.band and a.open and b.open))) $$;
create or replace function public.owns_net_id(x text) returns boolean language sql stable set search_path = public, auth as $$
  select auth.uid() is not null and (x = auth.uid()::text or x like auth.uid()::text || '\_%') $$;
alter table public.net_users enable row level security; alter table public.net_threads enable row level security; alter table public.net_msgs enable row level security; alter table public.net_presence enable row level security;
create policy nu_read on public.net_users for select to authenticated using (true);
create policy nu_insert on public.net_users for insert to authenticated with check (owner = auth.uid() and owns_net_id(id) and ((role = 'adult' and id = auth.uid()::text and band = 'adult') or (role = 'kid' and is_parent() and id <> auth.uid()::text and band in ('k2','g35','g68','hs'))));
create policy nu_update on public.net_users for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid() and owns_net_id(id) and ((role = 'adult' and id = auth.uid()::text and band = 'adult') or (role = 'kid' and is_parent() and id <> auth.uid()::text and band in ('k2','g35','g68','hs'))));
create policy nu_delete on public.net_users for delete to authenticated using (owner = auth.uid());
create policy nt_read on public.net_threads for select to authenticated using (auth.uid() = any(owners));
create policy nt_insert on public.net_threads for insert to authenticated with check (auth.uid() = any(owners) and tid = a || '|' || b and (owns_net_id(a) or owns_net_id(b)) and net_allowed(a, b));
create policy nt_update on public.net_threads for update to authenticated using (auth.uid() = any(owners)) with check (auth.uid() = any(owners));
create policy nm_read on public.net_msgs for select to authenticated using (exists (select 1 from net_threads t where t.tid = net_msgs.tid and auth.uid() = any(t.owners)));
create policy nm_insert on public.net_msgs for insert to authenticated with check (owns_net_id(from_id) and exists (select 1 from net_threads t where t.tid = net_msgs.tid and auth.uid() = any(t.owners) and from_id in (t.a, t.b) and net_allowed(t.a, t.b)));
create policy np_read on public.net_presence for select to authenticated using (owner = auth.uid() or auth.uid() = any(viewers));
create policy np_insert on public.net_presence for insert to authenticated with check (owner = auth.uid() and owns_net_id(id) and cardinality(viewers) <= 40);
create policy np_update on public.net_presence for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid() and owns_net_id(id) and cardinality(viewers) <= 40);
create policy np_delete on public.net_presence for delete to authenticated using (owner = auth.uid());
alter publication supabase_realtime add table public.net_msgs, public.net_presence, public.net_threads;

create table public.phone_state (uid uuid primary key references auth.users(id) on delete cascade, data text not null check (char_length(data) <= 900000), updated_ms bigint not null);
alter table public.phone_state enable row level security;
create policy ps_all on public.phone_state for all to authenticated using (uid = auth.uid()) with check (uid = auth.uid());
create table public.phone_shares (code text primary key check (code ~ '^[A-Z0-9]{10}$'), uid uuid not null references auth.users(id) on delete cascade, expires_ms bigint not null, updated_ms bigint not null, data text not null check (char_length(data) <= 100000));
alter table public.phone_shares enable row level security;
create policy sh_owner on public.phone_shares for all to authenticated using (uid = auth.uid()) with check (uid = auth.uid());
create or replace function public.get_share(p_code text) returns table (data text, updated_ms bigint) language sql stable security definer set search_path = public as $$
  select s.data, s.updated_ms from phone_shares s where s.code = p_code and s.expires_ms > (extract(epoch from now()) * 1000)::bigint $$;
revoke all on function public.get_share(text) from public; grant execute on function public.get_share(text) to anon, authenticated;
