-- UNIFY Academy: apps (Newsroom desk + bulletin board + auditorium events), academy-only mail, and kid sign-in.
-- Needs 20261012000000_school_wide_presence.sql first.
--
-- Rules (agreed with the owner):
--   * Admins (academy_admins) and anyone an admin grants an app to (app_access) can work inside that app. Everyone can read what is published.
--   * A child can have their OWN sign-in for when a parent is not with them. A parent creates it; the child gets an academy-only address (name.xxxx@unify.mail)
--     that is both their sign-in name and their mailbox. Nothing is ever delivered outside the academy.
--   * A child who signs in alone acts as their own student only: they see and change their own data, never the family's other data.
--   * Parents can always see their children's chats and mail (oversight). Archiving is not a feature: nothing is archived.

create extension if not exists pgcrypto with schema extensions;

-- ===== kid logins =====
alter table public.kids add column if not exists grade smallint check (grade between 0 and 12);
alter table public.kids add column if not exists login_email text;
create unique index if not exists kids_login_email_uq on public.kids (login_email) where login_email is not null;

create table public.kid_logins (
  auth_uid uuid primary key references auth.users(id) on delete cascade,
  family uuid not null,
  kid text not null,
  created_at timestamptz not null default now(),
  unique (family, kid),
  foreign key (family, kid) references public.kids(family, id) on delete cascade
);
alter table public.kid_logins enable row level security;
-- the child reads their own row, the parent reads their children's rows. Rows are written only by the functions below.
create policy kl_read on public.kid_logins for select to authenticated using (auth_uid = auth.uid() or family = auth.uid());

create or replace function public.is_kid_login() returns boolean language sql stable set search_path = public, auth as $$
  select exists (select 1 from kid_logins l where l.auth_uid = auth.uid()) $$;
create or replace function public.acting_family() returns uuid language sql stable set search_path = public, auth as $$
  select coalesce((select l.family from kid_logins l where l.auth_uid = auth.uid()), auth.uid()) $$;
create or replace function public.acting_kid() returns text language sql stable set search_path = public, auth as $$
  select l.kid from kid_logins l where l.auth_uid = auth.uid() $$;
create or replace function public.acting_net_id() returns text language sql stable set search_path = public, auth as $$
  select l.family::text || '_' || l.kid from kid_logins l where l.auth_uid = auth.uid() $$;

-- a grown-up account: signed in for real, not a child's own sign-in, and not a stray academy address
create or replace function public.is_parent() returns boolean language sql stable set search_path = public, auth as $$
  select auth.uid() is not null and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    and coalesce(auth.jwt() ->> 'email', '') not like '%@unify.mail' $$;
-- a parent or a child who signed in alone
create or replace function public.is_member() returns boolean language sql stable set search_path = public, auth as $$
  select is_parent() or is_kid_login() $$;

-- a child may only ever touch their own student id; a parent may touch their own id and their children's
create or replace function public.owns_net_id(x text) returns boolean language sql stable set search_path = public, auth as $$
  select auth.uid() is not null and case
    when is_kid_login() then x = acting_net_id()
    else (x = auth.uid()::text or x like auth.uid()::text || '\_%') end $$;

-- only the functions below may create an academy address: public sign-ups with one are refused
create or replace function public.block_academy_signup() returns trigger language plpgsql security definer set search_path = public, auth as $$
begin
  if new.email is not null and lower(new.email) like '%@unify.mail' and coalesce(current_setting('academy.kid_login', true), '') <> '1' then
    raise exception 'Academy addresses are created by a parent from the family screen.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger block_academy_signup before insert on auth.users for each row execute function public.block_academy_signup();

-- ===== admins and app access =====
create table public.academy_admins (uid uuid primary key references auth.users(id) on delete cascade, note text not null default '', added_at timestamptz not null default now());
alter table public.academy_admins enable row level security;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public, auth as $$
  select exists (select 1 from academy_admins a where a.uid = auth.uid()) $$;
create policy adm_read on public.academy_admins for select to authenticated using (uid = auth.uid() or is_admin());

create table public.app_access (
  app text not null check (app ~ '^[a-z0-9-]{2,30}$'),
  uid uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('editor','admin')),
  label text not null default '' check (char_length(label) <= 60),
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (app, uid)
);
alter table public.app_access enable row level security;
create policy aa_read on public.app_access for select to authenticated using (uid = auth.uid() or is_admin());
create or replace function public.can_edit(p_app text) returns boolean language sql stable security definer set search_path = public, auth as $$
  select is_admin() or exists (select 1 from app_access a where a.app = p_app and a.uid = auth.uid()) $$;

-- admins find a person by handle and give or take away an app. A child without a sign-in cannot be given an app yet (has_login = false).
create or replace function public.app_member_lookup(p_handle text) returns table (uid uuid, net_id text, name text, role text, has_login boolean)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  return query
    select case when u.role = 'adult' then u.owner else l.auth_uid end, u.id, u.name, u.role, (u.role = 'adult' or l.auth_uid is not null)
    from net_users u left join kid_logins l on u.role = 'kid' and l.family::text = split_part(u.id, '_', 1) and l.kid = substr(u.id, position('_' in u.id) + 1)
    where u.handle = lower(trim(p_handle));
end $$;
create or replace function public.app_grant(p_app text, p_uid uuid, p_role text, p_label text) returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if not is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  if p_app !~ '^[a-z0-9-]{2,30}$' or p_role not in ('editor','admin') then raise exception 'bad app or role'; end if;
  insert into app_access(app, uid, role, label, granted_by) values (p_app, p_uid, p_role, left(coalesce(p_label, ''), 60), auth.uid())
    on conflict (app, uid) do update set role = excluded.role, label = excluded.label, granted_by = auth.uid(), granted_at = now();
end $$;
create or replace function public.app_revoke(p_app text, p_uid uuid) returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if not is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  delete from app_access where app = p_app and uid = p_uid;
end $$;

-- ===== Newsroom app: bulletin board, announcements, stories, alerts, and auditorium events =====
create table public.news_posts (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'bulletin' check (kind in ('bulletin','announcement','story','alert')),
  title text not null check (char_length(title) between 1 and 120),
  body text not null default '' check (char_length(body) <= 4000),
  theme text not null default 'sun' check (char_length(theme) <= 24),
  icon text not null default '📌' check (char_length(icon) <= 8),
  accent text check (accent ~ '^#[0-9a-fA-F]{6}$'),
  pinned boolean not null default false,
  board text not null default 'main' check (char_length(board) <= 24),
  grade_min smallint not null default 0 check (grade_min between 0 and 12),
  grade_max smallint not null default 12 check (grade_max between 0 and 12),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  status text not null default 'published' check (status in ('draft','published')),
  author uuid default auth.uid() references auth.users(id) on delete set null,
  author_name text not null default '' check (char_length(author_name) <= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (grade_max >= grade_min)
);
create index news_posts_board on public.news_posts (board, status, starts_at desc);

create table public.academy_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 4000),
  room text not null default 'auditorium' check (room in ('auditorium','classroom','hallway','newsroom','field-trip','open-door')),
  subject text not null default '' check (char_length(subject) <= 30),
  host text not null default '' check (char_length(host) <= 60),
  starts_at timestamptz not null,
  ends_at timestamptz,
  live boolean not null default false,
  theme text not null default 'sky' check (char_length(theme) <= 24),
  icon text not null default '🎤' check (char_length(icon) <= 8),
  accent text check (accent ~ '^#[0-9a-fA-F]{6}$'),
  grade_min smallint not null default 0 check (grade_min between 0 and 12),
  grade_max smallint not null default 12 check (grade_max between 0 and 12),
  status text not null default 'published' check (status in ('draft','published')),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (grade_max >= grade_min)
);
create index academy_events_start on public.academy_events (status, starts_at);

-- every look-and-feel setting for the apps (colours, layout, banner text...) so it is customisable without a code change
create table public.app_settings (
  key text primary key check (key ~ '^[a-z0-9._-]{1,60}$'),
  value jsonb not null default '{}'::jsonb check (pg_column_size(value) < 20000),
  updated_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated() returns trigger language plpgsql set search_path = public as $$ begin new.updated_at := now(); return new; end $$;
create trigger news_posts_touch before update on public.news_posts for each row execute function public.touch_updated();
create trigger academy_events_touch before update on public.academy_events for each row execute function public.touch_updated();
create trigger app_settings_touch before update on public.app_settings for each row execute function public.touch_updated();

alter table public.news_posts enable row level security;
alter table public.academy_events enable row level security;
alter table public.app_settings enable row level security;
-- everyone (even before signing in) can read what is published; the people who run the app also see drafts
create policy np_pub on public.news_posts for select to anon, authenticated using (status = 'published' or can_edit('newsroom'));
create policy np_edit on public.news_posts for insert to authenticated with check (can_edit('newsroom') and (author is null or author = auth.uid()));
create policy np_upd on public.news_posts for update to authenticated using (can_edit('newsroom')) with check (can_edit('newsroom'));
create policy np_del on public.news_posts for delete to authenticated using (can_edit('newsroom'));
create policy ev_pub on public.academy_events for select to anon, authenticated using (status = 'published' or can_edit('newsroom'));
create policy ev_edit on public.academy_events for insert to authenticated with check (can_edit('newsroom') and (created_by is null or created_by = auth.uid()));
create policy ev_upd on public.academy_events for update to authenticated using (can_edit('newsroom')) with check (can_edit('newsroom'));
create policy ev_del on public.academy_events for delete to authenticated using (can_edit('newsroom'));
create policy st_read on public.app_settings for select to anon, authenticated using (true);
create policy st_ins on public.app_settings for insert to authenticated with check (is_admin() or (can_edit('newsroom') and key ~ '^(newsroom|bulletin|live|events)\.'));
create policy st_upd on public.app_settings for update to authenticated using (is_admin() or (can_edit('newsroom') and key ~ '^(newsroom|bulletin|live|events)\.'))
  with check (is_admin() or (can_edit('newsroom') and key ~ '^(newsroom|bulletin|live|events)\.'));
create policy st_del on public.app_settings for delete to authenticated using (is_admin());

-- ===== Mail: academy-only addresses (never delivered outside UNIFY) =====
create table public.mail_addresses (
  addr text primary key check (addr ~ '^[a-z0-9][a-z0-9._-]{1,38}[a-z0-9]@unify\.mail$'),
  owner uuid not null references auth.users(id) on delete cascade,
  guardian uuid references auth.users(id) on delete set null,
  net_id text unique,
  display text not null check (char_length(display) between 1 and 40),
  kind text not null check (kind in ('adult','kid','staff','system')),
  created_at timestamptz not null default now()
);
create table public.mail_messages (
  id uuid primary key default gen_random_uuid(),
  from_addr text not null,
  to_addrs text[] not null check (cardinality(to_addrs) between 1 and 20),
  subject text not null default '' check (char_length(subject) <= 150),
  body text not null default '' check (char_length(body) <= 8000),
  reply_to uuid,
  sent_at timestamptz not null default now()
);
create table public.mail_state (
  msg uuid not null references public.mail_messages(id) on delete cascade,
  addr text not null references public.mail_addresses(addr) on delete cascade,
  folder text not null default 'inbox' check (folder in ('inbox','sent','trash')),
  read boolean not null default false,
  starred boolean not null default false,
  primary key (msg, addr)
);
create index mail_state_addr on public.mail_state (addr, folder);
alter table public.mail_addresses enable row level security;
alter table public.mail_messages enable row level security;
alter table public.mail_state enable row level security;

-- any signed-in member can look an address up in the directory (so people can find each other); row-level security hides rows, not columns, but the ids in owner/guardian are already visible through net_users
create policy ma_read on public.mail_addresses for select to authenticated using (is_member());
create policy mm_read on public.mail_messages for select to authenticated using (exists (
  select 1 from mail_addresses a where (a.owner = auth.uid() or a.guardian = auth.uid()) and (a.addr = mail_messages.from_addr or a.addr = any (mail_messages.to_addrs))));
create policy ms_read on public.mail_state for select to authenticated using (exists (
  select 1 from mail_addresses a where a.addr = mail_state.addr and (a.owner = auth.uid() or a.guardian = auth.uid())));
create policy ms_upd on public.mail_state for update to authenticated using (exists (
  select 1 from mail_addresses a where a.addr = mail_state.addr and a.owner = auth.uid()))
  with check (exists (select 1 from mail_addresses a where a.addr = mail_state.addr and a.owner = auth.uid()));
-- no insert or delete policies on messages or state: sending and moving to trash go through the functions below

-- who may write to whom: same family; any two grown-ups; staff and system addresses with anyone; two students only when chat would be allowed
create or replace function public.mail_may_send(p_from text, p_to text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from mail_addresses f, mail_addresses t where f.addr = p_from and t.addr = p_to and f.addr <> t.addr and (
    f.kind = 'system'
    or (t.kind <> 'system' and (f.kind = 'staff' or t.kind = 'staff'))
    or (f.net_id is not null and t.net_id is not null and fam_of(f.net_id) = fam_of(t.net_id))
    or (f.kind = 'adult' and t.kind = 'adult')
    or (f.kind = 'kid' and t.kind = 'kid' and net_allowed(f.net_id, t.net_id)))) $$;

create or replace function public.mail_send(p_from text, p_to text[], p_subject text, p_body text, p_reply_to uuid default null) returns uuid
language plpgsql security definer set search_path = public, auth as $$
declare a mail_addresses; t text; mid uuid; tos text[];
begin
  select * into a from mail_addresses m where m.addr = lower(p_from) and m.owner = auth.uid();
  if not found then raise exception 'That is not your address.' using errcode = '42501'; end if;
  select coalesce(array_agg(distinct lower(x)), '{}') into tos from unnest(coalesce(p_to, '{}')) x;
  if cardinality(tos) not between 1 and 20 then raise exception 'Choose between 1 and 20 people.'; end if;
  foreach t in array tos loop
    if not mail_may_send(a.addr, t) then raise exception 'You cannot write to %.', t using errcode = '42501'; end if;
  end loop;
  if a.kind = 'kid' then
    if (coalesce(p_subject, '') || ' ' || coalesce(p_body, '')) ~* '\m(fuck\w*|shit\w*|bitch\w*|cunt|dick|nigg\w*|fag\w*|porn\w*|sex\w*|rape|nazi)\M' then
      raise exception 'Let''s keep it kind and school-friendly.'; end if;
    if (coalesce(p_subject, '') || ' ' || coalesce(p_body, '')) ~* '(https?://|www\.|[a-z0-9._+-]+@(?![a-z0-9.-]*unify\.mail)[a-z0-9-]+\.[a-z]{2,}|(\+?[0-9][ ().-]?){9,})' then
      raise exception 'For safety, links, outside emails and phone numbers can''t be sent.'; end if;
  end if;
  insert into mail_messages(from_addr, to_addrs, subject, body, reply_to) values (a.addr, tos, left(coalesce(p_subject, ''), 150), left(coalesce(p_body, ''), 8000), p_reply_to) returning id into mid;
  insert into mail_state(msg, addr, folder, read) values (mid, a.addr, 'sent', true);
  foreach t in array tos loop
    insert into mail_state(msg, addr, folder, read) values (mid, t, 'inbox', false) on conflict (msg, addr) do nothing;
  end loop;
  return mid;
end $$;

-- a grown-up claims their own academy address (letters, numbers, dots, dashes)
create or replace function public.mail_claim(p_local text, p_display text) returns text language plpgsql security definer set search_path = public, auth as $$
declare l text := lower(trim(p_local)); ad text;
begin
  if not is_parent() then raise exception 'Grown-up accounts only.' using errcode = '42501'; end if;
  if l !~ '^[a-z0-9][a-z0-9._-]{1,38}[a-z0-9]$' then raise exception 'Use 3 to 40 letters, numbers, dots or dashes.'; end if;
  if exists (select 1 from mail_addresses where net_id = auth.uid()::text) then raise exception 'You already have an academy address.'; end if;
  ad := l || '@unify.mail';
  insert into mail_addresses(addr, owner, net_id, display, kind) values (ad, auth.uid(), auth.uid()::text, left(coalesce(nullif(trim(p_display), ''), l), 40), 'adult');
  return ad;
exception when unique_violation then raise exception 'That address is taken. Try another.';
end $$;

-- admins create staff (teachers, hosts) and system (no-reply announcement) addresses
create or replace function public.mail_admin_address(p_local text, p_display text, p_kind text, p_owner uuid default null) returns text
language plpgsql security definer set search_path = public, auth as $$
declare l text := lower(trim(p_local)); ad text;
begin
  if not is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  if p_kind not in ('staff','system') then raise exception 'staff or system'; end if;
  if l !~ '^[a-z0-9][a-z0-9._-]{1,38}[a-z0-9]$' then raise exception 'Use 3 to 40 letters, numbers, dots or dashes.'; end if;
  ad := l || '@unify.mail';
  insert into mail_addresses(addr, owner, display, kind) values (ad, coalesce(p_owner, auth.uid()), left(coalesce(nullif(trim(p_display), ''), l), 40), p_kind);
  return ad;
exception when unique_violation then raise exception 'That address is taken.';
end $$;

-- move to the trash, back to the inbox, mark read or starred (only the owner's own copy)
create or replace function public.mail_move(p_msg uuid, p_addr text, p_folder text) returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if p_folder not in ('inbox','trash') then raise exception 'inbox or trash'; end if;
  update mail_state s set folder = p_folder where s.msg = p_msg and s.addr = lower(p_addr) and s.folder <> 'sent'
    and exists (select 1 from mail_addresses a where a.addr = s.addr and a.owner = auth.uid());
end $$;

-- ===== kid sign-in =====
-- A parent gives a child their own sign-in. The auth user is created here (not through public sign-up) so no confirmation email is ever sent to an academy address.
create or replace function public.kid_login_create(p_kid text, p_local text, p_password text) returns text
language plpgsql security definer set search_path = public, auth, extensions as $$
declare k kids; l text := lower(regexp_replace(coalesce(p_local, ''), '[^a-zA-Z0-9]', '', 'g')); ad text; uid uuid := gen_random_uuid(); tries int := 0;
begin
  if not is_parent() then raise exception 'Parents only.' using errcode = '42501'; end if;
  select * into k from kids where family = auth.uid() and id = p_kid;
  if not found then raise exception 'That child is not in your family.' using errcode = '42501'; end if;
  if k.login_email is not null then raise exception 'This child already has a sign-in.'; end if;
  if length(coalesce(p_password, '')) < 8 or length(p_password) > 72 then raise exception 'The password needs 8 to 72 characters.'; end if;
  if length(l) < 2 then l := lower(regexp_replace(k.name, '[^a-zA-Z0-9]', '', 'g')); end if;
  if length(l) < 2 then l := 'student'; end if;
  l := left(l, 20);
  loop
    ad := l || '.' || substr(md5(random()::text || clock_timestamp()::text), 1, 4) || '@unify.mail';
    exit when not exists (select 1 from mail_addresses where addr = ad) and not exists (select 1 from auth.users where lower(email) = ad);
    tries := tries + 1; if tries > 20 then raise exception 'Could not make an address. Try again.'; end if;
  end loop;
  perform set_config('academy.kid_login', '1', true);
  insert into auth.users(instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                         confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', ad, extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('kid_login', true), now(), now(), '', '', '', '');
  insert into auth.identities(id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), uid, jsonb_build_object('sub', uid::text, 'email', ad, 'email_verified', true), 'email', uid::text, now(), now(), now());
  perform set_config('academy.kid_login', '0', true);
  insert into kid_logins(auth_uid, family, kid) values (uid, auth.uid(), p_kid);
  update kids set login_email = ad where family = auth.uid() and id = p_kid;
  insert into mail_addresses(addr, owner, guardian, net_id, display, kind) values (ad, uid, auth.uid(), auth.uid()::text || '_' || p_kid, left(k.name, 40), 'kid');
  return ad;
end $$;

create or replace function public.kid_login_password(p_kid text, p_password text) returns void
language plpgsql security definer set search_path = public, auth, extensions as $$
begin
  if not is_parent() then raise exception 'Parents only.' using errcode = '42501'; end if;
  if length(coalesce(p_password, '')) < 8 or length(p_password) > 72 then raise exception 'The password needs 8 to 72 characters.'; end if;
  update auth.users u set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now()
    where u.id = (select l.auth_uid from kid_logins l where l.family = auth.uid() and l.kid = p_kid);
  if not found then raise exception 'That child has no sign-in.'; end if;
end $$;

create or replace function public.kid_login_remove(p_kid text) returns void
language plpgsql security definer set search_path = public, auth as $$
declare u uuid;
begin
  if not is_parent() then raise exception 'Parents only.' using errcode = '42501'; end if;
  select l.auth_uid into u from kid_logins l where l.family = auth.uid() and l.kid = p_kid;
  if u is null then return; end if;
  delete from auth.users where id = u;          -- cascades the login, the address and its mail state
  update kids set login_email = null where family = auth.uid() and id = p_kid;
end $$;

-- the signed-in child asks "who am I?" so the app can load the right student
create or replace function public.my_kid_login() returns table (family uuid, kid text, name text, age text, grade smallint, color text, icon text, email text)
language sql stable security definer set search_path = public, auth as $$
  select k.family, k.id, k.name, k.age, k.grade, k.color, k.icon, k.login_email from kid_logins l join kids k on k.family = l.family and k.id = l.kid where l.auth_uid = auth.uid() $$;

-- ===== a child who signs in alone: only their own student =====
create policy kids_kid_read on public.kids for select to authenticated using (is_kid_login() and family = acting_family() and id = acting_kid());
create policy kd_kid on public.kid_data for all to authenticated
  using (is_kid_login() and family = acting_family() and kid = acting_kid()) with check (is_kid_login() and family = acting_family() and kid = acting_kid());
create policy sc_kid on public.showcases for all to authenticated
  using (is_kid_login() and family = acting_family() and kid = acting_kid()) with check (is_kid_login() and family = acting_family() and kid = acting_kid());
alter policy sc_read on public.showcases
  using (is_member() and (visible or family = acting_family()));

-- the people network acts for the FAMILY (so parents keep seeing their children's chats), narrowed to one student for a child's own sign-in
alter policy nu_insert on public.net_users
  with check (
  owner = acting_family() and owns_net_id(id) and (
    (role = 'adult' and id = auth.uid()::text and band = 'adult' and is_parent())
    or (role = 'kid' and is_member() and id <> auth.uid()::text and band in ('k2','g35','g68','hs'))));
alter policy nu_update on public.net_users
  using (owner = acting_family() and owns_net_id(id)) with check (
  owner = acting_family() and owns_net_id(id) and (
    (role = 'adult' and id = auth.uid()::text and band = 'adult' and is_parent())
    or (role = 'kid' and is_member() and id <> auth.uid()::text and band in ('k2','g35','g68','hs'))));
alter policy nu_delete on public.net_users
  using (owner = acting_family() and owns_net_id(id));

-- a child's own sign-in can never change who they may talk to or whether they are seen: only a parent decides that
create or replace function public.net_users_kid_guard() returns trigger language plpgsql set search_path = public, auth as $$
begin
  if is_kid_login() then
    if tg_op = 'INSERT' then new.open := false; new.visible := true;
    else new.open := old.open; new.visible := old.visible; new.grade := old.grade; new.band := old.band; end if;
  end if;
  return new;
end $$;
create trigger net_users_kid_guard before insert or update on public.net_users for each row execute function public.net_users_kid_guard();

alter policy nt_read on public.net_threads
  using (acting_family() = any (owners) and (not is_kid_login() or acting_net_id() in (a, b)));
alter policy nt_insert on public.net_threads
  with check (acting_family() = any (owners) and tid = a || '|' || b and (owns_net_id(a) or owns_net_id(b)) and net_allowed(a, b));
alter policy nt_update on public.net_threads
  using (acting_family() = any (owners) and (not is_kid_login() or acting_net_id() in (a, b)))
  with check (acting_family() = any (owners) and (not is_kid_login() or acting_net_id() in (a, b)));
alter policy nm_read on public.net_msgs
  using (exists (
  select 1 from net_threads t where t.tid = net_msgs.tid and acting_family() = any (t.owners) and (not is_kid_login() or acting_net_id() in (t.a, t.b))));
alter policy nm_insert on public.net_msgs
  with check (owns_net_id(from_id) and exists (
  select 1 from net_threads t where t.tid = net_msgs.tid and acting_family() = any (t.owners) and from_id in (t.a, t.b) and net_allowed(t.a, t.b)));

create or replace function public.presence_visible(pid text) returns boolean language sql stable security definer set search_path = public, auth as $$
  select is_member() and exists (select 1 from net_users t where t.id = pid and (
    fam_of(t.id) = acting_family()::text
    or (t.role = 'kid' and t.visible and exists (select 1 from net_users k where k.owner = acting_family() and k.role = 'kid'))
    or (t.role = 'adult' and is_parent() and exists (select 1 from net_users p where p.id = auth.uid()::text and p.role = 'adult')))) $$;
alter policy np_read on public.net_presence
  using (owner = acting_family() or auth.uid() = any (viewers) or acting_family() = any (viewers) or presence_visible(id));
alter policy np_insert on public.net_presence
  with check (owner = acting_family() and owns_net_id(id) and cardinality(viewers) <= 40);
alter policy np_update on public.net_presence
  using (owner = acting_family() and owns_net_id(id)) with check (owner = acting_family() and owns_net_id(id) and cardinality(viewers) <= 40);
alter policy np_delete on public.net_presence
  using (owner = acting_family() and owns_net_id(id));

-- ===== grants: nothing here is callable by the public, only by signed-in accounts (the news is the one public read, through its policies) =====
do $g$
declare f text;
begin
  foreach f in array array[
    'is_kid_login()','acting_family()','acting_kid()','acting_net_id()','is_member()','is_admin()','can_edit(text)',
    'app_member_lookup(text)','app_grant(text,uuid,text,text)','app_revoke(text,uuid)',
    'mail_may_send(text,text)','mail_send(text,text[],text,text,uuid)','mail_claim(text,text)','mail_admin_address(text,text,text,uuid)','mail_move(uuid,text,text)',
    'kid_login_create(text,text,text)','kid_login_password(text,text)','kid_login_remove(text)','my_kid_login()'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  -- the news policies call can_edit() for anonymous readers too
  grant execute on function public.can_edit(text) to anon;
  grant execute on function public.is_admin() to anon;
end $g$;
revoke all on function public.block_academy_signup() from public, anon, authenticated;
revoke all on function public.net_users_kid_guard() from public, anon, authenticated;
revoke all on function public.touch_updated() from public, anon, authenticated;

-- live updates everywhere
alter publication supabase_realtime add table public.news_posts, public.academy_events, public.app_settings, public.mail_state;
