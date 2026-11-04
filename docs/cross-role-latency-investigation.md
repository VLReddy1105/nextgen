# Cross-role latency investigation

Date: 2026-11-04. Diagnostic only; no repair implemented.

## Scope and baseline

- Repository: `C:\Users\Jai\nextgen`.
- Branch: `feature/cross-role-latency-ui-fixes`.
- HEAD: `d6c1520` — Complete mentor affiliations and workspace improvements. Local `main` and `origin/main` pointed to this commit when inspected; no fetch was performed.
- Working tree was already dirty: 17 tracked files modified and 9 untracked files, including the functional/UI corrections, support authorization migration, tests and previous reports. These were preserved. This report is the only intentional new repository artifact for the diagnostic.
- Windows, Next.js 15.5.22 / React 19.1.1, existing development server at localhost:3000, FastAPI at 127.0.0.1:8000, existing shared public Supabase configuration. Public configuration was used internally but not printed.
- No prepared five-role authenticated sessions were available. No passwords, private tokens, database credentials, new users, live mutations, sign-in or sign-out operations were used.
- **All authenticated live role/page/action timings are NOT LIVE-VERIFIED.** Fixture timings are not substitutes for real-account acceptance timings.
- The live Student workspace GET was deliberately NOT called with authentication: it executes the reminder-writing RPC. An anonymous request returned 401 before that handler.

## Measured evidence

### Safe HTTP probes

Three sequential requests per target using one httpx client, 10-second timeout. Durations include client/network/service/response transfer; no database execution breakdown is available. Small samples are observations, not percentiles or an SLA.

| Target | Status | Samples (ms) | Response bytes |
|---|---|---|---|
| Development `/login` | 200 | 762, 303, 332 | about 45,612 |
| Local backend `/health` | 200 | 42, 12, 12 | 15 |
| Anonymous `/api/v1/workspace` | 401 | 18, 13, 11 | 84 |
| Hosted public Auth settings | 200 | 1,193, 285, 272 | 610 |
| Hosted REST profiles, `select=id&limit=0`, public key only | 200 | 817, 297, 768 | 2 |

The empty REST request retrieves no profile records. These probes establish material hosted round-trip cost on this machine, but cannot distinguish transit, gateway, TLS/connection setup, Auth/PostgREST work or database time. The first request to the hosted origin was slower; attributing all of that difference to TLS is not justified. No region comparison was made; **no region change is recommended**.

Authenticated notifications/opportunities/projects/mentor hub/context reads and simple authenticated RPC execution remain NOT LIVE-VERIFIED. Their authorization and aggregation paths were inspected and exercised offline. No query plan, hosted database timing, or database CPU evidence was available.

### Development browser measurement and production limitation

Fresh isolated Edge browser context, no login. Each measurement navigated to `/login` and waited for the email input. Browser startup is excluded; timing includes document/assets/browser scheduling and hydration sufficient for the input to exist, not a React profiler measurement.

| Sample | Input visible (ms) | TTFB (ms) | DOMContentLoaded (ms) | Load (ms) | HTTP requests observed |
|---|---:|---:|---:|---:|---:|
| 1 | 2,495 | 957 | 1,369 | 2,348 | 7 |
| 2 | 11,004 | 9,523 | 9,859 | 10,900 | 11 |
| 3 | 2,373 | 1,194 | 1,348 | 2,258 | 8 |

Existing development-server logs contain middleware compilation of 747 ms, home compilation of 10.5 seconds, and a home request of 13,695 ms. These are retained server-log observations, not a newly controlled authenticated navigation test. During the browser probe, logs recorded `/login` around 9,753 ms and favicon handling around 9,672 ms; other login requests were hundreds of milliseconds. The repeated Supabase realtime dependency bundling warning and a favicon 404 also appear. A realtime package import is not proof of an active realtime subscription.

Development compilation/asset work is a confirmed contributor to some multi-second observations, but the 9.5-second TTFB outlier cannot be assigned entirely to compilation from these logs. Concurrent local activity and scheduling can affect these samples. Normal first-route compilation is not a production defect.

**Production comparison unavailable:** `.next/BUILD_ID` was absent. `npm run start -- -p 3001` failed with “Could not find a production build in the '.next' directory.” The requested existing build could not be used. No replacement build was generated or source changed. No production navigation numbers, production speedup ratio, or production rendering diagnosis is claimed.

### Five-role component coverage

Existing Vite component harness, Edge, fixture state `scenario=roles&state=populated`. Values are single full-document fixture loads until `<main>` exists, not actual Next sidebar transitions, data-ready timestamps, or login measurements. The harness injects workspace data and aliases API calls. It does not execute real middleware, RSC navigation, backend authentication, or hosted queries. Non-Student/non-Mentor profile fixture rendering does not reproduce the real server profile page.

| Role | Fixture page timings in ms |
|---|---|
| Student | overview 2,895 (first cold fixture load); opportunities 325; applications 265; projects 286; communities 332; events 264; mentorship 226; notifications 283; profile 264; settings 476; help 269 |
| Mentor | overview 296; affiliation (`mentors`) 250; mentor opportunities 297; students 217; requests 208; mentorship (`connections`) 203; sessions 298; projects 291; notifications 250; profile 306 |
| Company | overview 317; opportunities 371; projects 304; mentors 252; events 271; notifications 277; settings 273; Applicants (`applications`, separate browser run) 849 |
| University | overview 241; students 244; student connections 263; opportunities 353; projects 271; communities 313; events 314; announcements 473; mentors 353; notifications 294; profile-shell fixture 262; Applicants (`applications`, separate browser run) 759 |
| Founder | overview 225; projects 255; communities 266; connections 204; events 204; notifications 240; profile-shell fixture 207; settings 250; help 266 |

Founder coverage above includes every module in the current `roleModules.founder` list. Initial exploratory `applicants` paths were not the real module key and are excluded. Founder opportunities/applicants exploratory fixtures are also excluded because those are not current visible Founder modules.

Each warm fixture load observed 50 HTTP requests; the first cold fixture observed 51. A classification follow-up showed 1 document + 49 JavaScript module requests, **zero real application API calls**. Two script filenames contain `/api/`; those are source imports, not FastAPI calls. Vite module counts do not represent production bundles. No hosted Auth/REST/RPC/Storage/Realtime requests were needed for these fixtures.

### Actual shared-provider harness

Ran the existing performance assertions in memory with artifact writing removed from the execution string (source file unchanged):

- StrictMode + explicit refresh + focus shared **one** pending workspace request.
- Rendering overview after resolving data: 165 ms.
- In-harness module switches: opportunities 82 ms, projects 792 ms, communities 61 ms, events 38 ms.
- Module changes did **not** increment workspace request count.
- Slow 95-second request did not overlap polling; fresh focus did not refetch; polling resumed after completion; hidden tab paused; stale visible tab refreshed; unmount aborted; background failure retained data; mutation during an existing read produced the necessary subsequent refresh. All assertions passed.

The 792 ms project sample is an isolated observation with no profiler attribution. Do not label it a proven project rendering defect. Most importantly, this test disproves an unconditional shared-workspace fetch on every module change in this harness.

### Backend aggregation and waterfall experiment

Executed the actual `workspace()` function with `Actor` fixtures and an in-memory repository. Every upstream operation awaited an artificial 50 ms sleep; Windows scheduling introduced variation. Empty domain tables were used, plus a named verified university organization to exercise the University tail. No external calls occurred; even the Student reminder RPC was only a mock. Authentication and HTTP serialization were outside this experiment.

| Role | Total (ms) | Upstream calls after exact-read deduplication | REST / RPC | JSON result bytes |
|---|---:|---:|---|---:|
| Student | 122 | 22 | 20 / 2 | 1,532 |
| Mentor | 185 | 20 | 17 / 3 | 1,004 |
| Company | 140 | 18 | 16 / 2 | 762 |
| University | 186 | 19 | 16 / 3 | 780 |
| Founder | 125 | 17 | 16 / 1 | 727 |

These are controlled empty-account call counts, not universal live counts. Populated projects add task/stat reads; communities/events add stats; populated mentor lists add badges. No conclusion about real payload size or Python cost at 500 rows follows from empty fixtures.

Measured waterfall summaries (all times relative to handler start, mocked I/O):

- **Student Overview:** 0–58 ms reminder RPC plus student details/membership/project-members reads in parallel; 59–121 ms catalog/application/notification/session/invitation reads plus directory RPC; output about 122 ms. Populated catalogs can add further task/stats/badge stages.
- **Mentor Overview:** 0–61 ms broad shared reads and mentor hub; 61–123 ms `eco_applicants`; 123–184 ms mentor profile + `eco_connections`; ready about 185 ms.
- **Company Overview:** first broad batch 0–78 ms (some finished at 46 ms); `eco_applicants` 79–140 ms; ready about 140 ms.
- **University Overview:** first broad batch 0–63 ms; applicants RPC 63–125 ms; `eco_campus_progress` 125–186 ms; ready about 186 ms.
- **Founder Overview:** broad batch 0–63 ms; applicants RPC 63–125 ms; ready about 125 ms.

The real API adds authoritative Auth user validation, then profile lookup, **before** these handlers. That creates two additional sequential remote stages. The hosted public probe times must not be substituted as measured authenticated stage timings.

The old standalone benchmark failed with its stale fixture shapes after an in-memory adaptation; that failed run is not performance evidence. A first diagnostic fixture lacked an organization name and was corrected only in memory. The successful experiment above used complete minimal fixture shapes. Existing tests were not edited.

## Request architecture and page switching

The dashboard layout owns StudentShell/WorkspaceProvider. Sidebar links use Next Link, so normal navigation is App Router navigation, not an unconditional document reload. Layout/provider state persists across ordinary dashboard routes. React `cache` deduplicates session work within a server render; it is not a cross-request cache. No pathname-triggered workspace refresh exists in the provider.

| Situation | Request shape from code; exact live count NOT LIVE-VERIFIED |
|---|---|
| Initial dashboard | Next document/RSC work and guard, then one browser workspace API request; backend auth + profile precede aggregate |
| Shared-data list/overview/notifications route | RSC request when route not already cached/prefetched; no unconditional new workspace fetch from module change |
| Poll/focus | Visible stale provider refresh, about 30 seconds after settlement; one shared aggregate, not separate sidebar/right-panel requests |
| Campus Students/Connections/Announcements | Additional `/campus` fetch on mount and whenever workspace `data` identity changes |
| Student detail | Additional detail fetch on mount and workspace snapshot changes via `[load, data]` |
| Student activity views | Detail request per joined space, in parallel: a client fan-out/N+1 pattern that scales with joined spaces |
| Student profile / Settings | Dedicated profile/settings fetch on mount; other role profile server pages have their own guarded organization lookup |
| Mentor Students/Requests/Sessions/Profile | Uses aggregated mentor state; `Mentor.tsx` does not independently fetch each mode |
| RoleContext/sidebar/right panel | Consume shared workspace; no independent unconditional copies of the aggregate found |
| Mutation through provider/Editor | Mutation request awaited, then entire workspace refresh awaited; some detail actions instead use detail refresh context |

Browser API wrapper awaits `auth.getSession()` then fetches with `cache: no-store`. `getSession()` is often local and is **not proof of a remote refresh**. Authenticated backend calls each validate `/auth/v1/user` then read profile/account state. Next middleware also calls `getUser`; protected server rendering calls cached session context (`getUser` then profile). Separate layers repeat identity/account verification, but within-render cache prevents assuming layout+page always duplicate it. Exact remote request frequency depends on route cache/prefetch/session state.

No-store means no HTTP response reuse for browser backend fetches, but shared provider state still reuses loaded data. Polling causes component rerenders and some secondary fetches; no React CPU profile proves excessive render work. No route-level `loading` file was found under the dashboard during this audit. Large initial data gating and guarded server navigation can therefore be perceived as navigation waiting rather than immediate content readiness.

Exact reads are deduplicated within one workspace call. Different filters/order/bounds still lead to separate organization/opportunity/application queries: these are overlapping concerns, not necessarily identical duplicates that can safely be deleted. Workspace stats are batched by kind, not one RPC per card. Normal FastAPI uses a shared httpx pool (100 connections, 30 keepalive) rather than creating a client per query. No evidence supports blaming routine per-query client construction in this path.

## Login, logout and mutation breakdown

**Login click-to-dashboard: NOT LIVE-VERIFIED at every authenticated stage.** Code order: `signInWithPassword` → session established → router push → router refresh → middleware/server session guard → profile/account/role resolution → workspace browser fetch → backend Auth validation → backend profile read → aggregate → render. There is no defensible numerical breakdown or dominant live stage without a signed-in trace. The push-plus-refresh is a candidate for extra server work, not a measured duplicate. Anonymous login-page loading numbers above are not login duration.

**Logout click-to-login: NOT LIVE-VERIFIED.** Form POST `/auth/signout` → server Supabase `signOut()` → 303 redirect `/login` → middleware/page/assets. This is intentionally a full document navigation. No separate multi-request cleanup loop was found. Session revocation was not exercised under the no-write diagnostic constraint.

Support submit, mentorship action, application action, project save, and mark-one/mark-all notifications were inspected without live mutations. Provider `mutate` and Editor wait for refresh before completing their success path. Therefore perceived submission time can include a small mutation plus an expensive aggregate and subsequent Campus/detail fetch. Notification read-one/read-all also use this pattern. Some detail actions use local detail refresh instead, so full aggregate is not universal. Notification/activity writes inside RPC transactions do not necessarily become extra browser round trips.

Actual mutation duration versus refetch duration is **NOT LIVE-VERIFIED**. The provider harness verified the ordering and invalidation behavior, not real SQL write performance. No fabricated timing is assigned to support, application or notification writes.

## SQL/RPC review

`eco_mentor_hub` builds directory, affiliations, opportunities and applications JSON with nested progress/history projections. Several top-level lists are bounded at 500; nested relationship aggregates are not all independently bounded. It is included in shared Company/University/Mentor workspace loading even outside the affiliation page. `workspace_stats`, directory, campus progress and connections can also extend the aggregate critical path. These are candidates for query-plan/payload investigation; **none has been proven the slowest live RPC**.

Repository REST reads default to a 500-row limit with `select=*`; ecosystem activity is explicitly 30. This is broad bounded aggregation, not generally unbounded REST fetching. Python performs joins/filtering/ranking, including repeated list scans; CPU/serialization at realistic dataset size remains unmeasured.

Existing migrations include notifications `(recipient_user_id, created_at desc)`, applications `(student_id, updated_at desc)`, application-history `(application_id, created_at)`, project task/project-member/user indexes, university membership student/status and university/status indexes, and mentor affiliation organization/status plus unique active/pending relationship indexes. Their existence does not prove optimal plans for every RPC/RLS helper. Obtain scoped read-only EXPLAIN evidence and realistic row counts later before proposing composites for publication owner/status/order or nested hub joins. **Database/index changes required now: NO demonstrated requirement.** Potential future index need is unproven, not ruled out.

## Ranked contributors and recommended repair order

Ranking is diagnostic priority based on measured local evidence and verified architecture, NOT a measured allocation of total live latency. No critical defect is asserted without evidence.

| Rank | Contributor | Class / impact | Evidence and recommendation | Risk / likely files | DB change |
|---|---|---|---|---|---|
| 1 | Development server compilation/asset work | F / HIGH in development | Logs show 10.5 s compilation; browser outlier 11 s. First obtain a valid isolated production baseline; do not treat normal compilation as production regression. | Low measurement risk; build/start workflow, dashboard route loading | No |
| 2 | Broad aggregate with serial tails gates initial usability | B + possible C / HIGH | Actual handler mock: 17–22 calls even empty; Mentor/University third stage. Consider separating critical page data and optional projections after tracing realistic accounts. | Medium/high data-readiness risk; `backend/app/api/routes/workspace.py`, `services/catalog.py`, `services/mentors.py`, `services/mentor_affiliations.py` | Not necessarily |
| 3 | Repeated authoritative identity/profile checks | E + B / potentially HIGH | Middleware, server render and each API authenticate separately; backend two serial requests. Measure before changing; preserve revocation/account-status enforcement. | High security risk; middleware, `lib/supabase/session.ts`, backend dependencies | Not necessarily |
| 4 | Hosted round-trip cost amplifies serial work | D / MEDIUM–HIGH observed, exact attribution unknown | Public calls 272–1,193 ms. Reduce unnecessary trips only after tracing; retain pooled transport. No region-move evidence. | Medium architectural risk; API/service boundaries | No demonstrated need |
| 5 | Mutation waits for full refetch, snapshot-driven secondary reads | A + B / potentially HIGH for actions | Confirmed ordering and Campus/detail dependencies; consider scoped invalidation and visible mutation success separately from background reconciliation. | Medium stale-data/consistency risk; WorkspaceProvider, Editor, Campus, StudentDetail, StudentExtras | No |

Expected/acceptable (G / LOW): one initial authoritative load, security checks required to enforce access, bounded visible-tab reconciliation, intentional logout redirect. Frontend rendering (A / UNKNOWN-to-MEDIUM): fixture render/switch numbers are modest in most samples, but one 792 ms outlier needs profiling; not proven the cross-role root cause. Database execution (C / UNKNOWN): SQL complexity is visible, actual time is not.

Proposed sequence after separate authorization: establish production and real-account traces → reduce avoidable critical-path aggregation → assess redundant server refresh/auth work without weakening guards → narrow mutation refreshes and data-dependent secondary reads → profile rendering → inspect only SQL plans still shown slow. Add database changes only if those plans justify them. No caching/polling/concurrency/auth/UI changes were made here.

## University opportunity verification

Current code, not a live mutation test:

1. Unverified University CREATE draft: **NO**.
2. Unverified University EDIT draft: **NO** through `eco_opportunity_save`.
3. Unverified University PUBLISH: **NO**.
4. Verification is **not currently publish-only**. The RPC checks verified campus context before status-specific publication rules.
5. `can_manage_university` requires an owned official University organization, `verified=true`, active owner profile, and primary University role. Account onboarding/readiness and organization verification are distinct.
6. Company does not have the same University verification condition. Ordinary opportunity save still requires valid ownership/role/readiness. Mentor opportunity management has its own official-organization authorization.
7. RoleWorkspace's `canPublish` controls creation availability too, and is false for an unverified University; this explains the missing Create Opportunity control. Wording that says only “before publishing” understates the actual gate.
8. Safest immediate product recommendation: explain that verification is needed to create/manage campus content and give an actionable verification path. Draft-first/publish-after-verification can be a product decision, but is **not the current architecture** and is not merely a UI unlock. It needs explicit RPC/RLS review to guarantee drafts remain owner-only and do not send notifications or expose campus content. Do not loosen `can_manage_university` globally to enable drafts because it protects other campus operations.

Organization verification is a protected organization field. SQL guards allow privileged administration/platform-admin paths; ordinary University users cannot self-verify. No dedicated verification-request workflow or admin verification screen was found in the current app/backend source. The generic pending-approval page is account-status approval, not an organization-verification workflow. Settings shows email/account status; help explains verification is required, but no end-to-end University verification submission/status/resolution process was found. An external/manual operational process may exist, but was not established by this code audit. This missing actionable path is a UX blocker. No verification system was invented or implemented.

## Validation and remaining acceptance work

- Existing offline backend performance, role-connections and mentor-workspace tests: **28 passed in 1.32 s**, run from backend with pytest cache disabled. First invocation from repository root failed import collection; rerun used the correct working directory. No test source changed.
- Existing provider performance assertions passed in the isolated browser, including no navigation-triggered aggregate, coalescing, polling visibility, cancellation and mutation invalidation.
- Five-role fixture rendering was sampled as documented; it is not full role acceptance, real login testing or a production benchmark.
- Production startup failure and stale benchmark fixture failure are disclosed above, not counted as successful measurements.
- Later acceptance needs an available production build and authorized existing real sessions for all roles: click-to-ready RSC traces, Auth validation/refresh timing, per-upstream FastAPI spans, realistic payloads, SQL plans, login/logout, and mutation-versus-refresh breakdown. Student live workspace/action testing requires separately authorized write scope because the GET invokes reminder writes.
- No source, tests, env, migrations, database configuration or hosted records were changed for latency. Existing development services were left running; the temporary fixture server was stopped after measurements. No Git push/merge/switch/reset/restore was performed.

Latency fixes implemented: NO
Frontend source modified for latency: NO
Backend source modified for latency: NO
Supabase migration created for latency: NO
Hosted database modified for latency: NO
Git push performed: NO
Git merge performed: NO
