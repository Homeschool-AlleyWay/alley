-- UNIFY Academy: tests for the field-report table (migration 20261016000000): public read of active reports only, editor-only writes, no deletes, and the cap of 20.
-- Rolled back at the end (deliberate error). Every line of the result should start with PASS.
create temp table res(n text, want boolean, got boolean, verdict text, err text);
-- run a statement as a user; email is set for academy (kid) sign-ins exactly as the real token carries it
create or replace function pg_temp.run(n text, uid uuid, anon boolean, em text, q text, want_ok boolean) returns void language plpgsql as $f$
declare err text;
begin
  perform set_config('request.jwt.claims', json_build_object('sub',uid,'role','authenticated','is_anonymous',anon,'email',em)::text, true);
  execute 'set local role authenticated';
  begin execute q; err := null; exception when others then err := sqlstate||' '||sqlerrm; end;
  execute 'reset role';
  insert into pg_temp.res values (n, want_ok, err is null, case when want_ok = (err is null) then 'PASS' else 'FAIL' end, err);
end $f$;
-- as uid, require exactly `want` rows from `tbl where cond`
create or replace function pg_temp.sees(n text, uid uuid, anon boolean, em text, tbl text, cond text, want int) returns void language plpgsql as $f$
begin
  perform pg_temp.run(n, uid, anon, em, format($q$do $d$ begin if (select count(*) from %s where %s) <> %s then raise exception 'wrong count'; end if; end $d$$q$, tbl, cond, want), true);
end $f$;
do $t$
declare
  ad text := 'a0000000-0000-0000-0000-000000000001'; ed text := 'e0000000-0000-0000-0000-000000000001'; st text := '5a000000-0000-0000-0000-000000000001'; r text; i int;
begin
  insert into auth.users(id, aud, role, email) values (ad::uuid,'authenticated','authenticated','admin@example.invalid'),(ed::uuid,'authenticated','authenticated','editor@example.invalid'),(st::uuid,'authenticated','authenticated','stranger@example.invalid');
  insert into public.academy_admins(uid, note) values (ad::uuid, 'test admin');
  perform pg_temp.run('admin grants the editor the newsroom', ad::uuid,false,null, format($q$select app_grant('newsroom', %L::uuid, 'editor', 'Ed')$q$, ed), true);
  perform pg_temp.run('DENY stranger posts a field report', st::uuid,false,null, $q$insert into field_reports(id,title,beats) values ('x1','x','[{"text":"a"}]')$q$, false);
  for i in 1..20 loop
    perform pg_temp.run('ALLOW editor posts active report '||i, ed::uuid,false,null, format($q$insert into field_reports(id,title,audience,beats) values ('r%s','Report %s','all','[{"text":"a b"}]')$q$, i, i), true);
  end loop;
  perform pg_temp.run('DENY the 21st active report (cap of 20)', ed::uuid,false,null, $q$insert into field_reports(id,title,beats) values ('r21','Report 21','[{"text":"a b"}]')$q$, false);
  perform pg_temp.run('DENY an audience other than all or hs', ed::uuid,false,null, $q$insert into field_reports(id,title,audience,beats) values ('bad','t','kids','[{"text":"a"}]')$q$, false);
  perform pg_temp.run('DENY more than 4 beats', ed::uuid,false,null, $q$insert into field_reports(id,title,status,beats) values ('b5','t','archived','[1,2,3,4,5]')$q$, false);
  perform pg_temp.run('ALLOW archiving one (kept, not deleted)', ed::uuid,false,null, $q$update field_reports set status = 'archived' where id = 'r1'$q$, true);
  perform pg_temp.run('ALLOW a new active report after archiving', ed::uuid,false,null, $q$insert into field_reports(id,title,audience,beats) values ('r21','Report 21','hs','[{"text":"a b"}]')$q$, true);
  perform pg_temp.run('DENY restoring while full', ed::uuid,false,null, $q$update field_reports set status = 'active' where id = 'r1'$q$, false);
  perform pg_temp.run('editing an active report while full is fine', ed::uuid,false,null, $q$update field_reports set title = 'Renamed' where id = 'r2'$q$, true);
  perform pg_temp.run('a delete statement is allowed but touches nothing (no delete policy)', ed::uuid,false,null, $q$delete from field_reports where id = 'r3'$q$, true);
  perform pg_temp.sees('stranger reads the 20 active reports, not the archive', st::uuid,false,null, 'field_reports', 'true', 20);
  perform pg_temp.sees('editor also sees the archived one', ed::uuid,false,null, 'field_reports', 'true', 21);
  perform pg_temp.sees('a delete removed nothing', ed::uuid,false,null, 'field_reports', $$id = 'r3'$$, 1);
  select string_agg(verdict||' | '||n||coalesce(' | '||left(err,90),''), E'\n' order by (verdict='FAIL') desc, n) into r from pg_temp.res;
  raise exception E'RESULTS\n%', r;
end $t$;
