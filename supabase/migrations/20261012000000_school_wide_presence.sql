-- UNIFY Academy: everyone appears to each other school-wide; chat widens from "same band" to "same grade or one above/below".
-- Rules (agreed with the owner):
--   * Seeing: every signed-in student appears as an avatar to every other family's students in every room, class and game, any grade.
--     Grown-ups see only grown-ups and their own children. Visible by default; a parent can switch a child off (net_users.visible).
--   * Chat: unchanged for family and grown-ups. Student <-> student needs both families "open" AND grades within 1 of each other.
--   * Across grades without chat: fixed emotes only (no free text rides on presence).

alter table public.net_users add column if not exists grade smallint check (grade between 0 and 12);
alter table public.net_users add column if not exists visible boolean not null default true;
-- legacy rows only know a band; use its middle so nothing opens wider than the old rule did
update public.net_users set grade = case band when 'k2' then 1 when 'g35' then 4 when 'g68' then 7 when 'hs' then 10 end
 where role = 'kid' and grade is null;

create or replace function public.net_allowed(x text, y text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from net_users a, net_users b where a.id = x and b.id = y and a.id <> b.id and (
    fam_of(a.id) = fam_of(b.id)
    or (a.role = 'adult' and b.role = 'adult')
    or (a.role = 'kid' and b.role = 'kid' and a.open and b.open
        and (case when a.grade is not null and b.grade is not null then abs(a.grade - b.grade) <= 1 else a.band = b.band end)))) $$;

alter table public.net_presence add column if not exists room text not null default 'hall' check (char_length(room) between 1 and 40);
create index if not exists net_presence_room_at on public.net_presence (room, at);
alter table public.net_presence drop constraint if exists net_presence_emote_ok;
alter table public.net_presence add constraint net_presence_emote_ok check (
  (doc ->> 'emote') is null or (doc ->> 'emote') in ('wave','thumbsup','heart','laugh','star','clap'));
alter table public.net_presence drop constraint if exists net_presence_doc_small;
alter table public.net_presence add constraint net_presence_doc_small check (pg_column_size(doc) < 4000);

-- who may SEE a presence row: the viewer must be a real (non-anonymous) account;
--   own family always; a student's row if the viewer's family has a student and that student is visible; a grown-up's row only to grown-ups.
create or replace function public.presence_visible(pid text) returns boolean language sql stable security definer set search_path = public, auth as $$
  select is_parent() and exists (select 1 from net_users t where t.id = pid and (
    fam_of(t.id) = auth.uid()::text
    or (t.role = 'kid' and t.visible and exists (select 1 from net_users k where k.owner = auth.uid() and k.role = 'kid'))
    or (t.role = 'adult' and exists (select 1 from net_users p where p.id = auth.uid()::text and p.role = 'adult')))) $$;
revoke all on function public.presence_visible(text) from public, anon; grant execute on function public.presence_visible(text) to authenticated;

drop policy if exists np_read on public.net_presence;
create policy np_read on public.net_presence for select to authenticated
  using (owner = auth.uid() or auth.uid() = any(viewers) or presence_visible(id));
