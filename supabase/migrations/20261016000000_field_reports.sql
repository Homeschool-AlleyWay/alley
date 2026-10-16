-- Newsroom field reports: at most 20 ACTIVE reports, each with an audience ('all' for everyone, 'hs' for high school + adults) and the generated papercut
-- scene script (JSON) stored with it so playback is identical everywhere. Idempotent: safe to run twice. Nothing is dropped or deleted; archiving
-- is a status change, and there is deliberately no delete policy.
-- The app works without this table (it keeps the list in the browser); once it exists, the signed-in newsroom team shares one list.

create table if not exists public.field_reports (
  id text primary key check (id ~ '^[a-z0-9._-]{1,40}$'),
  title text not null check (char_length(title) between 1 and 120),
  topic text not null default 'community' check (char_length(topic) <= 30),
  audience text not null default 'all' check (audience in ('all', 'hs')),
  beats jsonb not null default '[]'::jsonb check (jsonb_typeof(beats) = 'array' and jsonb_array_length(beats) between 1 and 4 and pg_column_size(beats) < 6000),
  scene_script jsonb check (scene_script is null or pg_column_size(scene_script) < 60000),
  status text not null default 'active' check (status in ('active', 'archived')),
  author_name text not null default '' check (char_length(author_name) <= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists field_reports_status on public.field_reports (status, created_at);

alter table public.field_reports enable row level security;
do $$ begin
  -- everyone (even signed out) reads the active reports; the newsroom team also sees the archive
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'field_reports' and policyname = 'fr_read') then
    create policy fr_read on public.field_reports for select to anon, authenticated using (status = 'active' or can_edit('newsroom'));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'field_reports' and policyname = 'fr_ins') then
    create policy fr_ins on public.field_reports for insert to authenticated with check (can_edit('newsroom'));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'field_reports' and policyname = 'fr_upd') then
    create policy fr_upd on public.field_reports for update to authenticated using (can_edit('newsroom')) with check (can_edit('newsroom'));
  end if;
end $$;

-- the cap: a 21st active report is refused, whoever sends it (the app shows the message as is)
create or replace function public.field_reports_cap() returns trigger language plpgsql set search_path = public as $$
begin
  if new.status = 'active' and (select count(*) from public.field_reports where status = 'active' and id <> new.id) >= 20 then
    raise exception 'The newsroom already has 20 field reports. Archive one first (it stays saved) and then add this one.' using errcode = '23514';
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke all on function public.field_reports_cap() from public, anon, authenticated;
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'field_reports_cap' and tgrelid = 'public.field_reports'::regclass) then
    create trigger field_reports_cap before insert or update on public.field_reports for each row execute function public.field_reports_cap();
  end if;
end $$;
