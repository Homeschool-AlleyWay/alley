-- UNIFY Academy: tests for the Newsroom app access, academy mail and kid sign-in (migration 20261013000000).
-- Run AFTER 20261012000000 and 20261013000000 are applied, or paste both migrations in front of this file inside one run.
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
  ad text := 'a0000000-0000-0000-0000-000000000001'; p1 text := '11111111-1111-1111-1111-111111111111'; p2 text := '22222222-2222-2222-2222-222222222222';
  ed text := 'e0000000-0000-0000-0000-000000000001'; st text := '5a000000-0000-0000-0000-000000000001';
  k1u uuid; k2u uuid; k1e text; k2e text; r text; cnt int;
begin
  insert into auth.users(id, aud, role, email) values
    (ad::uuid,'authenticated','authenticated','admin@example.invalid'),(p1::uuid,'authenticated','authenticated','p1@example.invalid'),(p2::uuid,'authenticated','authenticated','p2@example.invalid'),
    (ed::uuid,'authenticated','authenticated','editor@example.invalid'),(st::uuid,'authenticated','authenticated','stranger@example.invalid');
  insert into public.academy_admins(uid, note) values (ad::uuid, 'test admin');
  insert into public.families(uid) values (p1::uuid),(p2::uuid);
  insert into public.kids(family,id,name,age,salt,hash,created,grade) values (p1::uuid,'k1','Kay','g35','s','h',0,4),(p1::uuid,'k1b','Kay Two','g35','s','h',0,4),(p2::uuid,'k2','Lee','g35','s','h',0,5);
  insert into public.net_users(id,owner,handle,name,role,band,open,at,grade) values
    (p1,p1::uuid,'p1adult','P1','adult','adult',true,0,null),(p2,p2::uuid,'p2adult','P2','adult','adult',true,0,null),
    (p1||'_k1',p1::uuid,'p1k1','Kay','kid','g35',false,0,4),(p1||'_k1b',p1::uuid,'p1k1b','Kay Two','kid','g35',true,0,4),(p2||'_k2',p2::uuid,'p2k2','Lee','kid','g35',true,0,5);

  -- ---- who can run the Newsroom ----
  perform pg_temp.run('DENY stranger posts to the bulletin board', st::uuid,false,null, $q$insert into news_posts(title) values ('x')$q$, false);
  perform pg_temp.run('ALLOW admin posts to the bulletin board', ad::uuid,false,null, $q$insert into news_posts(title,body) values ('Picture day','Friday')$q$, true);
  perform pg_temp.run('ALLOW admin saves a draft', ad::uuid,false,null, $q$insert into news_posts(title,status) values ('Secret draft','draft')$q$, true);
  perform pg_temp.run('DENY non-admin gives out an app', p1::uuid,false,null, format($q$select app_grant('newsroom',%L::uuid,'editor','x')$q$, ed), false);
  perform pg_temp.run('ALLOW admin gives the newsroom to an editor', ad::uuid,false,null, format($q$select app_grant('newsroom',%L::uuid,'editor','Student reporter')$q$, ed), true);
  perform pg_temp.run('ALLOW editor posts an event', ed::uuid,false,null, $q$insert into academy_events(title,starts_at,room) values ('Science fair', now() + interval '1 day','auditorium')$q$, true);
  perform pg_temp.run('ALLOW editor changes the look (newsroom.theme)', ed::uuid,false,null, $q$insert into app_settings(key,value) values ('newsroom.theme','{"palette":"sunrise"}'::jsonb)$q$, true);
  perform pg_temp.run('DENY editor changes a non-newsroom setting', ed::uuid,false,null, $q$insert into app_settings(key,value) values ('mail.secret','{}'::jsonb)$q$, false);
  perform pg_temp.run('DENY editor makes an admin', ed::uuid,false,null, format($q$insert into academy_admins(uid) values (%L::uuid)$q$, ed), false);
  perform pg_temp.run('ALLOW admin takes the app away again', ad::uuid,false,null, format($q$select app_revoke('newsroom',%L::uuid)$q$, ed), true);
  perform pg_temp.run('DENY the old editor posts now', ed::uuid,false,null, $q$insert into news_posts(title) values ('x')$q$, false);
  perform pg_temp.sees('stranger sees the published post, not the draft', st::uuid,false,null, 'news_posts', 'true', 1);
  perform pg_temp.sees('admin sees post and draft', ad::uuid,false,null, 'news_posts', 'true', 2);
  perform pg_temp.run('anonymous visitor can read the bulletin board', gen_random_uuid(),true,null, $q$do $d$ begin if (select count(*) from news_posts) <> 1 then raise exception 'wrong'; end if; end $d$$q$, true);

  -- ---- kid sign-in ----
  perform pg_temp.run('DENY a parent gives a sign-in to someone else''s child', p2::uuid,false,null, $q$select kid_login_create('k1','kay','longpassword')$q$, false);
  perform pg_temp.run('DENY a short password', p1::uuid,false,null, $q$select kid_login_create('k1','kay','short')$q$, false);
  perform pg_temp.run('ALLOW parent creates Kay''s sign-in', p1::uuid,false,null, $q$select kid_login_create('k1','kay','longpassword')$q$, true);
  perform pg_temp.run('DENY a second sign-in for the same child', p1::uuid,false,null, $q$select kid_login_create('k1','kay','longpassword')$q$, false);
  perform pg_temp.run('ALLOW parent creates Lee''s sign-in', p2::uuid,false,null, $q$select kid_login_create('k2','lee','longpassword')$q$, true);
  select auth_uid into k1u from kid_logins where family = p1::uuid and kid = 'k1';
  select auth_uid into k2u from kid_logins where family = p2::uuid and kid = 'k2';
  select login_email into k1e from kids where family = p1::uuid and id = 'k1';
  select login_email into k2e from kids where family = p2::uuid and id = 'k2';
  insert into pg_temp.res values ('address looks right', true, k1e ~ '^kay\.[0-9a-f]{4}@unify\.mail$', case when k1e ~ '^kay\.[0-9a-f]{4}@unify\.mail$' then 'PASS' else 'FAIL' end, k1e);
  begin insert into auth.users(id, aud, role, email) values (gen_random_uuid(),'authenticated','authenticated','sneaky@unify.mail'); insert into pg_temp.res values ('DENY public sign-up with an academy address', false, true, 'FAIL', null);
  exception when others then insert into pg_temp.res values ('DENY public sign-up with an academy address', false, false, 'PASS', sqlstate); end;

  perform pg_temp.run('kid: sees only their own student row', k1u,false,k1e, $q$do $d$ begin if (select count(*) from kids) <> 1 then raise exception 'wrong'; end if; end $d$$q$, true);
  perform pg_temp.run('kid: knows who they are', k1u,false,k1e, $q$do $d$ begin if (select count(*) from my_kid_login()) <> 1 then raise exception 'wrong'; end if; end $d$$q$, true);
  perform pg_temp.run('ALLOW kid saves own progress', k1u,false,k1e, format($q$insert into kid_data values (%L::uuid,'k1','unify.progress.v1','{}',1)$q$, p1), true);
  perform pg_temp.run('DENY kid saves a sibling''s progress', k1u,false,k1e, format($q$insert into kid_data values (%L::uuid,'k1b','unify.progress.v1','{}',1)$q$, p1), false);
  perform pg_temp.run('kid cannot read the family profile (0 rows)', k1u,false,k1e, $q$do $d$ begin if (select count(*) from families) <> 0 then raise exception 'sees family'; end if; end $d$$q$, true);
  perform pg_temp.run('kid cannot rewrite the family''s children (0 rows touched)', k1u,false,k1e, $q$update kids set name = 'Hacked'$q$, true);   -- 0 rows touched: allowed to run, changes nothing
  perform pg_temp.run('ALLOW kid joins the network as themselves', k1u,false,k1e, format($q$insert into net_users(id,owner,handle,name,role,band,open,at,grade) values (%L,%L::uuid,'kaykid','Kay','kid','g35',true,0,12) on conflict (id) do update set name = excluded.name$q$, p1||'_k1', p1), true);
  perform pg_temp.run('DENY kid joins as their sibling', k1u,false,k1e, format($q$insert into net_users(id,owner,handle,name,role,band,open,at) values (%L,%L::uuid,'sib2','Sib','kid','g35',true,0)$q$, p1||'_k1b', p1), false);
  perform pg_temp.run('DENY kid joins as a grown-up', k1u,false,k1e, format($q$insert into net_users(id,owner,handle,name,role,band,open,at) values (%L,%L::uuid,'fakeadult','A','adult','adult',true,0)$q$, k1u, p1), false);
  select count(*) into cnt from net_users where id = p1||'_k1' and open = false and grade = 4;
  insert into pg_temp.res values ('kid cannot switch themselves open or change their grade', true, cnt = 1, case when cnt = 1 then 'PASS' else 'FAIL' end, null);
  perform pg_temp.run('DENY kid chats while their parent has not opened them', k1u,false,k1e, format($q$insert into net_threads values (%L,%L,%L,array[%L,%L]::uuid[],0)$q$, p1||'_k1|'||p2||'_k2', p1||'_k1', p2||'_k2', p1, p2), false);
  perform pg_temp.run('ALLOW the parent opens Kay to other families', p1::uuid,false,null, format($q$update net_users set open = true where id = %L$q$, p1||'_k1'), true);
  perform pg_temp.run('ALLOW kid chats with a grade-5 student once opened', k1u,false,k1e, format($q$insert into net_threads values (%L,%L,%L,array[%L,%L]::uuid[],0)$q$, p1||'_k1|'||p2||'_k2', p1||'_k1', p2||'_k2', p1, p2), true);
  perform pg_temp.run('ALLOW kid sends a message', k1u,false,k1e, format($q$insert into net_msgs(tid,from_id,text,at) values (%L,%L,'hi!',1)$q$, p1||'_k1|'||p2||'_k2', p1||'_k1'), true);
  perform pg_temp.run('DENY kid sends as a sibling', k1u,false,k1e, format($q$insert into net_msgs(tid,from_id,text,at) values (%L,%L,'hi!',1)$q$, p1||'_k1|'||p2||'_k2', p1||'_k1b'), false);
  perform pg_temp.sees('PARENT sees their child''s chat (live oversight)', p1::uuid,false,null, 'net_threads', format('tid = %L', p1||'_k1|'||p2||'_k2'), 1);
  perform pg_temp.sees('PARENT reads the messages', p1::uuid,false,null, 'net_msgs', 'true', 1);
  perform pg_temp.sees('the other family''s parent also sees it', p2::uuid,false,null, 'net_msgs', 'true', 1);
  -- a grown-up conversation the kid must never see
  perform pg_temp.run('ALLOW parents chat', p1::uuid,false,null, format($q$insert into net_threads values (%L,%L,%L,array[%L,%L]::uuid[],0)$q$, p1||'|'||p2, p1, p2, p1, p2), true);
  perform pg_temp.sees('kid does NOT see the parents'' chat', k1u,false,k1e, 'net_threads', format('tid = %L', p1||'|'||p2), 0);
  perform pg_temp.run('ALLOW kid appears in a room', k1u,false,k1e, format($q$insert into net_presence(id,owner,doc,viewers,at,room) values (%L,%L::uuid,'{"x":1}'::jsonb,'{}',1,'hall')$q$, p1||'_k1', p1), true);
  perform pg_temp.run('DENY kid appears as their sibling', k1u,false,k1e, format($q$insert into net_presence(id,owner,doc,viewers,at,room) values (%L,%L::uuid,'{"x":1}'::jsonb,'{}',1,'hall')$q$, p1||'_k1b', p1), false);
  perform pg_temp.run('ALLOW the other student appears', p2::uuid,false,null, format($q$insert into net_presence(id,owner,doc,viewers,at,room) values (%L,%L::uuid,'{"x":2}'::jsonb,'{}',1,'hall')$q$, p2||'_k2', p2), true);
  perform pg_temp.sees('kid sees the other family''s student at school', k1u,false,k1e, 'net_presence', format('id = %L', p2||'_k2'), 1);
  perform pg_temp.sees('parent sees their child in the room too', p1::uuid,false,null, 'net_presence', format('id = %L', p1||'_k1'), 1);

  -- ---- mail ----
  perform pg_temp.run('ALLOW a grown-up claims an address', p1::uuid,false,null, $q$select mail_claim('mom.rivera','Mrs Rivera')$q$, true);
  perform pg_temp.run('DENY a second address for the same person', p1::uuid,false,null, $q$select mail_claim('another','x')$q$, false);
  perform pg_temp.run('ALLOW the other parent claims one', p2::uuid,false,null, $q$select mail_claim('dad.lee','Mr Lee')$q$, true);
  perform pg_temp.run('DENY a kid cannot claim an address (it comes with the sign-in)', k1u,false,k1e, $q$select mail_claim('mine','x')$q$, false);
  perform pg_temp.run('DENY non-admin makes a staff address', p1::uuid,false,null, $q$select mail_admin_address('ms.okafor','Ms Okafor','staff')$q$, false);
  perform pg_temp.run('ALLOW admin makes a staff address', ad::uuid,false,null, $q$select mail_admin_address('ms.okafor','Ms Okafor','staff')$q$, true);
  perform pg_temp.run('ALLOW admin makes the announcements address', ad::uuid,false,null, $q$select mail_admin_address('news','UNIFY News','system')$q$, true);
  perform pg_temp.run('ALLOW kid writes to their parent', k1u,false,k1e, format($q$select mail_send(%L, array['mom.rivera@unify.mail'], 'Hi', 'Can I stay late?')$q$, k1e), true);
  perform pg_temp.run('ALLOW kid writes to a teacher', k1u,false,k1e, format($q$select mail_send(%L, array['ms.okafor@unify.mail'], 'Question', 'What is due?')$q$, k1e), true);
  perform pg_temp.run('DENY kid writes to another family''s parent', k1u,false,k1e, format($q$select mail_send(%L, array['dad.lee@unify.mail'], 'Hi', 'hello')$q$, k1e), false);
  perform pg_temp.run('ALLOW kid writes to a grade-5 student (both families open)', k1u,false,k1e, format($q$select mail_send(%L, array[%L], 'Hi', 'Want to study?')$q$, k1e, k2e), true);
  perform pg_temp.run('DENY kid sends a link', k1u,false,k1e, format($q$select mail_send(%L, array['ms.okafor@unify.mail'], 'Look', 'see https://example.com')$q$, k1e), false);
  perform pg_temp.run('DENY kid sends an outside email address', k1u,false,k1e, format($q$select mail_send(%L, array['ms.okafor@unify.mail'], 'Look', 'mail me at bob@gmail.com')$q$, k1e), false);
  perform pg_temp.run('ALLOW kid may mention an academy address', k1u,false,k1e, format($q$select mail_send(%L, array['ms.okafor@unify.mail'], 'Look', 'copy ms.okafor@unify.mail')$q$, k1e), true);
  perform pg_temp.run('DENY sending from someone else''s address', p2::uuid,false,null, $q$select mail_send('mom.rivera@unify.mail', array['dad.lee@unify.mail'], 'x', 'x')$q$, false);
  perform pg_temp.run('DENY nobody writes to the announcements address', p1::uuid,false,null, $q$select mail_send('mom.rivera@unify.mail', array['news@unify.mail'], 'x', 'x')$q$, false);
  perform pg_temp.run('ALLOW announcements go to everyone', ad::uuid,false,null, $q$select mail_send('news@unify.mail', array['mom.rivera@unify.mail', 'dad.lee@unify.mail'], 'Welcome', 'Hello academy')$q$, true);
  perform pg_temp.sees('PARENT oversees all of their child''s mail', p1::uuid,false,null, 'mail_messages', format('from_addr = %L', k1e), 4);
  perform pg_temp.sees('a stranger sees no mail', st::uuid,false,null, 'mail_messages', 'true', 0);
  perform pg_temp.run('ALLOW the owner marks mail read', p1::uuid,false,null, $q$update mail_state set read = true where addr = 'mom.rivera@unify.mail'$q$, true);
  perform pg_temp.run('ALLOW the owner trashes a message', p1::uuid,false,null, $q$select mail_move((select msg from mail_state where addr = 'mom.rivera@unify.mail' and folder = 'inbox' limit 1), 'mom.rivera@unify.mail', 'trash')$q$, true);

  -- ---- taking a sign-in away ----
  perform pg_temp.run('ALLOW parent resets the password', p1::uuid,false,null, $q$select kid_login_password('k1','anotherlongone')$q$, true);
  perform pg_temp.run('ALLOW parent removes Kay''s sign-in', p1::uuid,false,null, $q$select kid_login_remove('k1')$q$, true);
  select count(*) into cnt from auth.users where id = k1u;
  insert into pg_temp.res values ('sign-in is really gone', true, cnt = 0, case when cnt = 0 then 'PASS' else 'FAIL' end, null);
  select count(*) into cnt from mail_addresses where addr = k1e;
  insert into pg_temp.res values ('and so is the address', true, cnt = 0, case when cnt = 0 then 'PASS' else 'FAIL' end, null);
  select count(*) into cnt from kids where family = p1::uuid and id = 'k1';
  insert into pg_temp.res values ('but the student and their data stay', true, cnt = 1, case when cnt = 1 then 'PASS' else 'FAIL' end, null);

  select string_agg(verdict||' | '||n||coalesce(' | '||left(err,90),''), E'\n' order by (verdict='FAIL') desc, n) into r from pg_temp.res;
  raise exception E'RESULTS\n%', r;
end $t$;
