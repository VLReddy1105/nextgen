# Role workspaces and connections gap matrix

Branch: `feature/role-workspaces-connections`. Baseline: `a63194b`. Inspection is based on repository APIs and migration definitions, not hosted verification. No schema, RLS, migration, authentication, environment, or marketing changes are authorized for this pass.

Paths below are repository-relative. Shared source roots: `src/components/ecosystem/`, `src/components/student/`, `src/lib/api/`, `backend/app/api/routes/`, `backend/app/services/`.

| Role | Module | Existing UI | Existing API | Existing DB/RPC | Missing logic | Connection to other role | Files to reuse | Files to modify | Status |
|---|---|---|---|---|---|---|---|---|---|
| All | Navigation / context | StudentShell roleLinks + generic context | workspace aggregation | RLS-scoped rows | Missing Mentor projects/events; Founder inherits Company; generic context | Role-specific routes and actions | StudentShell, RoleWorkspace | role-workspaces.ts, RoleContext.tsx, StudentShell | Implemented; locally validated |
| Company | Overview | Generic counts/activity | workspace | opportunities/applications/projects | Owned counts, recent applicants, invitations, actions | Student applications and project responses | RoleWorkspace | RoleWorkspace, RoleContext | Implemented; locally validated |
| Company / University | Opportunities / Applicants | Publishing and application detail exist | opportunities + applications | eco_opportunity_save, workspace_apply, workspace_application_status | Ownership-only editors; applicant counts/filter; publisher/detail metadata | Student discovery/status/history/notifications | Publishing, StudentDetail, RoleWorkspace | same; API detail enrichment | Implemented; locally validated |
| Company | Talent | Missing | applications/detail | eco_applicants, eco_applicant_summary | Use permitted applicants only, not global private directory | Student applications; project invitations by permitted email | RoleWorkspace, application detail | Talent page/component | Implemented; locally validated |
| University | Students / connections | Combined Campus page | campus + decision/invite | eco_campus_*; eco_university_* | Separate route/filters, clear pending/history/empty states; no duplicate connect | Student My University | Campus | Campus, student-connections route | Implemented; locally validated |
| University | Announcements | Editor/list exists | campus announcements | eco_announcement | Retain scoped delivery and verification gate | Connected Students | Campus | Campus | Implemented; locally validated |
| University | Mentors | No permitted institutional directory | No university mentor endpoint | No university-mentor relationship RPC | Do not expose unsupported module | None supported | Mentor discovery is Student-only | None | Blocked: schema/API extension outside scope |
| Mentor | Profile | Existing professional editor | mentor/profile | eco_mentor_profile | Retain fields and improve validation/loading | Student discovery | Mentor, Editor | same | Implemented; locally validated |
| Mentor | Requests / Students / Mentorship | Combined connections | connections + decision | eco_connections, eco_mentor_decide | Separate request/accepted views; refresh safely; relationship status | Student requested/accepted/declined | Mentor | Mentor, requests/students routes | Implemented; locally validated |
| Mentor | Sessions | Existing schedule/list | sessions | eco_mentor_session | Future date and accepted connection checks; clear empty state | Student sessions + notification | Mentor, Editor | same | Implemented; locally validated |
| Founder | Overview / Connections | Company-like generic overview | workspace + scoped spaces | project/community memberships | Own participation counts; contextual connection links; no admin directory | Project/community teammates | RoleWorkspace | RoleWorkspace, Connections | Implemented; locally validated |
| Company / University / Founder | Profile / Settings | ProfileEditor + StudentSettings shared | api/profile + settings | Existing own-row policies | Retain supported profile fields; no invented organization fields | Public publisher identity | ProfileEditor, StudentExtras | Only needed guidance | Reuse |
| All | Projects | Create/detail/tasks/invites/codes/leave exist | relationships + spaces | eco_space_save/invite/decision/member_remove/task_save | Pending invitation list; distinguish ownership/context; contextual controls | Recipients accept/decline, member list and notification | CreateSpace, SpaceActions, StudentDetail | same + catalog + invitations | Implemented; locally validated |
| All | Communities | Create/join/feed/comment/reply/react/mentions exist | spaces + community posts | workspace_post/react, eco_join_request | Pending join state; member-only controls; no duplicates | Members/replies/mentions notification | StudentDetail, SpaceActions | same + catalog | Implemented; locally validated |
| Company / University / Mentor / Founder | Events | Own list; mentor sidebar missing; overly broad editor | events detail/publish/register | eco_event_save, workspace_register | Own edit controls; attendee count visible; Mentor creation; preserve event context | Student registration and updates | Publishing, StudentDetail | same + RoleWorkspace | Implemented; locally validated |
| All | Notifications | Mark/read/deep links exist | notifications | workspace_notify in mutation RPCs | Render message; role-relevant unread links; avoid extra writer | Both participants | StudentExtras, StudentShell | same | Implemented; locally validated |
| Student | Overview | Profile/recommendations/apps/projects/events | workspace | Existing aggregate | Add pending invitations/mentorship summaries using scoped data | Other role actions | StudentModules | same + workspace/catalog | Implemented; locally validated |
| Student | Opportunities / Applications | Browse/search/save/apply/history | opportunities/applications | Existing eligibility and application RPCs | Publisher and dates; persistent status; ownership-safe actions | Company/University | StudentModules/Detail | same + API detail | Implemented; locally validated |
| Student | My University | Education separated from membership; Campus actions | campus | Existing invitations/domain approval/memberships | Suppress duplicate requests; show decisions and eligibility; refresh | University Students | Campus, StudentUniversity | Campus | Implemented; locally validated |
| Student | Mentorship | Discovery request button; accepted-only list | mentorship/connections | mentor_connections, eco_mentor_request/decide | Persist requested/declined/accepted; stop duplicate request; remove read-only copy | Mentor requests/students/sessions | StudentModules/Detail | same + catalog | Implemented; locally validated |
| Student | AI Tools / Profile / Settings / Help | Existing functional modules | Existing student/settings/support | Existing profile/preferences/reports | No redesign required | Preserve existing behavior | StudentExtras, StudentProfileEditor | None unless regression | Reuse |

## Database boundaries / blockers

- No global Student talent directory: `eco_applicants` and `eco_applicant_summary` expose only permitted applicants. Talent must use these projections. A wider opt-in directory would need a separately reviewed narrow RPC and consent policy.
- Mentorship supports requested/accepted/declined. There is no approved cancel/end/reopen RPC. Do not invent those actions or change statuses. A future feature needs a guarded transition RPC.
- University/Mentor institutional relationships are not defined. Omit that module until a separate relationship model/projection is approved.
- Project management uses `project_head`; community management uses `captain`. `team_lead`, `mentor`, `moderator` are contextual roles, not implicit owners. Do not broaden their RPC privileges.
- Event attendee counts are available to organizers, but no narrow attendee identity projection exists. Do not join private profiles to invent a roster. A named roster would need an organizer-scoped RPC.
- Existing membership-removal RPC records activity but does not notify every party. Preserve this behavior; additional notification production belongs in a separately reviewed atomic database change.

## Validation plan

Run local backend, Auth, isolated PostgreSQL/RLS, workspace/component, TypeScript, lint, production build and diff checks. Cover all ten requested flows through isolated database tests and focused UI tests. Hosted verification remains paused; real-account multi-session acceptance must be reported separately. No hosted users or migrations will be created in this pass.

## Completed implementation and validation

All ten implementation stages are complete within the existing schema boundaries. The table's blocked items remain deliberately unimplemented. Existing profile editors, publishing RPCs, application history, invitations, tasks, campus announcements, community interaction, event registration and notification writers are reused.

- Company: owned opportunity/applicant counts and filtering, applicant-based Talent search, project/community participation, event publishing and scoped profile/settings.
- University: Students and separate Student Connections views, pending decisions/history, existing scoped announcements and publishing. Academic education is not university membership.
- Mentor: separate Requests, Students and Mentorship views, professional profile, sessions, Projects and Events. Student discovery carries requested/accepted/declined state.
- Founder: project/community participation and Connections derived from joined spaces. No administrative directory or permissions.
- Shared: role-specific navigation/context; pending invitations; contextual manager controls; actual-owner publication editing; publisher information; organizer registration counts; notification messages; required-field/date/HTTPS/self-invitation checks.
- Small community actions refresh detail only. Relationship changes still refresh the aggregate because counts and other modules depend on them. Existing WorkspaceProvider deduplication, cancellation, polling and shared Supabase HTTP clients are unchanged. Additional actor-scoped invitation/request reads run concurrently and reuse request-level memoization.
- Existing invite recipients are active onboarded Students or Mentors. Do not imply invitations to all primary roles are supported. Talent searches permitted applicant names/opportunities; skills are shown only in the authorized application detail, not a new bulk profile directory.

### Local verification

- Backend: 32 passed (one existing Starlette/httpx deprecation warning).
- Node auth/account-state/role/workspace/isolated PostgreSQL suites: 17 passed. Historical SQL was loaded only into disposable embedded PGlite; no hosted migration or database command was run.
- Student browser components: 25 viewport/page combinations, keyboard focus, mobile dismissal, empty/loading/error states.
- Ecosystem browser components: 35 cross-role viewport cases, profile gating, forms, autocomplete and domain rejection.
- Additional role browser checks: role menus, mentorship accept/decline reflection, university request decision/history, failed-read retry and whitespace rejection.
- Workspace performance harness: overlapping refreshes produce one request; polling, freshness, visibility recovery and unmount cancellation pass. Controlled render after data: 323 ms; navigation Opportunities 145 ms, Projects 154 ms, Communities 133 ms, Events 70 ms. These fixture timings are not hosted/API or live multi-account measurements.
- TypeScript and lint pass. Production build passes (67/67 static pages) and git diff --check passes. The first build collided with an existing Next dev process writing .next; stopping that process allowed a clean successful rerun, then localhost was restarted. The build retains the existing Supabase Realtime dynamic-dependency warning.

### Ten requested flow coverage and manual acceptance

| Flow | Local evidence | Remaining real-account acceptance |
|---|---|---|
| Company opportunity → application → status → notice | Isolated SQL tests exercise publishing, visibility, duplicate denial, applicant ownership, status/history/notice; API ownership tests | Two browser sessions with actual Company/Student accounts |
| Company project → invitation → membership | Added isolated company-owned project invitation/acceptance and both-side membership assertions | Confirm actual email recipient, invitation display and list refresh |
| University → Student connection | Isolated invitation/domain/request/acceptance/projection tests; UI approve/history | Actual institution domain and both dashboards |
| University event → registration | Isolated campus eligibility, registration/count and isolation | Actual eligible Student and organizer count |
| Campus announcement → Student | Added connected-recipient visibility/notification and unrelated-user denial | Both live sessions and deep link |
| Mentor request → acceptance → sessions | Isolated consent/session visibility; UI accept/decline; catalog state tests | Actual discovery/request and both sessions |
| Community membership → post/reply/mention | Added isolated memberships, posts/comments/replies/reactions/notifications and denial | Multi-account feed updates and links |
| Private project → invitation → access | Existing SQL invitation expiry/decline/acceptance/access regression | Real recipient and private detail access |
| Public Student project discovery | Existing SQL public discovery/portfolio opt-in/privacy checks | Discovery with real eligible account |
| Unauthorized action denied | Isolated RLS/RPC negative tests across applications/campus/spaces/mentorship; owner controls tests | Live unrelated role/account checks |

Hosted schema verification remains paused. Local fixtures do not demonstrate hosted deployment state. No live accounts, secrets, schema changes, RLS changes or new notification writers were introduced.

### Files changed

- `backend/app/api/routes/applications.py`
- `backend/app/api/routes/ecosystem.py`
- `backend/app/api/routes/events.py`
- `backend/app/api/routes/opportunities.py`
- `backend/app/api/routes/workspace.py`
- `backend/app/schemas/ecosystem.py`
- `backend/app/services/catalog.py`
- `backend/tests/test_role_connections.py`
- `docs/role-workspaces-gap-matrix.md`
- `src/app/dashboard/announcements/page.tsx`
- `src/app/dashboard/connections/page.tsx`
- `src/app/dashboard/requests/page.tsx`
- `src/app/dashboard/sessions/page.tsx`
- `src/app/dashboard/student-connections/page.tsx`
- `src/app/dashboard/students/page.tsx`
- `src/app/dashboard/talent/page.tsx`
- `src/components/ecosystem/Campus.tsx`
- `src/components/ecosystem/Connections.tsx`
- `src/components/ecosystem/Editor.tsx`
- `src/components/ecosystem/Invitations.tsx`
- `src/components/ecosystem/Mentor.tsx`
- `src/components/ecosystem/MutationRefresh.tsx`
- `src/components/ecosystem/Publishing.tsx`
- `src/components/ecosystem/RoleContext.tsx`
- `src/components/ecosystem/RoleWorkspace.tsx`
- `src/components/ecosystem/SpaceActions.tsx`
- `src/components/student/CreateSpace.tsx`
- `src/components/student/StudentDetail.tsx`
- `src/components/student/StudentExtras.tsx`
- `src/components/student/StudentModules.tsx`
- `src/components/student/StudentShell.tsx`
- `src/lib/api/types.ts`
- `src/lib/role-workspaces.ts`
- `tests/ecosystem-database.test.mjs`
- `tests/role-workspaces.test.mjs`
- `tests/workspace-ui/api.ts`
- `tests/workspace-ui/main.tsx`
- `tests/workspace-ui/roles.mjs`
