-- Minimal stand-in for the parts of Supabase these migrations rely on, so the RLS tests can run on a plain Postgres (see run_local.sh).
create schema if not exists auth;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
grant usage on schema public, auth, extensions to anon, authenticated;
create table auth.users (
  instance_id uuid, id uuid primary key, aud varchar, role varchar, email varchar, encrypted_password varchar, email_confirmed_at timestamptz, invited_at timestamptz,
  confirmation_token varchar default '', confirmation_sent_at timestamptz, recovery_token varchar default '', recovery_sent_at timestamptz, email_change_token_new varchar default '',
  email_change varchar default '', email_change_sent_at timestamptz, last_sign_in_at timestamptz, raw_app_meta_data jsonb, raw_user_meta_data jsonb, is_super_admin boolean,
  created_at timestamptz, updated_at timestamptz, phone text, phone_confirmed_at timestamptz, phone_change text default '', phone_change_token varchar default '', phone_change_sent_at timestamptz,
  confirmed_at timestamptz generated always as (least(email_confirmed_at, phone_confirmed_at)) stored, email_change_token_current varchar default '', email_change_confirm_status smallint default 0,
  banned_until timestamptz, reauthentication_token varchar default '', reauthentication_sent_at timestamptz, is_sso_user boolean not null default false, deleted_at timestamptz, is_anonymous boolean not null default false);
create table auth.identities (provider_id text not null, user_id uuid not null references auth.users(id) on delete cascade, identity_data jsonb not null, provider text not null,
  last_sign_in_at timestamptz, created_at timestamptz, updated_at timestamptz, email text generated always as (lower(identity_data ->> 'email')) stored, id uuid primary key default gen_random_uuid());
create or replace function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
create or replace function public.rls_auto_enable() returns void language sql as $$ select 1 $$;
create publication supabase_realtime;
alter default privileges in schema public grant all on tables to anon, authenticated;
create schema if not exists storage;
create table if not exists storage.buckets (id text primary key, name text, public boolean default false);
