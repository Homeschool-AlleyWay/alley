-- Classmate showcases: each child's locker (stickers, note, door colour, avatar, and the locker number they claimed).
-- Never photos: those stay on the device. A parent can hide a child's showcase (visible = false).
-- Readable only by parent accounts (anonymous guests see nothing), so "everyone at school" means every family on the platform.
create table public.showcases (
  family uuid not null,
  kid text not null,
  name text not null default '' check (char_length(name) <= 40),
  json text not null default '' check (char_length(json) <= 20000),
  visible boolean not null default true,
  primary key (family, kid),
  foreign key (family, kid) references public.kids(family, id) on delete cascade
);
alter table public.showcases enable row level security;
create policy sc_read on public.showcases for select to authenticated
  using (is_parent() and (visible or family = auth.uid()));
create policy sc_write on public.showcases for all to authenticated
  using (family = auth.uid() and is_parent()) with check (family = auth.uid() and is_parent());
