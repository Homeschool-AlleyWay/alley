-- Presence: the owner must be able to read their own row (needed for upsert/update), friends read it through the viewers list.
drop policy if exists np_read on public.net_presence;
create policy np_read on public.net_presence for select to authenticated using (owner = auth.uid() or auth.uid() = any(viewers));
