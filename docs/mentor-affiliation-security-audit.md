# Focused pre-deployment audit — 2026-10-29

Branch: `feature/mentor-workspace-improvements`. Existing uncommitted work preserved.
Only production SQL correction in this audit: replace both `to_jsonb(m)` Mentor
profile projections in `eco_mentor_hub` with an explicit six-field whitelist.
No new migration, route, role, or hosted operation.

## Scope authorization: safe without changing eco_scope_allowed

A repository-wide search across migrations, backend, frontend and tests found four
direct callers. The loaded PostgreSQL function catalog independently asserts the
same complete list:

| Caller | Separate authorization retained | Result |
|---|---|---|
| `workspace_member` | workspace readiness AND actual active project/community membership | Affiliation supplies campus eligibility only; no membership or management |
| `eco_membership_scope` | BEFORE INSERT/UPDATE guard on project_members/community_members; it rejects ineligible writes but never creates a row or grants a write | Existing manager/invitation/code/join-policy checks still authorize membership creation |
| `eco_portfolio_projects` | actual active membership, show_on_profile opt-in, public project visibility, and self/member-profile privacy | No private project or Student profile is exposed by affiliation |
| `mentor_org_student` | active confirmed Student, accepted Mentor–Student connection, and active university membership OR a shared organization project with both active members and both scope checks | Organization progress cannot become a global Student directory |

Sources: integrity migration `20261002000011`, directory migration `20261002000012`,
and the proposed `20261029000000` migration. No backend/frontend calls directly
invoke this helper. No RLS policy directly treats it as sufficient authorization.
The helper remains non-executable by anon/authenticated; trusted nested calls work.

Indirect RLS surfaces audited: project_tasks/tasks_read, project_activity/activity_read,
project_files/files_read, community_posts/feed_read, community_resources/resources_read,
ecosystem_activity/activity_read and events/events_read retain membership checks.
community_comments and community_reactions inherit visibility through community_posts.
projects_read and communities_read call eco_space_visible, which independently
requires actual membership, actual management, existing public/context visibility,
or a pending valid invitation. Affiliation does not modify eco_context. Public
summaries/invitation previews remain distinct from private resources.

The current function catalog identifies these transitive workspace_member callers:
`eco_code_accept`, `eco_event_save`, `eco_invitation_decide`, `eco_invite`,
`eco_join_request`, `eco_portfolio`, `eco_space_visible`, `eco_task_save`,
`workspace_audience`, `workspace_directory`, `workspace_join`, `workspace_post`,
`workspace_react`, `workspace_refresh_reminders`, `workspace_register`,
`workspace_resource`, `workspace_stats`.
They use actual membership for reads/updates, recipient eligibility, duplicate
membership checks, or reminders. Code acceptance still validates its code;
invitation acceptance checks recipient and pending/unexpired consent; invitation
creation and request decisions require management. workspace_join retains its
open-join/context checks. No new path bypasses those checks. The membership trigger
also covers existing manager assignment/create-space writes; satisfying its scope
predicate alone never authorizes INSERT/UPDATE.

`eco_manager` delegates only to project_head/community captain authorization;
affiliation is never consulted. `eco_task_save` additionally checks assignment or
management for changes. `eco_context`, `eco_eligible`, university management and
Student privacy policies are not widened by this change.

New regression assertions seed real protected task/resource/Student rows. An
accepted University Mentor without membership sees none, cannot join an invite-only
community or post there, and has neither project nor community management rights.
Existing project invitation acceptance works; ending affiliation revokes its campus
membership prerequisite. Existing suites cover private summaries, Student privacy,
join/code/invitation flows and campus revocation.

## Profile column inventory and explicit projection

All 15 current mentor_profiles columns were inspected from the complete migration
chain: user_id, headline, bio, current_position, company, expertise,
availability_status, created_at, updated_at, years_experience, skills, industry,
linkedin_url, portfolio_url, topics.

Both hub affiliation.profile and application.mentor_profile now expose ONLY:
`headline`, `bio`, `skills`, `expertise`, `years_experience`, `availability_status`.
These are exactly the fields consumed by the existing affiliation/recruitment UI.
Unused professional fields, IDs, timestamps and any future fields are omitted.
A missing profile still returns NULL. Parent identity/name fields remain separately
and explicitly projected. No backend/frontend type change is necessary.

A test adds `audit_private_canary` to the isolated mentor_profiles table and asserts
exact key equality for both hub payloads. The canary and all other omitted fields
remain absent. This future-column test would fail with the previous whole-row JSON.

## Notification routes

Both existing routes were inspected:
- `src/app/dashboard/mentors/page.tsx` -> `/dashboard/mentors`
- `src/app/dashboard/mentor-opportunities/page.tsx` -> `/dashboard/mentor-opportunities`

Both require authenticated admission and explicitly allow Mentor, Company and
University. Role navigation includes both; Student/Founder are redirected away.
Affiliation request/invitation/accepted/rejected/cancelled/ended notifications use
`/dashboard/mentors`. Mentor application submission, withdrawal and status updates
use `/dashboard/mentor-opportunities`. Existing Student application notifications
retain `/dashboard/applications/{id}`; Student publication notifications retain
`/dashboard/opportunities/{id}`. The publication notification loop remains
Student-audience only. Scoped sessions reuse the existing Mentor session creator
and its unchanged notification behavior. No notification route correction or new
page was needed in this audit.

## Shared Student compatibility, roles and dependencies

The complete first 24 migrations load in isolated PostgreSQL before the proposed
migration. At that exact boundary the test asserts all required objects exist:
mentor_profiles, mentor_connections, mentor_sessions, organizations, projects,
project_members, university_student_memberships, opportunities, applications,
application_history, set_updated_at(), workspace_ready(text), and workspace_notify.
The named opportunities_read policy exists exactly once: introduced by
20261002000001, replaced by 20261002000008, retained through migration 24. The
unconditional DROP POLICY is therefore valid for this baseline and was not weakened
with IF EXISTS or other idempotency changes.

The actual loaded primary_account_role enum is asserted in order:
student, founder, university, company, mentor. New SQL uses these primary-role
values, never the legacy company_representative/university_representative values.
No role architecture or enum changes were made.

The baseline corresponds to the user's previously verified 24/24 hosted migration
history. No fresh hosted catalog query was performed; local replay plus the supplied
hosted verification is the evidence, not a claim of a new remote inspection.

opportunities.audience remains NOT NULL DEFAULT 'student' with a two-value CHECK.
The Student publication branch and eligibility predicate remain intact. Regression
assertions cover Student visibility, Student application, Company application read,
Company status change, Student updated status and its exact notification deep-link.
An opportunity seeded before migration 25 receives audience=student, remains visible,
and passes that complete application/status-notification flow after upgrade. A
legacy publishing payload omitting audience also creates a Student opportunity.
Mentor-only audience rejection for Students remains enforced. Full existing
application/history, owner, duplicate, withdrawal and notification regressions pass.

## Validation and readiness

63 backend tests and 21 Node entries passed, including auth/roles and all three
isolated database suites. Focused audit tests also pass after the private-row and
caller-inventory additions. All browser suites passed: 25 Student, 35 cross-role,
18 existing Mentor and 18 affiliation viewport cases, plus role interactions.
Performance: one request for overlapping refreshes; hidden-tab, recovery and
cancellation checks pass (fixture render 164 ms; navigation 47–91 ms).
TypeScript and lint passed. Production build passed (69/69 pages); final git diff
--check passed. Development server restored on port 3000.

Known existing warnings: Starlette/httpx deprecation, Node module-type inference,
Supabase realtime dynamic-dependency build warning and Git LF/CRLF notices.
No hosted login or data mutation was used for this audit.

Ready for a separately authorized dry-run after final local checks. No dry-run or
Supabase db push was executed during this audit.

Git push performed: NO
Git merge performed: NO
Real Supabase db push performed: NO
Hosted database modified: NO
