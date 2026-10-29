# Mentor affiliation database review

Design before migration, 2026-10-29. Branch: feature/mentor-workspace-improvements.

Reuse mentor_profiles, organizations, profiles, opportunities, applications,
application_history, notifications and existing project invitations. Primary role
remains mentor. applications.student_id already references profiles: retain its
historical name for compatibility, documenting that it is the applicant identity.

Proposed minimum extension:
- mentor_affiliations: Mentor/organization FKs, initiator, state, decision actor and
  timestamps. Derive company/university from organization.type. No independent row.
- One accepted affiliation per Mentor; no duplicate pending/accepted pair.
- pending/accepted/rejected/cancelled/ended: cancellation permits pending withdrawal;
  ended permits departure without deleting relationship history.
- opportunities.audience: constrained text student/mentor, matching existing
  constrained-text opportunity conventions. Default student preserves old records
  and callers. No manual data backfill or profile duplication.
- mentor_sessions.organization_id nullable: only explicitly scoped future sessions
  enter organization progress. Do not infer private session purpose from shared
  mentees or affiliation. Existing sessions remain private to their participants.

Request consent: Mentor requests require current organization owner approval.
Organization invitations record organization approval by their initiator and need
Mentor acceptance; this is consent to an approved invitation, never self-approval
of a Mentor-initiated request. Revalidate owner, active accounts and organization
type at acceptance. Serialize decisions on the Mentor profile plus partial unique
indexes. Selection of an organization grants no access.

RLS: affiliation records visible only to the Mentor and the authorized organization
owner, with direct writes revoked. Controlled SECURITY DEFINER RPCs validate
auth.uid(), workspace readiness, role and organization scope; empty search_path.
Explicitly revoke PUBLIC/anon/authenticated function defaults before granting only
the public RPC allowlist. Private helpers and trigger functions are not executable by API roles; owner-executed calls and service-role privileges remain available.
No new grant for workspace_notify/eco_activity/eco_space_owner.

Recruitment: audience-aware publication/application checks; retain existing
application statuses/history. Selecting an applicant does not create affiliation.
The UI must explicitly send an affiliation invitation, then receive Mentor consent.
No Mentor resume storage. Only accepted affiliation badges enter the Student
Mentor directory; pending/rejected rows remain private.

Organization progress: accepted Mentors only; project membership counts scoped by
organization ID, accepted mentees scoped by University membership or shared active
organization project, and sessions explicitly tagged to this organization. Never
return unrelated session URLs, private activity or entire Student profiles.

Deployment guard: new APIs detect missing schema via existing SCHEMA_REQUIRED
handling and return an unavailable capability. Existing Mentor workspace remains
usable. No fake frontend acceptance. Student display falls back without claiming
an affiliation if the schema is absent. No hosted deployment authorized.


## Final local migration and reuse decision

`supabase/migrations/20261029000000_mentor_affiliations.sql` is the only new migration.
There are 25 local migration files. The user reported 24 hosted migrations before
this work; the hosted count was not queried or changed in this turn.

Existing `mentor_connections` relates Students to Mentors; university memberships
relate Students to universities; `workspace_invitations` supports project/community
membership. None represents consent to a Mentor organization affiliation. Reusing
those mechanisms would mix roles or confer unrelated workspace membership. One
new table therefore holds only this new relationship. Organization type is derived,
not duplicated. `cancelled` and `ended` preserve consent history and permit a new
request after departure without destructive deletes.

The only additional columns are `opportunities.audience` (CHECK-constrained
student/mentor text, following the existing constrained-text publication model)
and nullable `mentor_sessions.organization_id`. The first preserves all existing
opportunities as Student-targeted; the second prevents counting private historical
sessions as organizational work. No profile duplication, role enum expansion,
resume storage, automatic data migration or affiliation backfill is performed.

## Authorization and RPC inventory

- `eco_mentor_hub()`: only active Mentor/Company/University callers. Returns bounded
  directories, own permitted affiliations, Mentor opportunities and applications.
- `eco_mentor_affiliation_request(uuid,uuid)`: active Mentor self-request or current
  official Company/verified University owner invitation. Target must be an active,
  email-confirmed Mentor. No duplicate pending/accepted pair or second affiliation.
- `eco_mentor_affiliation_decide(uuid,text)`: request needs the organization owner;
  organization invitation needs the invited Mentor. Revalidates current owner and
  eligibility. Initiator can cancel pending; Mentor/owner can end accepted.
- `eco_mentor_badges(uuid[])`: active authenticated directory viewers; at most 500
  IDs; returns only accepted affiliations with eligible active organizations/Mentors.
- `eco_mentor_session_scoped(uuid,uuid,text,timestamptz,text)`: accepted Mentor
  affiliation and accepted, active organization-related Student required. Locks the
  Mentor profile consistently with affiliation decisions. Calls the existing
  session creator and tags only the new session.

The modified public RPCs are `workspace_apply`, `eco_opportunity_save`, and
`workspace_application_status`. They preserve Student defaults and validate the
Mentor audience. Publication requires the organization owner; application requires
an independent active Mentor; decisions require the owning organization. Existing
status/history/notification mechanisms are reused. Existing general Student-facing
opportunity/applicant projections filter out Mentor recruitment.

All eight public new/modified RPCs explicitly revoke PUBLIC, anon and authenticated
default privileges, then grant EXECUTE to authenticated only. Every function uses
SECURITY DEFINER and an empty search_path, with qualified object references.
`mentor_org_manager`, `mentor_org_valid`, `mentor_active`, `mentor_org_student`,
`mentor_audience_guard`, the modified `eco_scope_allowed`, and the application
activity trigger are not executable by PUBLIC/anon/authenticated. Existing hardened
`workspace_notify`, `eco_activity`, `eco_space_owner` remain inaccessible to API
roles; owner-executed nested calls still work. No service-role credential is used
by application code.

The new table has RLS and only authenticated SELECT. Its policy permits the Mentor
or the authorized owner of that organization. No API INSERT/UPDATE/DELETE/TRUNCATE
is granted. Controlled RPCs own all changes. Partial unique indexes enforce one
accepted affiliation and one pending/accepted pair, including competing decisions.
The shared Mentor-profile lock serializes request/accept/session/application races.

## Progress, UI and notifications

Mentor overview, profile and right context show the derived state, organization,
pending request/invitation count, and a recruitment/application link. The affiliation
page offers independent/university/company selection and real organization search;
selection itself never changes the accepted badge. The org view shows professional
profiles and its own relationship history. Progress is emitted only for accepted
affiliations and includes actual organization project memberships, related accepted
mentees, and explicitly scoped session counts. Past sessions are not called completed.
No unrelated Student profiles, private session URLs or session rows are exposed.
Campus affiliation satisfies only the campus scope prerequisite; project consent is
still required. Ending it removes that prerequisite. Existing explicit Company
project membership is independent and is not silently deleted on affiliation end.

Mentor recruitment uses required skills, experience and availability expectations.
Mentor matches are transparent skill intersections. Application review uses the
professional Mentor profile, not a Student resume. Selecting an application leaves
context unchanged; a separate invitation and Mentor acceptance activate affiliation.

Notification keys are affiliation ID + state; duplicate decisions are rejected.
Application submission/withdrawal uses the existing trigger and status changes use
the existing transition RPC. Links point to `/dashboard/mentors` or
`/dashboard/mentor-opportunities`. Mark-one/mark-all permissions remain unchanged.

## Manual deployment — NOT executed

1. Review this single migration and back up the confirmed shared GenZnect project
   through the existing operational process. Keep the branch unchanged.
2. From the configured repository, the operator may preview with
   `npx supabase db push --dry-run`. It must show only this new migration; stop if
   earlier migrations are pending. Use the existing working Session Pooler setup
   if needed; never paste credentials into code, logs or chat.
3. Only after separate approval, the exact hosted deployment command would be:
   `npx supabase db push`
4. Do not use reset/repair. This change does not require replaying old migrations.
5. Run `scripts/verify-mentor-affiliations.sql` in a read-only SQL session. Expect
   RLS true, two partial uniqueness indexes, only SELECT for authenticated on the
   affiliation table, no anon EXECUTE for the 18 listed functions, authenticated
   EXECUTE only for the eight public RPCs, zero API TRUNCATE grants, and only
   `notifications.read_at` as an authenticated updateable notification column.
   Functions should have the trusted migration owner and empty search_path.
6. Confirm local/hosted migration history is 25/25, then exercise real test accounts
   for both request directions, reject/cancel/end, duplicate/competing approval,
   unrelated-org denial, Student badges, Mentor apply/review/select/explicit invite,
   shared versus private sessions, campus project acceptance/revocation, and
   notification mark-one/mark-all. No such hosted writes occurred during this work.

## Risks and limitations

- Migration is local and undeployed. Live Supabase/PostgREST, email delivery and
  real-account acceptance tests remain manual post-deployment work.
- ALTER TABLE and function/policy replacement require short database locks. Test
  in staging with realistic data and review deployment timing. Existing audience
  defaults to Student; existing session scope stays NULL.
- Organization authority is the existing official organization owner; delegated
  multi-admin organization roles are not invented. Universities must be verified.
- One accepted affiliation per Mentor; independent means no currently eligible
  accepted affiliation. A stale accepted relationship to an inactive organization
  must be ended before a new application/request; its old public badge is hidden.
- No public private-relationship directory. Org Mentor search is limited to active
  Mentor names, and details come only through an authorized request/application.
- Directory/hub arrays are capped at 500. Pagination and hosted load benchmarks
  are not part of this minimum extension. One shared workspace RPC is reused by
  all panels; no additional polling loop or duplicate per-panel requests.
- Profiles are current professional profiles, not immutable application snapshots.
  Matching is deterministic skill overlap, not inferred qualifications.
- Scoped progress is deliberately limited; no invented engagement score or
  session-completion state. Existing unscoped sessions are excluded.
- Local tests cover uniqueness and competing decisions sequentially, not a hosted
  multi-connection stress test. Database indexes are the final uniqueness guard.


## Final validation evidence

- Backend: 63 tests passed (includes 11 new affiliation/API guard cases and 14
  earlier Mentor workspace cases). No hosted requests from these tests.
- Node: 21 entries passed, including auth/admission, roles, fresh-development
  configuration in development/production/test, and three isolated PGlite suites.
  All 25 migrations load with simulated broad Supabase default grants.
- Database cases cover both affiliation directions for Company/University,
  independent state, reject/cancel/end, competing acceptance, duplicates,
  unchanged primary role, public badges, private row/column/function boundaries,
  Student/Mentor audience, application ownership/history/notification keys,
  selection without affiliation, explicit consent, scoped sessions/progress,
  campus invitation acceptance/revocation and anonymous denial.
- Existing notification mark-one/mark-all and hardened-helper regressions passed.
  The read-only verification script executes successfully in the isolated engine.
- Browser: 25 Student viewport cases, 35 cross-role cases, existing role/consent
  suite, 18 earlier Mentor cases, and 18 new affiliation/recruitment cases passed.
  Includes empty/pre-migration states, decision refresh, no self-approval control,
  accepted/pending badges, Student badge, keyboard and overflow checks.
- Performance: overlapping refreshes produce one request; hidden-tab/recovery/
  cancellation checks pass. Observed fixture overview render 149 ms, navigation
  50–104 ms. These are local fixture measurements, not hosted load benchmarks.
- TypeScript and lint passed. Production build passed, 69/69 pages. Development
  server restored on port 3000 after the build. git diff --check passed.
- Non-blocking existing warnings: Supabase realtime dynamic dependency during
  build; Starlette/httpx test-client deprecation; Node module-type inference;
  Git LF/CRLF normalization notices. No new SQL warning or migration failure in
  the final isolated run.

No commit, push, merge, remote modification, migration repair/reset or Supabase
CLI deployment command was executed. Environment and shared Supabase config files
were not edited. Hosted database remains unchanged by this work.


## Focused pre-deployment audit

See [security and compatibility audit](mentor-affiliation-security-audit.md). Both hub Mentor-profile payloads now use an explicit six-field whitelist. Scope caller authorization, route admission, baseline dependencies and Student regression were rechecked.
