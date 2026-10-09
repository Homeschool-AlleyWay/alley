-- UNIFY Academy: row-level-security test for kid accounts and grade-band chat rules.
-- Run in the Supabase SQL editor (or execute_sql). Creates fake users inside one transaction,
-- drives the real policies as each of them, then ends with a deliberate error so EVERYTHING rolls back.
-- Read the result in the error text: every line should start with PASS.
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
do $t$
declare
  p1 text := '11111111-1111-1111-1111-111111111111'; p2 text := '22222222-2222-2222-2222-222222222222';
  p3 text := '33333333-3333-3333-3333-333333333333'; a1 text := '44444444-4444-4444-4444-444444444444';
  r text;
begin
  insert into auth.users(id, aud, role, email) values
   (p1::uuid,'authenticated','authenticated','p1@example.invalid'),(p2::uuid,'authenticated','authenticated','p2@example.invalid'),
   (p3::uuid,'authenticated','authenticated','p3@example.invalid'),(a1::uuid,'authenticated','authenticated',null);
  -- adults
  perform pg_temp.run('adult row P1', p1::uuid,false, format($q$insert into net_users values(%L,%L,'p1adult','P1','adult','adult',true,0)$q$,p1,p1), true);
  perform pg_temp.run('adult row P2', p2::uuid,false, format($q$insert into net_users values(%L,%L,'p2adult','P2','adult','adult',true,0)$q$,p2,p2), true);
  perform pg_temp.run('adult row P3', p3::uuid,false, format($q$insert into net_users values(%L,%L,'p3adult','P3','adult','adult',true,0)$q$,p3,p3), true);
  -- kids
  perform pg_temp.run('P1 kid k1 g35 open', p1::uuid,false, format($q$insert into net_users values(%L,%L,'p1k1','K1','kid','g35',true,0)$q$,p1||'_k1',p1), true);
  perform pg_temp.run('P1 kid k2 g35 closed', p1::uuid,false, format($q$insert into net_users values(%L,%L,'p1k2','K2','kid','g35',false,0)$q$,p1||'_k2',p1), true);
  perform pg_temp.run('P2 kid k1 g35 open', p2::uuid,false, format($q$insert into net_users values(%L,%L,'p2k1','K1','kid','g35',true,0)$q$,p2||'_k1',p2), true);
  perform pg_temp.run('P2 kid k2 g68 open', p2::uuid,false, format($q$insert into net_users values(%L,%L,'p2k2','K2','kid','g68',true,0)$q$,p2||'_k2',p2), true);
  perform pg_temp.run('P2 kid k3 g35 closed', p2::uuid,false, format($q$insert into net_users values(%L,%L,'p2k3','K3','kid','g35',false,0)$q$,p2||'_k3',p2), true);
  perform pg_temp.run('P3 kid k1 g35 open', p3::uuid,false, format($q$insert into net_users values(%L,%L,'p3k1','K1','kid','g35',true,0)$q$,p3||'_k1',p3), true);
  perform pg_temp.run('DENY kid with band adult', p1::uuid,false, format($q$insert into net_users values(%L,%L,'p1bad','K','kid','adult',true,0)$q$,p1||'_k9',p1), false);
  perform pg_temp.run('DENY anonymous creating kid', a1::uuid,true, format($q$insert into net_users values(%L,%L,'a1kid','K','kid','g35',true,0)$q$,a1||'_k1',a1), false);
  perform pg_temp.run('DENY parent creating kid under other family id', p1::uuid,false, format($q$insert into net_users values(%L,%L,'steal','K','kid','g35',true,0)$q$,p2||'_k9',p1), false);
  perform pg_temp.run('DENY duplicate handle', p3::uuid,false, format($q$insert into net_users values(%L,%L,'p1k1','K','kid','g35',true,0)$q$,p3||'_k2',p3), false);
  -- threads
  perform pg_temp.run('ALLOW g35 open kid <-> g35 open kid', p1::uuid,false, format($q$insert into net_threads values(%L,%L,%L,array[%L,%L]::uuid[],0)$q$,p1||'_k1|'||p2||'_k1',p1||'_k1',p2||'_k1',p1,p2), true);
  perform pg_temp.run('DENY different grade band (g35 vs g68)', p1::uuid,false, format($q$insert into net_threads values(%L,%L,%L,array[%L,%L]::uuid[],0)$q$,p1||'_k1|'||p2||'_k2',p1||'_k1',p2||'_k2',p1,p2), false);
  perform pg_temp.run('DENY other kid is closed', p1::uuid,false, format($q$insert into net_threads values(%L,%L,%L,array[%L,%L]::uuid[],0)$q$,p1||'_k1|'||p2||'_k3',p1||'_k1',p2||'_k3',p1,p2), false);
  perform pg_temp.run('DENY my kid is closed', p1::uuid,false, format($q$insert into net_threads values(%L,%L,%L,array[%L,%L]::uuid[],0)$q$,p1||'_k2|'||p2||'_k1',p1||'_k2',p2||'_k1',p1,p2), false);
  perform pg_temp.run('DENY grown-up <-> another family kid', p1::uuid,false, format($q$insert into net_threads values(%L,%L,%L,array[%L,%L]::uuid[],0)$q$,p1||'|'||p2||'_k1',p1,p2||'_k1',p1,p2), false);
  perform pg_temp.run('ALLOW grown-up <-> grown-up', p1::uuid,false, format($q$insert into net_threads values(%L,%L,%L,array[%L,%L]::uuid[],0)$q$,p1||'|'||p2,p1,p2,p1,p2), true);
  perform pg_temp.run('ALLOW same-family parent <-> closed own kid', p1::uuid,false, format($q$insert into net_threads values(%L,%L,%L,array[%L]::uuid[],0)$q$,p1||'|'||p1||'_k2',p1,p1||'_k2',p1), true);
  perform pg_temp.run('DENY thread whose owners omit me', p1::uuid,false, format($q$insert into net_threads values(%L,%L,%L,array[%L]::uuid[],0)$q$,p1||'_k1|'||p3||'_k1',p1||'_k1',p3||'_k1',p3), false);
  perform pg_temp.run('DENY stranger making thread between two others', p3::uuid,false, format($q$insert into net_threads values(%L,%L,%L,array[%L]::uuid[],0)$q$,p1||'_k1|'||p2||'_k1x',p1||'_k1',p2||'_k1',p3), false);
  -- messages
  perform pg_temp.run('ALLOW kid sends in allowed thread', p1::uuid,false, format($q$insert into net_msgs(tid,from_id,text,at) values(%L,%L,'hi',1)$q$,p1||'_k1|'||p2||'_k1',p1||'_k1'), true);
  perform pg_temp.run('ALLOW other family kid replies', p2::uuid,false, format($q$insert into net_msgs(tid,from_id,text,at) values(%L,%L,'hello',2)$q$,p1||'_k1|'||p2||'_k1',p2||'_k1'), true);
  perform pg_temp.run('DENY forged sender id', p1::uuid,false, format($q$insert into net_msgs(tid,from_id,text,at) values(%L,%L,'forged',3)$q$,p1||'_k1|'||p2||'_k1',p2||'_k1'), false);
  perform pg_temp.run('DENY stranger posting into thread', p3::uuid,false, format($q$insert into net_msgs(tid,from_id,text,at) values(%L,%L,'x',4)$q$,p1||'_k1|'||p2||'_k1',p3||'_k1'), false);
  perform pg_temp.run('DENY message over 500 chars', p1::uuid,false, format($q$insert into net_msgs(tid,from_id,text,at) values(%L,%L,repeat('a',501),5)$q$,p1||'_k1|'||p2||'_k1',p1||'_k1'), false);
  perform pg_temp.run('stranger sees zero messages', p3::uuid,false, $q$do $d$ begin if (select count(*) from net_msgs)>0 then raise exception 'leak'; end if; end $d$$q$, true);
  perform pg_temp.run('participant sees exactly 2 messages', p2::uuid,false, $q$do $d$ begin if (select count(*) from net_msgs)<>2 then raise exception 'wrong count'; end if; end $d$$q$, true);
  perform pg_temp.run('DENY stranger editing my kid row (0 rows)', p3::uuid,false, format($q$do $d$ declare c int; begin update net_users set open=true where id=%L; get diagnostics c = row_count; if c=0 then raise exception 'blocked'; end if; end $d$$q$,p1||'_k1'), false);
  -- kid closes -> re-check on send
  perform pg_temp.run('P2 closes its kid', p2::uuid,false, format($q$update net_users set open=false where id=%L$q$,p2||'_k1'), true);
  perform pg_temp.run('DENY send after other kid closed', p1::uuid,false, format($q$insert into net_msgs(tid,from_id,text,at) values(%L,%L,'still there?',6)$q$,p1||'_k1|'||p2||'_k1',p1||'_k1'), false);
  perform pg_temp.run('ALLOW same-family chat still works', p1::uuid,false, format($q$insert into net_msgs(tid,from_id,text,at) values(%L,%L,'dinner',7)$q$,p1||'|'||p1||'_k2',p1), true);
  select string_agg(verdict||' | '||n||coalesce(' | '||left(err,90),''), E'\n' order by (verdict='FAIL') desc, n) into r from pg_temp.res;
  raise exception E'RESULTS\n%', r;  -- deliberate: aborts the transaction so nothing persists
end $t$;
