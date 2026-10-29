// Isolated PostgreSQL engine. No network and no hosted database credentials.
import { PGlite } from "../work/sql-test/node_modules/@electric-sql/pglite/dist/index.js";
import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite();
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
let functionPrivilegesBefore;
const privileges = () => db.query(`select p.oid::regprocedure::text as name,
 has_function_privilege('anon',p.oid,'EXECUTE') as anon,
 has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated,
 has_function_privilege('service_role',p.oid,'EXECUTE') as service
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname not in ('workspace_notify','eco_activity','eco_space_owner') order by 1`);
for (const file of (await readdir("supabase/migrations"))
  .filter((f) => f.endsWith(".sql"))
  .sort()) {
  try {
    if (file === "20261028000000_harden_workspace_privileges.sql") {
      functionPrivilegesBefore = (await privileges()).rows;
      assert.equal((await db.query("select has_table_privilege('anon','public.notifications','TRUNCATE') as allowed")).rows[0].allowed, true);
      assert.equal((await db.query("select has_function_privilege('anon','public.workspace_notify(uuid,text,text,text,uuid,text,text)','EXECUTE') as allowed")).rows[0].allowed, true);
    }
    await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    if (file === "20261028000000_harden_workspace_privileges.sql") assert.deepEqual((await privileges()).rows, functionPrivilegesBefore, "Hardening preserves all other RPC grants");
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
const privilegesAfterAllMigrations = (await privileges()).rows;
for (const role of ["anon", "authenticated"]) {
  for (const signature of ["workspace_notify(uuid,text,text,text,uuid,text,text)", "eco_activity(text,uuid,text)", "eco_space_owner(text,uuid)"]) {
    assert.equal((await db.query("select has_function_privilege($1,$2,'EXECUTE') as allowed", [role, 'public.'+signature])).rows[0].allowed, false);
    assert.equal((await db.query("select has_function_privilege('service_role',$1,'EXECUTE') as allowed", ['public.'+signature])).rows[0].allowed, true);
  }
  assert.equal((await db.query("select count(*)::int as n from pg_tables where schemaname='public' and has_table_privilege($1,quote_ident(schemaname)||'.'||quote_ident(tablename),'TRUNCATE')",[role])).rows[0].n,0);
  assert.equal((await db.query("select has_table_privilege($1,'public.notifications','UPDATE') as allowed",[role])).rows[0].allowed,false);
  const cols=(await db.query("select column_name from information_schema.columns where table_schema='public' and table_name='notifications' and has_column_privilege($1,'public.notifications',column_name,'UPDATE') order by column_name",[role])).rows;
  assert.deepEqual(cols,role==='authenticated' ? [{column_name:'read_at'}] : []);
}
// Privilege changes are idempotent; no wider RPC changes on a second local run.
await db.exec(await readFile('supabase/migrations/20261028000000_harden_workspace_privileges.sql','utf8'));
assert.deepEqual((await privileges()).rows,privilegesAfterAllMigrations);
console.log('PASS: hosted-style default grants corrected; other RPC ACLs and service helper access preserved; migration idempotent.');

const ids = Array.from(
  { length: 5 },
  (_, i) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
);
const [student, other, employer, lead] = ids;
await db.query(
  `insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) select x::uuid, 'user'||n||'@example.test',now(),jsonb_build_object('role',case n when 3 then 'company' when 5 then 'mentor' else 'student' end,'full_name','Test User') from unnest($1::text[]) with ordinality t(x,n)`,
  [ids],
);
await db.exec(
  `update profiles set account_status='active',onboarding_completed=true;`,
);
// Seed fixtures as database owner, never into the application database.
await db.query(
  `insert into student_details(profile_id,skills,interests) values($1,array['python'],'{}'),($2,array['java'],'{}')`,
  [student, other],
);
const scalar = async (sql, args = []) =>
  Object.values((await db.query(sql, args)).rows[0])[0];
const as = async (id) => {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
};
const rejects = async (sql, args = []) =>
  assert.rejects(() => db.query(sql, args));
await as(lead);
const community = await scalar(
  "select create_community('Python builders','python-builders','Build together')",
);
const privateCommunity = await scalar(
  "select create_community('Private team','private-team','Invite only')",
);
const project = await scalar(
  "select create_project('Python project','python-project','Build together')",
);
await db.query("update communities set visibility='private',join_policy='invite_only' where id=$1", [
  privateCommunity,
]);
await as(student);
await db.query("select workspace_join('communities',$1)", [community]);
await rejects("select workspace_join('communities',$1)", [community]);
await rejects("select workspace_join('communities',$1)", [privateCommunity]);
await as(lead);
await db.query(
  "select workspace_invite('communities',$1,'user1@example.test')",
  [privateCommunity],
);
await as(other);
assert.equal(
  await scalar("select count(*) from communities where id=$1", [
    privateCommunity,
  ]),
  0,
);
await rejects("select workspace_join('communities',$1)", [privateCommunity]);
await as(student);
assert.equal(
  await scalar("select count(*) from communities where id=$1", [
    privateCommunity,
  ]),
  1,
);
const privateInvite=await scalar("select id from workspace_invitations where entity_id=$1 and status='pending'",[privateCommunity]);
await db.query("select eco_invitation_decide($1,true)",[privateInvite]);
await as(lead);await db.query("update projects set visibility='public',join_policy='open_join' where id=$1",[project]);
await as(student);await db.query("select workspace_join('projects',$1)",[project]);
await as(lead);
const post = await scalar(
  "select workspace_post($1,'Hello Python',null,null,$2::uuid[])",
  [community, [student]],
);
await as(student);
const mention = await scalar(
  "select action_url from notifications where type='community_mention'",
);
assert.ok(mention.endsWith(`#post-${post}`));
await db.query("select workspace_post($1,'A reply',$2)", [community, post]);
await as(other);
assert.equal(await scalar("select count(*) from notifications"), 0);
await rejects("select workspace_post($1,'Forbidden',$2)", [community, post]);
await rejects(
  "select workspace_notify($1,'x','x','projects',$2,'/dashboard/projects','bad')",
  [student, project],
);
await db.exec("reset role");
await db.query("select set_config('request.jwt.claim.sub','',false)");
const org = await scalar(
  "insert into organizations(name,type,created_by) values('Test Company','company',$1) returning id",
  [employer],
);
await as(employer);
const opportunity = await scalar(
  "select workspace_publish('opportunities',$1::jsonb)",
  [
    JSON.stringify({
      title: "Python internship",
      status:"published",
      description: "Learn Python",
      organization_id: org,
      type: "internship",
      location: "Remote",
      work_mode: "remote",
      experience: "fresher",
      duration: "3 months",
      tags: ["python"],
      interests: [],
      roles: [],
      deadline: "2099-01-01T00:00:00Z",
    }),
  ],
);
await as(student);
const application = await scalar("select workspace_apply($1)", [opportunity]);
await rejects("select workspace_apply($1)", [opportunity]);
assert.equal(
  await scalar(
    "select count(*) from application_history where application_id=$1",
    [application],
  ),
  1,
);
await rejects("select workspace_application_status($1,'selected')", [
  application,
]);
await as(other);
assert.equal(
  await scalar("select count(*) from applications where id=$1", [application]),
  0,
);
await rejects("select workspace_application_status($1,'shortlisted')", [
  application,
]);
await as(employer);
await db.query(
  "select workspace_application_status($1,'shortlisted','Next interview')",
  [application],
);
await as(student);
assert.equal(
  await scalar(
    "select count(*) from application_history where application_id=$1",
    [application],
  ),
  2,
);
assert.equal(
  await scalar(
    "select count(*) from notifications where type='application_status_changed'",
  ),
  1,
);
await db.query("update notifications set read_at=now()");
assert.equal(
  await scalar("select count(*) from notifications where read_at is null"),
  0,
);
await rejects("update notifications set title='tampered'");
await as(lead);
const event = await scalar("select workspace_publish('events',$1::jsonb)", [
  JSON.stringify({
    title: "Python workshop",
    status:"published",
    description: "Learn together",
    community_id: community,
    category: "workshop",
    mode: "online",
    location: "Online",
    starts_at: "2099-01-02T00:00:00Z",
    ends_at: "2099-01-02T02:00:00Z",
    deadline: "2099-01-01T00:00:00Z",
    tags: ["python"],
  }),
]);
await as(student);
assert.equal(
  await scalar(
    "select count(*) from notifications where type='event_published'",
  ),
  1,
);
await db.query("select workspace_register($1,true)", [event]);
await rejects("select workspace_register($1,true)", [event]);
await as(other);
await rejects("select workspace_register($1,true)", [event]);
await db.exec("reset role");
const task = await scalar(
  "insert into project_tasks(project_id,title,assignee_id) values($1,'Build API',$2) returning id",
  [project, student],
);
await as(other);
await rejects("select workspace_task($1,'done')", [task]);
await as(student);
await db.query("select workspace_task($1,'done')", [task]);
assert.equal(
  await scalar("select count(*) from project_activity where project_id=$1 and message like 'Task status changed to done:%'", [
    project,
  ]),
  1,
);
await db.query("select update_student_workspace_profile($1::jsonb)", [
  JSON.stringify({
    full_name: "Python Student",
    skills: ["Python", " python"],
    interests: ["AI"],
    preferred_roles: ["engineer"],
  }),
]);
assert.deepEqual(
  await scalar("select skills from student_details where profile_id=$1", [
    student,
  ]),
  ["python"],
);
await db.exec("reset role");
await db.query(
  "update opportunities set deadline=now()-interval '1 day' where id=$1",
  [opportunity],
);
await as(other);
await rejects("select workspace_apply($1)", [opportunity]);
await as(employer);
await rejects("select workspace_apply($1)", [opportunity]);
await as(student);
const newProject = await scalar(
  "select workspace_create('projects',$1::jsonb)",
  [
    JSON.stringify({
      title: "Student project",
      slug: "student-project",
      description: "A real transaction",
      tags: ["Python", "python"],
    }),
  ],
);
assert.equal(await scalar("select is_project_head($1)", [newProject]), true);
const newTask = await scalar("select workspace_resource('task',$1,$2::jsonb)", [
  newProject,
  JSON.stringify({
    title: "Finish draft",
    assignee_id: student,
    deadline: new Date(Date.now() + 3600000).toISOString(),
  }),
]);
await rejects("select workspace_resource('task',$1,$2::jsonb)", [
  newProject,
  JSON.stringify({ title: "Invalid assignee", assignee_id: other }),
]);
await db.query("select workspace_refresh_reminders()");
await db.query("select workspace_refresh_reminders()");
assert.equal(
  await scalar(
    "select count(*) from notifications where type='deadline_reminder' and source_entity_id=$1",
    [newProject],
  ),
  1,
);
await as(other);
assert.equal(
  await scalar("select count(*) from student_details where profile_id=$1", [
    student,
  ]),
  0,
);
await rejects("select workspace_resource('file',$1,$2::jsonb)", [
  newProject,
  JSON.stringify({
    title: "Forbidden reference",
    url: "https://example.test/file",
  }),
]);
await rejects("select workspace_task($1,'done')", [newTask]);
await as(student);
await db.query("select workspace_resource('file',$1,$2::jsonb)", [
  newProject,
  JSON.stringify({ title: "Team reference", url: "https://example.test/file" }),
]);
await db.query(
  "insert into storage.objects(bucket_id,name) values('student-resumes',$1)",
  [student + "/resume.pdf"],
);
await rejects(
  "insert into storage.objects(bucket_id,name) values('student-resumes',$1)",
  [other + "/forbidden.pdf"],
);
await as(other);
assert.equal(
  await scalar(
    "select count(*) from storage.objects where bucket_id='student-resumes'",
  ),
  0,
);
console.log(
  "PASS: apply/timeline/status permissions; joins/invitations; recipient isolation/deep links/read; events/register; task ownership; profile normalization; expiry; wrong role.",
);
await db.exec('reset role');
await db.query("select set_config('request.jwt.claim.sub','',false)");
await db.exec(await readFile('tests/profile-access.sql','utf8'));
console.log('PASS: existing profile-access SQL regression test.');
// Direct helper calls fail for both API roles, while earlier full flows proved nested calls.
for (const role of ['anon','authenticated']) {
 await db.exec('reset role');
 await db.exec('set role '+role);
 await rejects("select workspace_notify(null,'x','x','projects',null,'/dashboard/projects','x')");
 await rejects("select eco_activity('projects',null,'x')");
 await rejects("select eco_space_owner('projects',null)");
}
await as(student);
const owned = (await db.query('select id from notifications limit 1')).rows[0];
assert.ok(owned);
assert.equal((await db.query('update notifications set read_at=now() where id=$1 returning id',[owned.id])).rows.length,1);
await db.query('update notifications set read_at=now() where recipient_user_id=$1 and read_at is null',[student]);
await rejects("update notifications set recipient_user_id=$1",[other]);
await rejects("update notifications set metadata='{}'::jsonb");
await as(other);
assert.equal((await db.query('update notifications set read_at=now() where id=$1 returning id',[owned.id])).rows.length,0);
console.log('PASS: direct helper denial; mark-one/mark-all retained; content/recipient updates denied; other recipients isolated.');
await db.exec('reset role');
await db.exec(await readFile('scripts/verify-workspace-privileges.sql','utf8'));
console.log('PASS: post-deployment verification SQL executes read-only locally.');
await db.close();
