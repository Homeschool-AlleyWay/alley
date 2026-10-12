-- UNIFY Academy: tests for school-wide presence, grade-based chat and emotes (migration 20261012000000).
-- Rolled back at the end (deliberate error). Every line of the result should start with PASS.
create temp table res(n text, want boolean, got boolean, verdict text, err text);
create or replace function pg_temp.run(n text, uid uuid, anon boolean, q text, want_ok boolean) returns void language plpgsql as $f$
declare err text;
begin
  perform set_config('request.jwt.claims', json_build_object('sub',uid,'role','authenticated','is_anonymous',anon)::text, true);
  execute 'set local role authenticated';
  begin execute q; err := null; exception when others then err := sqlstate||' '||sqlerrm; end;
  execute 'reset role';
  insert into pg_temp.res values (n, want_ok, err is null, case when want_ok = (err is null) then 'PASS' else 'FAIL' end, err);
end $f$;
-- as uid, count presence rows matching a where-clause and require exactly want
create or replace function pg_temp.sees(n text, uid uuid, anon boolean, cond text, want int) returns void language plpgsql as $f$
begin
  perform pg_temp.run(n, uid, anon, format($q$do $d$ begin if (select count(*) from net_presence where %s) <> %s then raise exception 'wrong count'; end if; end $d$$q$, cond, want), true);
end $f$;
do $t$
declare
  p1 text := '11111111-1111-1111-1111-111111111111'; p2 text := '22222222-2222-2222-2222-222222222222';
  p3 text := '33333333-3333-3333-3333-333333333333'; p4 text := '55555555-5555-5555-5555-555555555555';
  a1 text := '44444444-4444-4444-4444-444444444444';
  r text;
begin
  insert into auth.users(id, aud, role, email) values
   (p1::uuid,'authenticated','authenticated','p1@example.invalid'),(p2::uuid,'authenticated','authenticated','p2@example.invalid'),
   (p3::uuid,'authenticated','authenticated','p3@example.invalid'),(p4::uuid,'authenticated','authenticated','p4@example.invalid'),
   (a1::uuid,'authenticated','authenticated',null);
  -- adults, then students with exact grades (p3's student is switched off: visible=false)
  perform pg_temp.run('adult P1', p1::uuid,false, format($q$insert into net_users values(%L,%L,'p1adult','P1','adult','adult',true,0)$q$,p1,p1), true);
  perform pg_temp.run('adult P2', p2::uuid,false, format($q$insert into net_users values(%L,%L,'p2adult','P2','adult','adult',true,0)$q$,p2,p2), true);
  perform pg_temp.run('adult P3', p3::uuid,false, format($q$insert into net_users values(%L,%L,'p3adult','P3','adult','adult',true,0)$q$,p3,p3), true);
  perform pg_temp.run('adult P4 (no children)', p4::uuid,false, format($q$insert into net_users values(%L,%L,'p4adult','P4','adult','adult',true,0)$q$,p4,p4), true);
  perform pg_temp.run('P1 student grade 4', p1::uuid,false, format($q$insert into net_users(id,owner,handle,name,role,band,open,at,grade) values(%L,%L,'p1k1','K1','kid','g35',true,0,4)$q$,p1||'_k1',p1), true);
  perform pg_temp.run('P2 student grade 5', p2::uuid,false, format($q$insert into net_users(id,owner,handle,name,role,band,open,at,grade) values(%L,%L,'p2k1','K1','kid','g35',true,0,5)$q$,p2||'_k1',p2), true);
  perform pg_temp.run('P2 student grade 7', p2::uuid,false, format($q$insert into net_users(id,owner,handle,name,role,band,open,at,grade) values(%L,%L,'p2k2','K2','kid','g68',true,0,7)$q$,p2||'_k2',p2), true);
  perform pg_temp.run('P3 student grade 4 hidden', p3::uuid,false, format($q$insert into net_users(id,owner,handle,name,role,band,open,at,grade,visible) values(%L,%L,'p3k1','K1','kid','g35',true,0,4,false)$q$,p3||'_k1',p3), true);
  perform pg_temp.run('DENY grade out of range', p1::uuid,false, format($q$insert into net_users(id,owner,handle,name,role,band,open,at,grade) values(%L,%L,'p1bad','K','kid','g35',true,0,13)$q$,p1||'_k9',p1), false);

  -- chat: same grade or one apart, never two apart
  perform pg_temp.run('ALLOW grade 4 <-> grade 5', p1::uuid,false, format($q$insert into net_threads values(%L,%L,%L,array[%L,%L]::uuid[],0)$q$,p1||'_k1|'||p2||'_k1',p1||'_k1',p2||'_k1',p1,p2), true);
  perform pg_temp.run('ALLOW grade 4 <-> grade 4 (other family)', p1::uuid,false, format($q$insert into net_threads values(%L,%L,%L,array[%L,%L]::uuid[],0)$q$,p1||'_k1|'||p3||'_k1',p1||'_k1',p3||'_k1',p1,p3), true);
  perform pg_temp.run('DENY grade 4 <-> grade 7', p1::uuid,false, format($q$insert into net_threads values(%L,%L,%L,array[%L,%L]::uuid[],0)$q$,p1||'_k1|'||p2||'_k2',p1||'_k1',p2||'_k2',p1,p2), false);
  perform pg_temp.run('DENY grown-up <-> other family student', p1::uuid,false, format($q$insert into net_threads values(%L,%L,%L,array[%L,%L]::uuid[],0)$q$,p1||'|'||p2||'_k1',p1,p2||'_k1',p1,p2), false);

  -- presence rows
  perform pg_temp.run('P1 student appears (hall)', p1::uuid,false, format($q$insert into net_presence(id,owner,doc,viewers,at,room) values(%L,%L,'{"x":1,"z":1}'::jsonb,'{}',1,'hall')$q$,p1||'_k1',p1), true);
  perform pg_temp.run('P2 student appears (class)', p2::uuid,false, format($q$insert into net_presence(id,owner,doc,viewers,at,room) values(%L,%L,'{"x":1,"z":1}'::jsonb,'{}',1,'class-math')$q$,p2||'_k1',p2), true);
  perform pg_temp.run('P3 hidden student row', p3::uuid,false, format($q$insert into net_presence(id,owner,doc,viewers,at,room) values(%L,%L,'{"x":1,"z":1}'::jsonb,'{}',1,'hall')$q$,p3||'_k1',p3), true);
  perform pg_temp.run('P1 grown-up appears', p1::uuid,false, format($q$insert into net_presence(id,owner,doc,viewers,at,room) values(%L,%L,'{"x":1,"z":1}'::jsonb,'{}',1,'hall')$q$,p1,p1), true);
  perform pg_temp.run('emote wave allowed', p1::uuid,false, format($q$update net_presence set doc='{"emote":"wave"}'::jsonb where id=%L$q$,p1||'_k1'), true);
  perform pg_temp.run('DENY free-text emote', p1::uuid,false, format($q$update net_presence set doc='{"emote":"hello there"}'::jsonb where id=%L$q$,p1||'_k1'), false);
  perform pg_temp.run('DENY oversize presence doc', p1::uuid,false, format($q$update net_presence set doc=jsonb_build_object('x',repeat('a',5000)) where id=%L$q$,p1||'_k1'), false);
  perform pg_temp.run('DENY presence under another family id', p1::uuid,false, format($q$insert into net_presence(id,owner,doc,viewers,at,room) values(%L,%L,'{}'::jsonb,'{}',1,'hall')$q$,p2||'_k9',p1), false);

  -- who sees what
  perform pg_temp.sees('P2 sees P1 student (other family, other grade ok)', p2::uuid,false, format('id=%L', p1||'_k1'), 1);
  perform pg_temp.sees('P1 sees P2 student in a class room', p1::uuid,false, format('id=%L', p2||'_k1'), 1);
  perform pg_temp.sees('P2 does NOT see hidden student', p2::uuid,false, format('id=%L', p3||'_k1'), 0);
  perform pg_temp.sees('P3 still sees own hidden student', p3::uuid,false, format('id=%L', p3||'_k1'), 1);
  perform pg_temp.sees('P2 sees P1 grown-up', p2::uuid,false, format('id=%L', p1), 1);
  perform pg_temp.sees('P4 (no children) does NOT see any student', p4::uuid,false, 'id like ''%\_k%''', 0);
  perform pg_temp.sees('P4 (no children) sees grown-ups', p4::uuid,false, format('id=%L', p1), 1);
  perform pg_temp.sees('anonymous account sees nothing', a1::uuid,true, 'true', 0);
  select string_agg(verdict||' | '||n||coalesce(' | '||left(err,90),''), E'\n' order by (verdict='FAIL') desc, n) into r from pg_temp.res;
  raise exception E'RESULTS\n%', r;
end $t$;
