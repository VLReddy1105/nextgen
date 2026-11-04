# Second latency pass — local validation and remaining acceptance

Date: 2026-11-04. Repository: `C:\Users\Jai\nextgen`.

Local implementation is validated. **Real authenticated production latency is MANUAL ACCEPTANCE REQUIRED and is not declared fixed.** Access to the existing Chrome session was denied by the computer-use tool. No passwords, tokens, browser credential stores, new users, or hosted mutations were used to work around that denial. Isolated browser fixtures and signed-out Next.js pages were measured instead.

## 1. Branch and preservation

`feature/cross-role-latency-ui-fixes`, verified before and after changes. Existing uncommitted first-pass repairs and functional work remain. The existing untracked support-report migration predates this pass; it was not changed or applied. No branch, commit, push, merge, migration, environment, or hosted configuration operation was performed.

## 2. Files changed in this pass

Paths below are relative to `C:\Users\Jai\nextgen` and exclude files changed only by earlier work.

- `backend/app/api/routes/workspace.py`: progressive Student response and opt-in compact notifications; original full response remains the default.
- `backend/tests/test_progressive_workspace.py`: full-response parity, independent readiness, all-role notification count parity, failure and disconnect checks.
- `src/app/dashboard/layout.tsx`: pass authoritative server role to choose transport optimizations, never to authorize API calls.
- `src/app/dashboard/loading.tsx`: route loading boundary.
- `src/components/student/WorkspaceProvider.tsx`: progressive initial snapshots, targeted detail loading, readiness and race handling.
- `src/components/student/StudentModules.tsx`: section readiness boundaries on Student Overview.
- `src/components/student/StudentShell.tsx`: intent prefetch, secondary panel loading, lazy notification popover.
- `src/components/student/WorkspacePopover.tsx`: optional opening callback.
- `src/components/student/StudentExtras.tsx`: notification details loading/error/retry states.
- `src/components/student/StudentDetail.tsx`, `StudentActivity.tsx`: abort obsolete GETs and ignore their responses; detail refresh depends on the relevant module instead of every catalog.
- `src/components/ecosystem/MentorContextBadge.tsx`, `MentorAffiliations.tsx`, `RoleContext.tsx`: extract the unchanged badge from the heavier affiliation editor module.
- `src/lib/api/types.ts`, `workspace.ts`, `workspace-stream.ts`: readiness metadata, compatible API options, incremental UTF-8/JSON parsing.
- `tests/workspace-stream.test.mjs`: arbitrary transport fragmentation, truncated/error streams and aborted delivery.
- `tests/workspace-ui/navigation.ts`, `link.tsx`, `performance.tsx`, `progressive.mjs`: isolated prefetch mocks and progressive browser regression.
- This report.

## 3. Root causes found

The Student UI previously waited for a single complete workspace response. Profile readiness was coupled to all five catalogs, applications, full notifications, sessions and invitations. A slow unrelated catalog therefore delayed every primary page. The initial profile/reminder stage is followed by parallel module work, with additional dependent reads inside catalogs. A GET-like workspace load also invokes the existing reminder-writing RPC; it is not a purely read-only endpoint.

The shared shell imported the full Mentor affiliations module for a badge, pulling editor/action dependencies into that import graph. Detail requests had no AbortSignal and refreshed on unrelated catalog changes. Development cold compilation remains substantial. No measured evidence isolates hosted database execution from network/Auth time.

## 4. Student initial-load change

`GET /api/v1/workspace/progressive` uses the same `Current` authorization dependency, existing services, filters and per-request read deduplication. It finishes the existing reminder RPC and profile work before opening a cancellable read stream. It then emits the profile and each independent module as ready, through one browser API request and one backend authorization resolution.

The existing `/workspace` full API remains compatible. Initial Student rendering uses the progressive transport; later background refreshes preserve existing content. Profile completion and navigation become usable before secondary sections finish. Recommendations wait for all their inputs, applications for applications, project cards for projects, and activity counts for their corresponding modules. Missing data is explicitly loading, never a fake zero or empty list.

## 5. Login

Credential submission, Supabase sign-in, validated redirect and server refresh are unchanged. Earlier primary Student rendering improves the downstream loading architecture, but button-to-dashboard duration could not be measured. Removing authoritative checks or the existing server refresh without authenticated evidence would be unsafe. **No login/Auth speedup is claimed.**

## 6. Logout

The existing POST sign-out and 303 redirect remain unchanged. Existing session-change handling unmounts private provider state and ignores late old-account responses; its browser fixture passes. Added detail/activity GET cancellation reduces obsolete read work on unmount. Mutation requests are not aborted. **Real click-to-login logout timing remains unverified; no sign-out network improvement is claimed.**

## 7–8. Navigation and prefetch

A dashboard loading boundary allows route loading inside the persistent layout. Top-level sidebar links prefetch on pointer/focus intent once per mounted sidebar, rather than eagerly fetching every destination. Existing Next.js authorization remains in force. Already-loaded provider data remains shared across navigation. Projects does not await mentorship, opportunities, communities or events; its own project and invitation sections gate rendering. Opportunities waits for opportunities, not unrelated modules. The new fixture proves Projects can render while mentorship is deliberately unresolved, with one workspace request total.

No authenticated production click-to-render improvement or sub-500-ms guarantee is claimed. Intent prefetch itself can incur server/Auth work; its net hosted benefit requires real-account measurement.

## 9. Auth/session audit

The chain remains browser session acquisition → bearer request → backend Supabase user verification → profile/account/role validation. Middleware also performs session handling, and the authoritative Next layout uses `getSessionContext`, already React-cached within one server render. Backend actor/profile state is reused across all streamed sections. No new per-section authentication requests or cross-user authorization cache were added. Browser role metadata is not trusted. The separate middleware, server and backend trust boundaries were not collapsed.

## 10–12. Critical data, payload and right panel

| Surface | Critical inputs | Secondary inputs |
|---|---|---|
| Student Overview | authorized profile/completion | recommendations, applications, projects, mentorship, invitations, activity |
| Opportunities | opportunities | other catalogs, right panel, notification details |
| Projects/Communities | corresponding catalog and invitations | other catalogs, right panel |
| Events | events | other catalogs, right panel |
| Mentorship | mentors and sessions | other catalogs, right panel |
| Profile/settings/help | authorized profile; page's own endpoint where used | catalog aggregates and right panel |
| Notifications | compact counts then requested full details | unrelated catalogs |
| Non-Student overview | existing role aggregate | notification detail list now deferred |

The Student right panel displays a loading state until its shared inputs finish; it does not block primary content and makes no duplicate request. Non-Student aggregation remains whole-response based; this pass does not claim to remove that remaining coupling.

All five production roles initially request notification `id,read_at,source_module` only, preserving existing recipient filter, ordering, limit and unread calculations. Full notification rows load through the existing endpoint when the page/popover opens. After details have been requested, subsequent refreshes keep that detail state current. This trades one deferred detail request for reduced initial row/body transfer; it is not a round-trip reduction.

No arbitrary catalog truncation, eligibility changes or deletion of nested fields from shared contracts was introduced. Catalogs/directories may still be large. Actual populated hosted payload sizes are unverified. With empty controlled fixtures, full Student JSON was 1,535 bytes and the progressive stream 2,431 bytes: framing/readiness metadata adds 896 bytes. Streaming is an earlier-readiness improvement, not an overall empty-payload size reduction. Compact notifications omit title/message/action/history fields from the initial response; no live byte-saving percentage is available.

## 13. In-flight handling

Shared workspace reads remain coalesced and scoped to the mounted account. Stale full snapshots cannot overwrite newer targeted notification results, including during progressive delivery. Detail/activity controllers cancel superseded GETs and unmounted reads. Server stream cleanup cancels/drains remaining read tasks and closes per-request deduplicated reads. The reminder write finishes before streaming begins, and mutation APIs receive no cancellation signal. Stream failures are explicit and do not expose internal exception details. UTF-8 characters split across network chunks and interrupted streams are tested.

The request logging middleware's duration ends when response headers are returned; for streaming it must not be interpreted as full-body completion time. Reverse-proxy buffering must be checked in deployment despite `X-Accel-Buffering: no` and `Cache-Control: no-store`.

## 14. Round trips

| Scope | Before | After |
|---|---:|---:|
| Initial Student browser workspace API | 1 | 1 streaming |
| Controlled Student repository calls | 22 | 22 |
| Controlled Mentor / Company / University / Founder calls | 20 / 18 / 19 / 17 | unchanged |
| Warm provider module navigation workspace reloads | 0 | 0 |
| First notification detail opening after initial load | 0 | 1 deferred GET |
| Mark-one/all browser mutation + targeted read | 2 | 2 |
| Support/settings mutation refresh behavior | no workspace reload | unchanged |

Repository counts exclude the authoritative Auth user and profile admission calls. Dependent catalog calls vary with actual memberships/data. No additional reduction in repository round trips is claimed over the first pass.

## 15–18. Measurements

Primary production measurement was an isolated signed-out browser loading `/login`, waiting for the email input. It is **not authentication or a private dashboard trace**. Request counts include assets/prefetch observed until the input is visible and therefore vary with cache/scheduling.

| Public login page sample | First-pass reference ms | Second-pass ms | Difference (before − after) | Improvement | Requests before → after |
|---|---:|---:|---:|---:|---|
| Production first | 850 | 1,220 | −370 | −43.5% | 11 → 11 |
| Production warm 1 | 209 | 196 | 13 | 6.2% | 14 → 14 |
| Production warm 2 | 375 | 226 | 149 | 39.7% | 21 → 21 |
| Development first | 11,858 | 10,583 | 1,275 | 10.8% | not comparable → 7 |
| Development warm 1 | 1,344 | 745 | 599 | 44.6% | not comparable → 7 |
| Development warm 2 | 1,263 | 527 | 736 | 58.3% | not comparable → 7 |

These are descriptive differences between separate runs, not causal improvements. No login code changed. Production TTFB: 813 / 55 / 54 ms. Development TTFB: 10,004 / 482 / 299 ms. The development log reported middleware compilation 674 ms and `/login` compilation **7.2 s / 833 modules**, with server request times 9,120 / 507 / 393 ms. Cold compilation remains a major dev-only delay. Badge extraction does not prove a login compilation benefit; login's graph is separate.

Final production build passed: compile 18.6 s; 69 pages generated. Previous first-pass compile was 16.3 s. Build timing is noisy and not a route-latency benchmark. Dashboard overview First Load JS was about 169 kB, profile 172 kB, shared JS 103 kB. No bundle-size reduction is claimed from the dependency cleanup.

Controlled identical 50-ms repository delays, five samples, no HTTP/Auth/hosted data:

| Measurement | Before median | After median | Difference | Improvement | Calls |
|---|---:|---:|---:|---:|---|
| Student primary profile readiness | 115.70 ms (full response required) | 58.73 ms | 56.97 ms | 49.24% | 22 → 22 total |
| Student complete result | 115.70 ms | 121.54 ms | −5.84 ms | −5.05% | 22 → 22 |

The benefit is removing unrelated modules from the primary rendering barrier. It is not a 49% live dashboard improvement. Final fixture browser navigation after data: Opportunities 82 ms, Projects 120 ms, Communities 101 ms, Events 81 ms; one initial workspace load and zero additional workspace loads on those transitions. Fixture render-after-data was 160 ms. These exclude Next RSC/Auth and hosted latency and have no paired production baseline.

| Required authenticated flow | Before | After | Difference / % | Live request counts |
|---|---|---|---|---|
| Login → usable dashboard | MANUAL ACCEPTANCE REQUIRED | MANUAL ACCEPTANCE REQUIRED | unavailable | unavailable |
| Logout → login | MANUAL ACCEPTANCE REQUIRED | MANUAL ACCEPTANCE REQUIRED | unavailable | unavailable |
| Student initial dashboard | MANUAL ACCEPTANCE REQUIRED | MANUAL ACCEPTANCE REQUIRED | controlled evidence above only | unavailable |
| Student Overview → Opportunities | MANUAL ACCEPTANCE REQUIRED | MANUAL ACCEPTANCE REQUIRED | unavailable | unavailable |
| Student Opportunities → Projects | MANUAL ACCEPTANCE REQUIRED | MANUAL ACCEPTANCE REQUIRED | unavailable | unavailable |
| Projects → Communities → Events | MANUAL ACCEPTANCE REQUIRED | MANUAL ACCEPTANCE REQUIRED | unavailable | unavailable |
| Mentor Overview → Requests | MANUAL ACCEPTANCE REQUIRED | MANUAL ACCEPTANCE REQUIRED | unavailable | unavailable |
| Mentor Requests → Sessions | MANUAL ACCEPTANCE REQUIRED | MANUAL ACCEPTANCE REQUIRED | unavailable | unavailable |
| Company Overview → Opportunities | MANUAL ACCEPTANCE REQUIRED | MANUAL ACCEPTANCE REQUIRED | unavailable | unavailable |
| University Overview → Students | MANUAL ACCEPTANCE REQUIRED | MANUAL ACCEPTANCE REQUIRED | unavailable | unavailable |
| Founder representative transition | MANUAL ACCEPTANCE REQUIRED | MANUAL ACCEPTANCE REQUIRED | unavailable | unavailable |
| Notifications | MANUAL ACCEPTANCE REQUIRED | MANUAL ACCEPTANCE REQUIRED | lazy/targeted behavior tested | unavailable |
| Profile / Settings | MANUAL ACCEPTANCE REQUIRED | MANUAL ACCEPTANCE REQUIRED | unavailable | unavailable |
| Representative mutation | MANUAL ACCEPTANCE REQUIRED | MANUAL ACCEPTANCE REQUIRED | local semantic tests only | unavailable |

## 19–20. Remaining hosted latency and slowest page

Network/Auth/database percentages and the slowest authenticated page cannot be ranked from this evidence. Earlier anonymous probes showed variable hosted round-trip times; they do not identify database execution cost or account-specific timings. No authenticated live Student endpoint was called because it writes reminders. No recommendation to change indexes, RLS, region or Auth settings is justified by these measurements.

Confirmed remaining application costs: profile/reminder bootstrap before first streamed frame; full catalog work still runs; non-Student role aggregation remains coupled; authorization spans separate trust boundaries; opening notification details adds a deferred authenticated GET. Dev cold compile remains measured. Whether external latency is avoidable is unknown. Production proxy buffering and populated response sizes still need measurement.

## 21. Regression results

- Backend: **79 passed**, including auth/role/workspace/connection behavior, progressive parity, five-role compact notification semantics, explicit failure and cancellation.
- Node: **24 passed**, including isolated PostgreSQL migration/RLS/grant/relationship tests and stream parser cases. These databases are local test instances, not hosted Supabase.
- Browser: 25 general viewport cases; role navigation/decisions; 35 ecosystem viewport cases; 18 Mentor cases; 18 affiliation cases; 15 role/viewport help/interactions plus failure; progressive section loading; targeted notification races; session/account isolation; polling/coalescing/hidden tabs/unmount cancellation — passed.
- Student–University, Student–Mentor, Mentor affiliations, role opportunities, applications, projects, communities, events, notifications, support and profile/settings remain covered by existing regression suites.
- TypeScript, lint, production build and `git diff --check`: passed.
- Existing warnings: Supabase realtime dynamic dependency, Node module-type warning, Starlette TestClient deprecation and Git line-ending notices. No SQL warning from a hosted operation because no hosted SQL was run.

## 22. Manual acceptance still required

The owner should perform authenticated acceptance testing independently; the agent will not request browser or signed-in-session access. Capture each requested flow in production first, then dev, with a populated account for each role. Measure RSC/redirects/Auth, backend admission, first streamed frame, each section and last byte separately. Verify fast A→B→C navigation, refresh failure/retry, first notification opening and mark-one/all, sign-out/account switch during slow reads, profile updates, relevant role connections and populated right panels. Check proxy flushing and actual notification/catalog byte sizes. Do not interpret stream header-duration logs as total completion time. The live Student reminder call and any mutation acceptance require authorization for those hosted writes; none were performed in this pass.

Business logic changed: NO

Connections changed: NO

Permissions changed: NO

RLS changed: NO

Migration created: NO

Hosted database modified: NO

Git push performed: NO

Git merge performed: NO


## Continuation without personal browser access

Following the user's instruction, continued using repository inspection, automated isolated fixtures, logs and loopback HTTP only. Computer Use and personal browser/session access were not used or requested in this continuation.

Removed an additional detail-page waterfall: authorized project/community/opportunity/event/application/mentorship detail routes no longer await the corresponding catalog before mounting their own detail request. The API's authorization is unchanged. Results are keyed by kind and item ID, so the previously viewed item is hidden immediately on an item switch; aborted late responses cannot overwrite the new item. List pages retain their readiness requirements.

Additional/updated files: `src/components/student/WorkspaceProvider.tsx`, `StudentDetail.tsx`, `tests/workspace-ui/performance.tsx`, `progressive.mjs`, and new `tests/workspace-http-benchmark.py`.

The new reproducible benchmark launches a standalone fixture FastAPI app bound to an ephemeral loopback port. Its synthetic Actor override exists only in that test app, not the development or production application. It uses the production workspace routes and real HTTP streaming, with 50-ms simulated repository reads and no credentials, Auth calls or hosted writes.

| Loopback HTTP measurement, five samples | Median |
|---|---:|
| Full-response availability | 117.12 ms |
| First progressive profile frame | 51.44 ms |
| Complete progressive stream | 112.91 ms |

Earlier primary readiness: 65.68 ms (56.08%) in this synthetic setup. This is not a live-account performance claim. Both variants still execute the same module work. The automated fixture additionally verifies that detail navigation starts while catalog data is unresolved, does not reload the shared workspace, aborts superseded requests, ignores late old results, and hides the preceding item while the next item loads. StrictMode's deliberate initial effect replay is accounted for in request-count assertions.

Authenticated login/logout and cross-role production transitions: **MANUAL ACCEPTANCE REQUIRED**. Optimization and automated validation continue independently of those measurements.

Continuation validation: progressive/detail tests, targeted notification races, polling/coalescing, existing role navigation, 35 ecosystem viewport cases and account-switch/sign-out isolation passed. TypeScript, lint, production build (16.4-second compilation; 69 pages) and diff checks passed. The initial detail test assumed one mount effect; React StrictMode intentionally replays it, so the assertion now measures subsequent navigation relative to the observed initial count.

Production `/login` HTTP-only smoke check: three HTTP 200 responses, each 26,736 bytes. Headers arrived in 330.02 / 34.69 / 42.04 ms; complete HTML arrived in 344.26 / 48.13 / 51.52 ms. Each sample is one request, excludes JavaScript/assets/rendering/authentication, and is not comparable to the earlier browser usable-input timings. The sandbox initially denied loopback networking; the same local probe succeeded with loopback permission. No personal browser or hosted endpoint was involved. Temporary test/production servers were stopped and the development server restored.
