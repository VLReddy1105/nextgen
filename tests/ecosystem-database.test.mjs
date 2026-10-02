// Isolated PostgreSQL engine. No network and no hosted database credentials.
import { PGlite } from "../work/sql-test/node_modules/@electric-sql/pglite/dist/index.js";
import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite();
await db.exec(`
 create role anon; create role authenticated; create role service_role bypassrls;
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

const scalar = async (sql, args = []) =>
  Object.values((await db.query(sql, args)).rows[0])[0];
const as = async (id) => {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
};
const denied = async (sql, args = []) =>
  assert.rejects(() => db.query(sql, args));
const a = crypto.randomUUID(),
  b = crypto.randomUUID(),
  c = crypto.randomUUID();
for (const [id, email] of [
  [a, "a@example.test"],
  [b, "b@example.test"],
  [c, "c@example.test"],
])
  await db.query(
    "insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,$2,now(),$3::jsonb)",
    [id, email, JSON.stringify({ role: "student", full_name: email })],
  );
await db.exec(
  "update profiles set account_status='active',onboarding_completed=true",
);
await as(a);
const draft = {
  title: "Private Python project",
  slug: "private-python",
  short_description: "Build Python together",
  description: "Detailed work",
  tags: ["Python"],
  category: "Web Development",
  visibility: "private",
  join_policy: "invite_only",
};
const project = await scalar("select eco_space_save('projects',$1::jsonb)", [
  JSON.stringify(draft),
]);
const invitation = await scalar(
  "select eco_invite('projects',$1,'b@example.test')",
  [project],
);
assert.equal(
  await scalar("select count(*) from project_members where project_id=$1", [
    project,
  ]),
  1,
);
await as(c);
assert.equal(
  await scalar("select count(*) from projects where id=$1", [project]),
  0,
);
await denied("select eco_invitation_decide($1,true)", [invitation]);
await as(b);
assert.equal(
  await scalar("select count(*) from projects where id=$1", [project]),
  1,
);
await denied("select workspace_join('projects',$1)", [project]);
await db.query("select eco_invitation_decide($1,true)", [invitation]);
assert.equal(
  await scalar("select workspace_member('projects',$1)", [project]),
  true,
);
await denied("select eco_invitation_decide($1,true)", [invitation]);
await denied("select assign_project_member($1,$2,'project_head')", [
  project,
  b,
]);
await as(a);
await db.query("select eco_space_save('projects',$1::jsonb,$2)", [
  JSON.stringify({
    ...draft,
    visibility: "public",
    join_policy: "request_to_join",
  }),
  project,
]);
await as(c);
assert.equal(
  await scalar("select count(*) from projects where id=$1", [project]),
  1,
);
assert.equal(
  await scalar("select count(*) from project_tasks where project_id=$1", [
    project,
  ]),
  0,
);
const request = await scalar("select eco_join_request('projects',$1)", [
  project,
]);
await as(a);
await db.query("select eco_request_decide($1,true)", [request]);
await as(c);
assert.equal(
  await scalar("select workspace_member('projects',$1)", [project]),
  true,
);
await db.query("select eco_member_remove('projects',$1,$2)", [project, c]);
await as(a);
const token = "GZ-PROJ-" + crypto.randomUUID() + crypto.randomUUID();
const hash = await scalar(
  "select encode(sha256(convert_to($1,'UTF8')),'hex')",
  [token],
);
const code = await scalar("select eco_code_create($1,$2,7,1)", [project, hash]);
await as(c);
assert.equal(
  (await scalar("select eco_code_preview($1)", [token])).id,
  project,
);
assert.equal(await scalar("select eco_code_accept($1)", [token]), project);
await denied("select eco_code_accept($1)", [token]);
await as(a);
await db.query("select eco_code_revoke($1)", [code]);
await as(b);
await denied("select eco_code_preview($1)", [token]);
console.log(
  "PASS: migration load; private summary isolation; explicit consent; no silent membership; join policies; code preview/accept/use limits/revoke.",
);
await db.exec("reset role");
const university = crypto.randomUUID();
await db.query("select set_config('request.jwt.claim.sub','',false)");
await db.query(
  "insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,'university@example.test',now(),$2::jsonb)",
  [
    university,
    JSON.stringify({ role: "university", full_name: "University manager" }),
  ],
);
await db.query(
  "update profiles set account_status='active',onboarding_completed=true,primary_role='university' where id=$1",
  [university],
);
const campus = await scalar(
  "insert into organizations(name,type,created_by,official_account,verified) values('Test University','university',$1,true,true) returning id",
  [university],
);
await as(university);
assert.equal(
  await scalar("select enroll_university_student($1,'a@example.test',$2)", [
    campus,
    "a".repeat(64),
  ]),
  "invited",
);
assert.equal(
  await scalar(
    "select count(*) from university_student_memberships where university_id=$1",
    [campus],
  ),
  0,
  "Inviting an existing student MUST NOT enroll them",
);
await as(a);
const campusInvitation = (await scalar("select eco_campus_invitations()"))[0];
await db.query("select eco_campus_invitation_decide($1,true)", [
  campusInvitation.id,
]);
assert.equal(
  await scalar(
    "select count(*) from university_student_memberships where university_id=$1 and status='active'",
    [campus],
  ),
  1,
);
await as(university);
await db.query("select eco_domain_save($1,'example.test',false)", [campus]);
await as(b);
await denied("select eco_university_connect($1)", [campus]);
await db.exec("reset role");
await db.query(
  "update university_domains set approved_at=now() where university_id=$1",
  [campus],
);
await as(b);
assert.equal(
  await scalar("select eco_university_connect($1)", [campus]),
  "requested",
);
assert.equal(
  await scalar(
    "select count(*) from university_student_memberships where student_user_id=$1",
    [b],
  ),
  0,
);
await as(university);
const campusRequest = await scalar(
  "select id from university_connection_requests where student_id=$1",
  [b],
);
await db.query("select eco_university_decide($1,true)", [campusRequest]);
const progress = await scalar("select eco_campus_progress($1)", [campus]);
assert.equal(progress.length, 2);
assert.ok(!JSON.stringify(progress).includes("resume"));
assert.ok(!JSON.stringify(progress).includes("linkedin"));
console.log(
  "PASS: university invitation creates zero membership until acceptance; unapproved domain blocked; request needs manager approval; institutional projection is limited.",
);
// Company lifecycle, campus eligibility/capacity, and mentorship share the same records.
await db.exec("reset role");
await db.query("select set_config('request.jwt.claim.sub','',false)");
const company = crypto.randomUUID(),
  mentor = crypto.randomUUID();
for (const [id, role] of [
  [company, "company"],
  [mentor, "mentor"],
]) {
  await db.query(
    "insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,$2,now(),$3::jsonb)",
    [id, role + "@example.test", JSON.stringify({ role, full_name: role })],
  );
  await db.query(
    "update profiles set primary_role=$2::primary_account_role,account_status='active',onboarding_completed=true where id=$1",
    [id, role],
  );
}
const companyOrg = await scalar(
  "insert into organizations(name,type,created_by) values('Test Company','company',$1) returning id",
  [company],
);
await db.query(
  "insert into student_details(profile_id,skills,degree_level,field_of_study) values($1,array['python'],'Bachelor','Computer Science'),($2,array['java'],'Bachelor','Computer Science')",
  [a, b],
);
await as(company);
const posting = {
  title: "Python Backend Internship",
  description: "Build a Python API with the team",
  organization_id: companyOrg,
  type: "internship",
  tags: ["Python", "Django"],
  nice_to_have: [],
  interests: [],
  roles: [],
  location: "",
  work_mode: "remote",
  experience: "fresher",
  duration: "3 months",
  deadline: "2099-01-01T00:00:00Z",
  status: "draft",
  openings: 2,
  eligibility: {},
};
const opportunity = await scalar("select eco_opportunity_save($1::jsonb)", [
  JSON.stringify(posting),
]);
await as(a);
assert.equal(
  await scalar("select count(*) from opportunities where id=$1", [opportunity]),
  0,
);
await denied("select workspace_apply($1)", [opportunity]);
await as(company);
await db.query("select eco_opportunity_save($1::jsonb,$2)", [
  JSON.stringify({ ...posting, status: "published" }),
  opportunity,
]);
await as(a);
assert.equal(
  await scalar("select count(*) from opportunities where id=$1", [opportunity]),
  1,
);
const application = await scalar("select workspace_apply($1)", [opportunity]);
await denied("select workspace_apply($1)", [opportunity]);
await denied("select workspace_application_status($1,'selected')", [
  application,
]);
await as(b);
assert.equal(
  await scalar("select count(*) from applications where id=$1", [application]),
  0,
);
await denied("select eco_applicant_summary($1)", [application]);
await as(company);
assert.equal(
  await scalar(
    "select count(*) from notifications where type='application_submitted'",
  ),
  1,
);
await db.query(
  "select workspace_application_status($1,'shortlisted','Meet the team')",
  [application],
);
assert.equal(
  (await scalar("select eco_applicant_summary($1)", [application])).skills[0],
  "python",
);
await as(a);
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
await as(company);
await db.query("select eco_opportunity_save($1::jsonb,$2)", [
  JSON.stringify({ ...posting, status: "closed" }),
  opportunity,
]);
await as(b);
await denied("select workspace_apply($1)", [opportunity]);
await as(university);
const event = await scalar("select eco_event_save($1::jsonb)", [
  JSON.stringify({
    title: "Campus Python Workshop",
    description: "Learn Python together on campus",
    university_id: campus,
    category: "workshop",
    mode: "online",
    location: "https://example.test/meeting",
    starts_at: "2099-01-02T00:00:00Z",
    ends_at: "2099-01-02T02:00:00Z",
    deadline: "2099-01-01T00:00:00Z",
    status: "published",
    capacity: 1,
    tags: ["python"],
    eligibility: { skills: ["python"] },
  }),
]);
await as(b);
assert.equal(
  await scalar("select count(*) from events where id=$1", [event]),
  0,
);
await denied("select workspace_register($1,true)", [event]);
await as(a);
await db.query("select workspace_register($1,true)", [event]);
await denied("select workspace_register($1,true)", [event]);
await as(university);
assert.equal(
  await scalar("select count(*) from event_registrations where event_id=$1", [
    event,
  ]),
  1,
);
await as(mentor);
await db.query("select eco_mentor_profile($1::jsonb)", [
  JSON.stringify({
    full_name: "Python Mentor",
    headline: "Backend engineer",
    bio: "Python guidance",
    current_position: "Engineer",
    company: "Test",
    years_experience: 5,
    expertise: ["python", "django"],
    skills: ["fastapi"],
    industry: "Software / IT",
    linkedin_url: "",
    portfolio_url: "",
    topics: ["backend"],
    availability_status: "available",
  }),
]);
await as(a);
await db.query("select eco_mentor_request($1)", [mentor]);
await denied("select eco_mentor_request($1)", [mentor]);
await denied("select eco_mentor_decide($1,true)", [a]);
await as(mentor);
await db.query("select eco_mentor_decide($1,true)", [a]);
const session = await scalar(
  "select eco_mentor_session($1,'Python planning','2099-01-02T00:00:00Z','https://example.test/session')",
  [a],
);
await denied(
  "select eco_mentor_session($1,'Unauthorized session','2099-01-02T00:00:00Z','')",
  [b],
);
await as(a);
assert.equal(
  await scalar("select count(*) from mentor_sessions where id=$1", [session]),
  1,
);
await as(b);
assert.equal(
  await scalar("select count(*) from mentor_sessions where id=$1", [session]),
  0,
);
console.log(
  "PASS: draft/publish/close; application ownership, duplicates, owner notification and timeline; campus eligibility reads/registration; mentor consent and session isolation.",
);
await as(a);
const consentProject = await scalar(
  "select eco_space_save('projects',$1::jsonb)",
  [JSON.stringify({ ...draft, slug: "consent-negative-cases" })],
);
const declineInvite = await scalar(
  "select eco_invite('projects',$1,'b@example.test')",
  [consentProject],
);
await as(b);
await db.query("select eco_invitation_decide($1,false)", [declineInvite]);
assert.equal(
  await scalar("select workspace_member('projects',$1)", [consentProject]),
  false,
);
await as(a);
const expiryInvite = await scalar(
  "select eco_invite('projects',$1,'b@example.test')",
  [consentProject],
);
await db.exec("reset role");
await db.query(
  "update workspace_invitations set expires_at=now()-interval '1 hour' where id=$1",
  [expiryInvite],
);
await as(b);
await denied("select eco_invitation_decide($1,true)", [expiryInvite]);
await as(a);
const cancelledInvite = await scalar(
  "select eco_invite('projects',$1,'c@example.test')",
  [consentProject],
);
await db.query("select eco_invitation_cancel($1)", [cancelledInvite]);
await as(c);
await denied("select eco_invitation_decide($1,true)", [cancelledInvite]);
await as(a);
await db.query("select eco_portfolio($1,true)", [project]);
assert.equal(
  (await scalar("select eco_portfolio_projects($1)", [a])).length,
  1,
);
await denied("select eco_portfolio($1,true)", [consentProject]);
await as(b);
assert.equal(
  (await scalar("select eco_portfolio_projects($1)", [a])).length,
  0,
  "Private account preference hides portfolio from another user",
);
await as(university);
const campusProject = await scalar(
  "select eco_space_save('projects',$1::jsonb)",
  [
    JSON.stringify({
      ...draft,
      slug: "campus-scope-test",
      organization_id: campus,
    }),
  ],
);
const campusProjectInvite = await scalar(
  "select eco_invite('projects',$1,'b@example.test')",
  [campusProject],
);
await as(b);
await db.query("select eco_invitation_decide($1,true)", [campusProjectInvite]);
await as(university);
const campusTask = await scalar("select eco_task_save($1,$2::jsonb)", [
  campusProject,
  JSON.stringify({
    title: "Campus task",
    description: "Practice together",
    assignee_id: b,
    status: "todo",
    priority: "medium",
    deadline: null,
  }),
]);
await as(b);
await db.query("select workspace_task($1,'done')", [campusTask]);
await as(university);
await db.query("select revoke_university_student($1,$2)", [campus, b]);
await as(b);
assert.equal(
  await scalar("select workspace_member('projects',$1)", [campusProject]),
  false,
);
assert.equal(
  await scalar("select count(*) from project_tasks where id=$1", [campusTask]),
  0,
);
await denied("select workspace_task($1,'todo')", [campusTask]);
console.log(
  "PASS: decline/expiry/cancel cannot create membership; public portfolio opt-in respects profile privacy; campus revocation removes task access and blocks legacy mutation.",
);
await db.close();
