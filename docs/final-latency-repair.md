# Final latency repair

Date: 2026-11-05. Repository: `C:\Users\Jai\nextgen`.
Branch: `feature/final-latency-optimization`. Baseline: `b20968a`.
Changes are local and uncommitted. No branch switching, Git push, merge, hosted database operation, configuration change, or migration was performed.

## Evidence and scope

The previous diagnostic and `docs/cross-role-latency-investigation.md` identified sequential detail reads, full-detail activity fan-out, whole-object effect invalidation, repeated campus reads, and non-Student aggregate readiness. This repair changes scheduling, response composition, invalidation, and loading presentation. It retains authoritative Auth/profile admission, RLS-backed visibility, role restrictions, consent and mutation RPCs.

Measurements below distinguish synthetic repository I/O, local component fixtures, and public Next pages. None is a real authenticated hosted-account measurement. Every real-account timing and deployment-proxy streaming check is **MANUAL ACCEPTANCE REQUIRED**. The Student live workspace endpoint was not called: its existing reminder RPC writes data.

## Repairs and remaining limits

| Area | Change and reason | Limit / risk |
|---|---|---|
| Project detail | Resolve entity visibility and own active membership first; then overlap directory, relationships, authorized codes, tasks, files and activity. | Same reads and access checks; slowest child still bounds completion. |
| Community detail | Same authorization boundary; overlap resources/events/projects/directory with feed. Comments and reactions overlap after post IDs exist. | Feed retains its necessary post-ID dependency and existing per-query bounds. |
| Application detail | Application and opportunity precede parallel organization, permitted applicant summary and history. | No broader applicant projection. |
| Opportunity detail | Entity first; organization, own applications and saves overlap. | No visibility or matching changes. |
| Event detail | Entity first; own registration overlaps organizer-only attendee read. | Non-organizers still receive no attendee count. |
| Student activity | One focused HTTP endpoint for tasks/team/feed/posts replaces one full-detail HTTP request per joined space. Membership, visible entities and existing authorized directory RPCs remain gates. Fan-out bounded to eight spaces. | This removes browser/Auth N+1 and unrelated child reads, not all upstream per-space reads. No new database batching RPC. |
| Student bootstrap | Existing progressive core/reminder ordering retained. Detail routes do not wait for aggregate catalogs. | Reminder-writing behavior intentionally unchanged. |
| Mentor bootstrap | Authorized profile first, mentor core independently; projects and hub no longer block mentor core. Final project-match enrichment retained. | Slow hub/project sections still need to finish for their own UI. |
| Company / Founder bootstrap | Authorized profile and independent sections stream as ready. | Final total aggregation time is not claimed to decrease. |
| University bootstrap | Profile/sections stream independently of campus progress. Reuse progress in campus; full polling responses also retain progress. | Verification gates unchanged. |
| Effects | Campus keys use membership/organization/revision values; My Mentors uses identity and connection values; details compare only current entity/invitations/revision. | Full workspace poll still invalidates campus for external changes. |
| Details / rapid navigation | Abort prior item read; stale callbacks cannot commit. First supplementary catalog establishes a comparison baseline instead of restarting detail. Other entity changes do not invalidate the open item. | Unrecognized writes retain a safe full refresh fallback. |
| Campus | Cancel obsolete request. Wait only for owned-organization readiness. Reuse shared progress; scoped campus revisions refresh its independent requests. | Background failure retains existing error/retry presentation. |
| My University | Campus passes its already authorized organizations to StudentUniversity; no second university lookup. | Standalone StudentUniversity retains its existing lookup and cancellation. |
| My Mentors | Keep existing content during background refresh; cancel stale requests; reuse connections returned by targeted refresh. | Initial read is still required. |
| Selected Mentor | Filter mentor_profiles and own connection query by selected mentor. Matching, badges and authorized directory allowlist retained. | Existing directory RPC still returns the permitted mentor directory; no new SQL projection. |
| Notifications | Existing dedicated mark-one/all refresh retained. Section and full snapshots cannot overwrite newer mark-read results. | Counts remain server-confirmed, not optimistic. |
| Loading | Role sections show readiness placeholders instead of premature empty states. Project/community core renders before children; mutating controls wait for full detail. Context and form placeholders are scoped. | Streaming errors remain explicit and retryable; proxy buffering must be checked in deployment. |
| Route prefetch | Existing Next Link behavior retained. | No speculative authenticated full-workspace request. |
| Detail intent prefetch | Hover/focus on exact entity links shares one detail read with click. Provider-local, two-entry bound, three-second reuse window, one-time consumption; mutation/unmount clears unused reads. | Hover without navigation can add up to two speculative reads. No cross-account/global cache. |
| Imports / compilation | Editor implementation loads in a separate lazy chunk. MentorOverview imports the small context badge instead of the affiliation feature module. | Bundle gains are modest; this does not eliminate Next dev compilation. |
| Payload | Activity returns only the needed collection and identity/title/name. Owner event counts read event_id only in section API. Compact notification startup remains. | No broad catalog field removal without consumer proof; no pagination-semantic change. |
| Auth request count | Consolidated activity HTTP requests and consumed intent reads reduce redundant admissions naturally. | Every actual request still performs existing Auth/profile validation. |
| Login / signup | Existing push/refresh, verification, onboarding, safe-return-path and account checks retained. | No proven safe reason to remove server reconciliation; real timing **MANUAL ACCEPTANCE REQUIRED**. |
| Logout | Submit the same native POST before unmounting private state; show “Signing you out…”. Server signOut and 303 remain unchanged. | Real network failure/retry and cross-tab behavior require acceptance. |

## Mutation refresh matrix

All routes still execute their existing writes and permission checks. Metadata is held in a client WeakMap associated with the actual result object; server-provided fields cannot choose refresh behavior. Unknown/no-result operations fall back to the established full refresh.

| Mutation family | Refreshed sections |
|---|---|
| Notification mark-one/all | Dedicated notifications only |
| Student profile | Reuse returned profile; opportunities, projects, communities, events, mentors, notifications |
| Mentor profile | profile, mentor, mentor_hub |
| Mentorship / connections | mentors, mentor, connections, sessions, notifications |
| Sessions | sessions, mentor, mentor_hub, notifications, activity |
| Mentor affiliation / recruitment | mentor_hub, mentor, sessions, notifications, activity |
| Opportunity / application | opportunities, applications, notifications, activity |
| Event | events, notifications, activity |
| Project / tasks / codes | projects, invitations, notifications, activity, mentor |
| Community / posts | communities, invitations, notifications, activity |
| Invitations / join requests | projects, communities, invitations, notifications, activity, mentor |
| Resource | projects, communities, activity; detail-only actions retain focused detail refresh |
| Campus | profile, organizations, campus_progress, projects, communities, events, opportunities, notifications; campus request revision |

Writes overlapping an active section read are coalesced into a subsequent read; the older snapshot is discarded. Newer notifications survive a section response. Full refresh fallback waits for pending section refresh. Profile reuse, detail invalidation and cache disposal remain inside the identity-keyed provider. Targeted Student refresh preserves its existing reminder RPC before reads.

## Controlled before/after measurements

`tests/final-latency-benchmark.py` loads baseline route source with `git show HEAD:...` in memory, without checkout/reset. Three samples per detail, 50 ms simulated delay per upstream operation. These exclude Auth, real network, serialization and browser work; Windows timer scheduling adds variance. No hosted claims are derived by multiplying network probe timings by read counts.

| Detail | Before median ms | After median ms | Upstream reads before → after |
|---|---:|---:|---:|
| Project head | 472.76 | 169.23 | 8 → 8 |
| Joined community with posts | 589.12 | 242.20 | 10 → 10 |
| Application | 280.01 | 185.37 | 5 → 5 |
| Opportunity | 245.39 | 107.04 | 4 → 4 |
| Organized event | 170.38 | 109.49 | 3 → 3 |

One empty-collection role sample, same delayed repository. Profile timing begins **after** authoritative request admission and is not end-to-end bootstrap latency:

| Role | Before full aggregation ms | After profile frame ms | After final section ms | After upstream reads |
|---|---:|---:|---:|---:|
| Mentor | 55.08 | 0.11 | 58.80 | 20 |
| Company | 59.68 | 0.10 | 64.09 | 18 |
| University | 103.41 | 0.12 | 139.05 | 19 |
| Founder | 46.48 | 0.07 | 64.67 | 17 |

These samples support earlier useful rendering, **not** faster total aggregation. A barrier-based regression separately proves mentor core arrives while project reads remain blocked and that disconnect cancels unfinished work. Student progressive scheduling is unchanged.

| Client behavior | Before | After |
|---|---|---|
| Activity for N joined spaces | N full-detail HTTP/Auth admissions | 1 focused HTTP/Auth admission |
| Task activity upstream reads for N ordinary member projects | Approximately 7N full-detail reads | 2 authorization/entity queries + N task reads |
| My University organization lookup | Campus + university-list HTTP | Campus only |
| University progress on bootstrap + campus | 2 progress RPCs | 1 shared progress RPC |
| Intent prefetch + click of same detail | No data-intent prefetch; click requires read | 1 shared read, not 2 |
| Targeted mutation | Full workspace aggregate refresh | Selected section endpoint; one coalesced follow-up for overlapping writes |
| Mark-one/all | Dedicated notification refresh | Same dedicated refresh; race coverage extended |
| Ordinary component navigation | 0 additional workspace calls | 0 additional workspace calls |

Credential-free provider/component benchmark: overview after supplied data 125 ms before / 114 ms after; navigation opportunities 74/52 ms, projects 72/60 ms, communities 66/54 ms, events 39/43 ms. One shared request under overlap in both versions. Small differences are not treated as statistically significant.

## Development, production, and network

Diagnostic baseline public-page browser timings: dev first login 9,947 ms (TTFB 8,367), warm login 1,110 (252); first signup 3,620 (2,765), warm signup 926 (176). Production first login 772 (413), warm login 148 (49), signup 141 (25). These are public pages without authenticated workspaces. Cold dev log: login compilation 5.7 s / 833 modules, signup 2.1 s / 841 modules, middleware 840 ms / 189 modules.

Production build remains 69 pages, shared JS 103 kB. Observed post-change overview 168 kB vs baseline 169 kB; detail 172 kB vs 172 kB; profile 173 kB vs 172 kB; students 175 kB vs 174 kB. The added streaming/refresh code offsets some lazy-editor savings. No across-the-board bundle or cold-compilation improvement is claimed. Final build compiled in 12.9 s versus baseline 14.1 s; earlier repair builds varied from 17.6–21.5 s under local test load, so this is not a reliable compilation-speed claim.

Final local HTTP measurements used Node fetch, measuring headers and full response body (not browser hydration). All returned HTTP 200:

| Public page / sample | Development TTFB / total ms | Production TTFB / total ms |
|---|---:|---:|
| Login first | 9,128 / 9,273 | 363 / 376 |
| Login warm | 299 / 346 | 36 / 48 |
| Signup first | 3,534 / 3,580 | 33 / 35 |
| Signup warm | 267 / 413 | 20 / 22 |

Final dev logs: middleware 596 ms / 189 modules, login 6.9 s / 833 modules, signup 2.6 s / 841 modules. Auth pages were deliberately unchanged. Compare modes within this table; do not compare HTTP totals directly with the earlier browser timings. Production startup took 2.1 s; development startup 4.5 s. Temporary production and component servers were stopped; the original development service was restored on port 3000.

Prior safe public hosted probes: Auth settings 2,285/776/778 ms; anonymous posts `select=id&limit=0` 1,052/330/345 ms. No new hosted probe or mutation is needed for this repair. Hosted network remains a material possible contributor; authenticated refresh/token timing and database execution timing are not live-verified. No indexes, RPCs, RLS or database settings were changed.

## Validation and acceptance

- Backend: 95 tests passed, including authorization, concurrency barriers, invisible-entity denial, focused activity, selected-mentor filters, targeted sections, final stream/full response equivalence across four roles, and cancellation.
- Node: 28 tests passed, including auth/account state, stream parsing, prefetch isolation/expiry/consumption, mutation mapping and isolated PGlite business/security regressions. SQL ran only in disposable local PGlite, never hosted Supabase.
- Five-role real-client fixture: Student/Mentor/Company/University/Founder bootstrap, primary role labels, StrictMode single flight, missing endpoint and expired-session handling passed.
- Browser fixtures: notification race/mark-one/all, targeted section/write race, rapid A→B detail navigation, account switch and delayed native sign-out; role navigation/privacy/consent, Mentor workspaces/affiliations, campus decisions and history, forms/help and viewports.
- Viewport suites: 25 component/width, 35 ecosystem, 18 Mentor, 18 affiliation/recruitment, and 15 five-role shared interaction cases passed.
- Final TypeScript, lint, production build and `git diff --check` passed. Git emitted only its normal LF-to-CRLF notice for the editor wrapper; no whitespace error.
- Existing warnings: Supabase realtime dynamic-dependency build warning; Starlette/httpx test deprecation; Node module-type warning. No SQL/database warning from hosted execution because none was performed.

Remaining slowest paths by structure: cold dev compilation; community feed post→comment/reaction dependency; campus organization→progress dependency; large catalogs and authorized directory RPCs; per-space activity reads; hosted Auth/profile/network round trips. They are not ranked by real-account wall time.

**MANUAL ACCEPTANCE REQUIRED:** five real roles through sign-in → profile → primary role → workspace → overview; deployed stream flushing; real cold/warm details and rapid navigation; marks one/all during polling; mutation reflection on both sides of cross-role connections; logout/account switch with slow/failed network and multiple tabs; expired sessions; actual large data volume and hosted Supabase timing. No accounts or sessions were requested or created.

The existing University verification-flow issue remains separate: official verification controls campus management/publishing. This performance task neither changes that workflow nor silently marks a University verified. Reproduce and resolve it in a separately authorized functional task.

## Changed files

All paths below are relative to `C:\Users\Jai\nextgen`.

- Backend routes: `backend/app/api/routes/{applications,ecosystem,events,mentorship,opportunities,spaces,workspace}.py`.
- Backend services: `backend/app/services/catalog.py`, new `backend/app/services/workspace_sections.py`.
- API client/types: `src/lib/api/{client,types,workspace}.ts`, new `src/lib/api/{detail-reads,refresh-plan}.ts`.
- Student UI: `src/components/student/{CreateSpace,StudentActivity,StudentDetail,StudentExtras,StudentModules,StudentShell,WorkspaceProvider}.tsx`, new `DetailLink.tsx` in that directory.
- Role UI: `src/components/ecosystem/{Campus,Connections,Editor,Invitations,MentorOverview,RoleContext,RoleWorkspace,SpaceActions}.tsx`, new `EditorForm.tsx` in that directory (existing editor implementation moved without changing field validation).
- Loading: `src/app/dashboard/loading.tsx`.
- Tests: new `backend/tests/test_final_latency.py`, `tests/detail-reads.test.mjs`, `tests/final-latency-benchmark.py`, `tests/workspace-ui/section-refresh.mjs`; updated `tests/workspace-ui/{api.ts,main.tsx,performance.tsx,progressive.mjs,session.mjs}`.
- Report: `docs/final-latency-repair.md`.

Business logic changed: NO  
Cross-role connection semantics changed: NO  
Permissions weakened: NO  
RLS changed: NO  
Supabase migration created: NO  
Hosted database modified: NO  
Git push performed: NO  
Git merge performed: NO
