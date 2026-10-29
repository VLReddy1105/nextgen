process.on("uncaughtException", e => { console.error(e.message, e.query || "", e.where || "", e.stack?.split("\n").filter(l=>l.includes("mentor-affiliations-database"))); process.exit(1); });
// Isolated PostgreSQL engine. No network and no hosted database credentials.
import { PGlite } from "../work/sql-test/node_modules/@electric-sql/pglite/dist/index.js";
import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite();
const legacyOwner=crypto.randomUUID(), legacyOrganization=crypto.randomUUID(), legacyOpportunity=crypto.randomUUID();
await db.exec(`
 create role anon; create role authenticated; create role service_role bypassrls;
 -- Simulate the broad hosted defaults that bare-role tests previously missed.
 alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
 alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
 create schema auth; create schema storage;
 create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth,public,storage to authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner uuid);
 alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1,'/') $$;
 grant all on storage.objects to authenticated;
`);
for (const file of (await readdir("supabase/migrations"))
  .filter((f) => f.endsWith(".sql"))
  .sort()) {
  try {
    if(file === '20261029000000_mentor_affiliations.sql') {
      assert.equal((await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql') && f<file).length,24);
      for(const name of ['mentor_profiles','mentor_connections','mentor_sessions','organizations','projects','project_members','university_student_memberships','opportunities','applications','application_history']) assert.ok((await db.query('select to_regclass($1) as object',['public.'+name])).rows[0].object,name);
      for(const signature of ['set_updated_at()','workspace_ready(text)','workspace_notify(uuid,text,text,text,uuid,text,text)']) assert.ok((await db.query('select to_regprocedure($1) as object',['public.'+signature])).rows[0].object,signature);
      await db.query("insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,'legacy-company@example.test',now(),'{\"role\":\"company\",\"full_name\":\"Legacy Company Owner\"}')",[legacyOwner]);
      await db.query("insert into organizations(id,name,type,created_by,official_account) values($1,'Legacy Company','company',$2,true)",[legacyOrganization,legacyOwner]);
      await db.query("insert into opportunities(id,title,organization_id,created_by,type,work_mode,deadline,status) values($1,'Existing Student opening',$2,$3,'internship','remote','2099-01-01','published')",[legacyOpportunity,legacyOrganization,legacyOwner]);
      assert.equal((await db.query("select count(*)::int n from pg_policies where schemaname='public' and tablename='opportunities' and policyname='opportunities_read'")).rows[0].n,1);
      assert.deepEqual((await db.query("select enumlabel from pg_enum where enumtypid='public.primary_account_role'::regtype order by enumsortorder")).rows.map(r=>r.enumlabel),['student','founder','university','company','mentor']);
    }
    await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
  } catch (error) {
    console.error(
      "Migration failed:",
      file,
      error.message,
      error.internalQuery,
      error.where,
    );
    process.exitCode = 1;
    await db.close();
    process.exit(1);
  }
}
console.log(
  "All historical and workspace migrations applied to isolated PostgreSQL.",
);

assert.deepEqual((await db.query("select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosrc like '%eco_scope_allowed(%' order by proname")).rows.map(r=>r.proname), ['eco_membership_scope','eco_portfolio_projects','mentor_org_student','workspace_member']);
console.log('Audited transitive workspace_member RPCs:',(await db.query("select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosrc like '%workspace_member(%' order by proname")).rows.map(r=>r.proname).join(', '));
const scalar = async (sql, args = []) =>
  Object.values((await db.query(sql, args)).rows[0])[0];
const as = async (id) => {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
};
const denied = async (sql, args = []) =>
  assert.rejects(() => db.query(sql, args));

const [mentor,mentor2,company,company2,university,student,outsider,founder] = Array.from({length:8},(_,i)=>i===2 ? legacyOwner : crypto.randomUUID());
for (const [id,role] of [[mentor,'mentor'],[mentor2,'mentor'],[company,'company'],[company2,'company'],[university,'university'],[student,'student'],[outsider,'student'],[founder,'founder']]) {
  await db.query("insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,$2,now(),$3::jsonb) on conflict(id) do nothing",[id,id+'@example.test',JSON.stringify({role,full_name:role+' '+id})]);
}
await db.exec("update profiles set account_status='active',onboarding_completed=true");
await db.query("insert into mentor_profiles(user_id,headline,bio,skills,expertise) values($1,'Engineer','Mentor bio',array['python'],array['backend']),($2,'Teacher','Mentor two',array['python'],array['backend'])",[mentor,mentor2]);
const org=legacyOrganization;
await scalar("insert into organizations(name,type,created_by,official_account,verified) values('Company Two','company',$1,true,false) returning id",[company2]);
const uni=await scalar("insert into organizations(name,type,created_by,official_account,verified) values('University One','university',$1,true,true) returning id",[university]);
await db.exec("alter table mentor_profiles add column audit_private_canary text default 'never expose'");
const safeKeys=['availability_status','bio','expertise','headline','skills','years_experience'].sort();
const readHub=()=>scalar("select eco_mentor_hub()");
const request=(org,id=null)=>scalar("select eco_mentor_affiliation_request($1,$2)",[org,id]);
const decide=(id,action)=>scalar("select eco_mentor_affiliation_decide($1,$2)",[id,action]);
const publicFunctions=['workspace_apply(uuid)','eco_opportunity_save(jsonb,uuid)','workspace_application_status(uuid,text,text,timestamp with time zone)','eco_mentor_affiliation_request(uuid,uuid)','eco_mentor_affiliation_decide(uuid,text)','eco_mentor_badges(uuid[])','eco_mentor_session_scoped(uuid,uuid,text,timestamp with time zone,text)','eco_mentor_hub()'];
const privateFunctions=['eco_scope_allowed(text,uuid,uuid)','mentor_org_manager(uuid)','mentor_org_valid(uuid)','mentor_active(uuid)','mentor_org_student(uuid,uuid,uuid)','mentor_audience_guard()','workspace_notify(uuid,text,text,text,uuid,text,text)','eco_activity(text,uuid,text)','eco_space_owner(text,uuid)'];
for (const f of [...publicFunctions,...privateFunctions]) {
  assert.equal(await scalar("select has_function_privilege('anon',$1,'EXECUTE')",['public.'+f]),false,f);
  assert.equal(await scalar("select has_function_privilege('authenticated',$1,'EXECUTE')",['public.'+f]),publicFunctions.includes(f),f);
}
assert.equal(await scalar("select count(*)::int from pg_proc where proname like 'mentor_%' and (not prosecdef or proconfig is distinct from array['search_path=\"\"'])"),0);
assert.equal(await scalar("select count(*)::int from pg_tables where schemaname='public' and (has_table_privilege('anon',quote_ident(schemaname)||'.'||quote_ident(tablename),'TRUNCATE') or has_table_privilege('authenticated',quote_ident(schemaname)||'.'||quote_ident(tablename),'TRUNCATE'))"),0);
await as(mentor);
assert.equal((await readHub()).context,'independent');
await denied("insert into mentor_affiliations(mentor_user_id,organization_id,requested_by) values($1,$2,$1)",[mentor,org]);
for (const f of ['mentor_active($1)','mentor_org_manager($1)']) await denied('select '+f,[mentor]);
const first=await request(uni);
assert.equal((await readHub()).context,'independent');
assert.equal((await scalar('select eco_mentor_badges($1::uuid[])',[[mentor]])).length,0);
await assert.rejects(()=>request(uni));
await assert.rejects(()=>decide(first,'accept'));
await as(company);
await assert.rejects(()=>decide(first,'accept'));
assert.equal(await scalar('select count(*) from mentor_affiliations'),0);
assert.equal((await readHub()).affiliations.length,0);
await as(student);
await assert.rejects(()=>request(uni));
await assert.rejects(()=>readHub());
assert.equal(await scalar('select count(*) from mentor_affiliations'),0);
await as(university);
assert.equal((await readHub()).affiliations[0].profile.headline,'Engineer');
assert.deepEqual(Object.keys((await readHub()).affiliations[0].profile).sort(),safeKeys);
await decide(first,'accept');
await assert.rejects(()=>decide(first,'accept'));
await as(student);
const badge=(await scalar('select eco_mentor_badges($1::uuid[])',[[mentor]]))[0];
assert.equal(badge.organization_name,'University One');
assert.equal(badge.context,'university');
await as(mentor);
assert.equal((await readHub()).context,'university');
assert.equal(await scalar('select primary_role::text from profiles where id=$1',[mentor]),'mentor');
await assert.rejects(()=>request(org));
await decide(first,'end');
assert.equal((await readHub()).context,'independent');
await as(university);
const uniInvite=await request(uni,mentor);
await assert.rejects(()=>decide(uniInvite,'accept'));
await as(mentor);
await decide(uniInvite,'reject');
const cancelled=await request(org);
await decide(cancelled,'cancel');
const companyRequest=await request(org);
await as(company);
await decide(companyRequest,'accept');
await decide(companyRequest,'end');
const invite=await request(org,mentor), competing=await request(org,mentor2);
await as(university);
const competing2=await request(uni,mentor2);
await as(mentor2);
await decide(competing,'accept');
await assert.rejects(()=>decide(competing2,'accept'));
await decide(competing,'end');
await decide(competing2,'reject');
await as(mentor);
await decide(invite,'accept');
await decide(invite,'end');
console.log('PASS affiliation consent both directions/company/university, rejection/cancellation/end, independent context, badges, duplicate and one-active constraints, unchanged primary role, private RLS/ACLs.');

await as(company);
const opening={audience:'mentor',organization_id:org,title:'Python Mentor',description:'Guide students on real Python projects',tags:['python'],deadline:'2099-01-01T12:00:00Z',work_mode:'remote',experience:'2+',status:'published',type:'project'};
const opportunity=await scalar('select eco_opportunity_save($1::jsonb)',[JSON.stringify(opening)]);
const studentOpportunity=legacyOpportunity;
assert.equal(await scalar('select audience from opportunities where id=$1',[studentOpportunity]),'student','Pre-existing opportunity defaults to Student during migration');
const {audience: omittedAudience, ...legacyPayload}=opening;
assert.equal(omittedAudience,'mentor');
const defaultOpportunity=await scalar('select eco_opportunity_save($1::jsonb)',[JSON.stringify({...legacyPayload,title:'Default Student opening'})]);
assert.equal(await scalar('select audience from opportunities where id=$1',[defaultOpportunity]),'student','Existing caller without audience remains Student');
await denied('select eco_opportunity_save($1::jsonb,$2)',[JSON.stringify({...opening,audience:'student'}),opportunity]);
await as(student);
await denied('select workspace_apply($1)',[opportunity]);
assert.equal(await scalar('select count(*) from opportunities where id=$1',[opportunity]),0);
assert.equal(await scalar('select count(*) from opportunities where id=$1',[studentOpportunity]),1);
const studentApplication=await scalar('select workspace_apply($1)',[studentOpportunity]);
await as(founder);
await denied('select workspace_apply($1)',[opportunity]);
await denied('select eco_opportunity_save($1::jsonb)',[JSON.stringify(opening)]);
await as(company2);
await denied('select eco_opportunity_save($1::jsonb)',[JSON.stringify(opening)]);
await as(mentor);
await denied('select workspace_apply($1)',[studentOpportunity]);
const application=await scalar('select workspace_apply($1)',[opportunity]);
await denied('select workspace_apply($1)',[opportunity]);
assert.equal((await readHub()).applications[0].mentor_profile.headline,'Engineer');
assert.deepEqual(Object.keys((await readHub()).applications[0].mentor_profile).sort(),safeKeys);
assert.equal((await readHub()).context,'independent');
await as(company2);
await denied("select workspace_application_status($1,'selected')",[application]);
assert.equal((await readHub()).applications.length,0);
await as(company);
await scalar("select workspace_application_status($1,'shortlisted','Good match')",[application]);
await scalar("select workspace_application_status($1,'selected','Invitation to follow')",[application]);
await denied("select workspace_application_status($1,'selected')",[application]);
assert.equal((await readHub()).applications[0].history.length,3);
const afterSelected=await request(org,mentor);
await as(mentor);
assert.equal((await readHub()).context,'independent');
assert.equal((await scalar('select eco_mentor_badges($1::uuid[])',[[mentor]])).length,0);
await decide(afterSelected,'accept');
assert.equal((await readHub()).context,'company');
const notices=(await db.query("select * from notifications where recipient_user_id=$1",[mentor])).rows;
assert.ok(notices.some(n=>n.title==='Application update: selected' && n.action_url==='/dashboard/mentor-opportunities'));
assert.ok(notices.some(n=>n.type==='mentor_affiliation'));
assert.equal(new Set(notices.map(n=>n.event_key)).size,notices.length);
await decide(afterSelected,'end');
await as(mentor2);
const application2=await scalar('select workspace_apply($1)',[opportunity]);
await scalar("select workspace_application_status($1,'withdrawn')",[application2]);
await as(company);
assert.equal(await scalar('select count(*) from applications where id=$1',[studentApplication]),1);
await scalar("select workspace_application_status($1,'reviewed')",[studentApplication]);
await as(student);
assert.equal(await scalar('select status from applications where id=$1',[studentApplication]),'reviewed');
assert.equal(await scalar("select count(*) from notifications where source_entity_id=$1 and title='Application update: reviewed' and action_url=$2",[studentApplication,'/dashboard/applications/'+studentApplication]),1);
console.log('PASS constrained Mentor audience, Student regression, profile-based applications, private organization review, selection without affiliation, explicit consent invitation, status/history/notifications and withdrawal.');

// Shared university projects and sessions are scoped; no historical session backfill.
await as(mentor);
const scoped=await request(uni);
await as(university); await decide(scoped,'accept');
await db.exec('reset role');
await db.query("insert into university_student_memberships(university_id,student_user_id,status) values($1,$2,'active')",[uni,student]);
await db.query("insert into mentor_connections(student_id,mentor_id,status) values($1,$2,'accepted'),($3,$2,'accepted')",[student,mentor,outsider]);
await as(mentor);
const privateSession=await scalar("select eco_mentor_session($1,'Private session','2099-01-01','https://example.test')",[student]);
await denied("select eco_mentor_session_scoped($1,$2,'Unrelated','2099-01-01','https://example.test')",[uni,outsider]);
const sharedSession=await scalar("select eco_mentor_session_scoped($1,$2,'Shared session','2099-01-01','https://example.test')",[uni,student]);
assert.equal(await scalar('select organization_id from mentor_sessions where id=$1',[privateSession]),null);
assert.equal(await scalar('select organization_id from mentor_sessions where id=$1',[sharedSession]),uni);
await as(university);
let progress=(await readHub()).affiliations.find(a=>a.id===scoped).progress;
assert.equal(progress.mentees,1);
assert.equal(progress.upcoming_sessions,1);
assert.equal(await scalar('select count(*) from mentor_sessions'),0,'Org sees scoped aggregate, no private session rows');
const project=await scalar("select eco_space_save('projects',$1::jsonb)",[JSON.stringify({title:'Campus Python',slug:'campus-python',description:'Campus project',short_description:'Campus mentoring project',category:'Web Development',owner_type:'university',tags:['python'],visibility:'private',join_policy:'invite_only',organization_id:uni,university_id:uni})]);
const community=await scalar("select eco_space_save('communities',$1::jsonb)",[JSON.stringify({name:'Campus community',title:'Campus community',slug:'campus-community-audit',description:'Private campus resources',short_description:'Campus resources',category:'Web Development',tags:['python'],visibility:'university_scoped',join_policy:'invite_only',organization_id:uni})]);
await db.exec('reset role');
await db.query("insert into project_tasks(project_id,title) values($1,'Protected task')",[project]);
await db.query("insert into community_resources(community_id,title,url) values($1,'Protected resource','https://example.test/private')",[community]);
await db.query("insert into student_details(profile_id,skills) values($1,array['private-skill'])",[student]);
await as(mentor);
assert.equal(await scalar("select workspace_member('communities',$1)",[community]),false);
assert.equal(await scalar("select eco_manager('communities',$1)",[community]),false);
assert.equal(await scalar("select eco_manager('projects',$1)",[project]),false);
assert.equal(await scalar('select count(*) from project_tasks where project_id=$1',[project]),0);
assert.equal(await scalar('select count(*) from community_resources where community_id=$1',[community]),0);
await denied("select workspace_join('communities',$1)",[community]);
await denied("select workspace_post($1,'Unauthorized content')",[community]);
assert.equal(await scalar('select count(*) from student_details where profile_id=$1',[student]),0);
await as(university);
const projectInvite=await scalar("select eco_invite('projects',$1,$2)",[project,mentor+'@example.test']);
await as(mentor);
assert.equal(await scalar("select workspace_member('projects',$1)",[project]),false,'Affiliation does not add project membership');
await scalar('select eco_invitation_decide($1,true)',[projectInvite]);
assert.equal(await scalar("select workspace_member('projects',$1)",[project]),true);
await as(university);
progress=(await readHub()).affiliations.find(a=>a.id===scoped).progress;
assert.ok(progress.projects.some(p=>p.id===project));
await as(company2);
assert.equal((await readHub()).affiliations.length,0);
await as(mentor);
await decide(scoped,'end');
assert.equal(await scalar("select workspace_member('projects',$1)",[project]),false,'Ended affiliation revokes campus prerequisite');
await denied("select eco_mentor_session_scoped($1,$2,'After end','2099-01-01','https://example.test')",[uni,student]);
assert.equal((await readHub()).affiliations.find(a=>a.id===scoped).progress,null);
await db.exec('reset role');
await db.query("select set_config('request.jwt.claim.sub','',false)");
await db.exec('set role anon');
await denied('select eco_mentor_hub()');
await denied('select * from mentor_affiliations');
console.log('PASS scoped mentee/project/session progress, no historical-session disclosure, project consent, campus access revocation, anonymous denial.');
await db.exec('reset role');
await db.exec(await readFile('scripts/verify-mentor-affiliations.sql','utf8'));
console.log('PASS read-only post-deployment metadata verification script in isolated database.');
await db.close();
