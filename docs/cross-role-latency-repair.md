# Cross-role latency repair

2026-11-04 — local changes only. Repository `C:\Users\Jai\nextgen`, branch `feature/cross-role-latency-ui-fixes`, HEAD `d6c1520`.

## Outcome and limits

Implemented safe read parallelism, scoped notification refresh, removal of irrelevant support/settings refetches, protection against stale in-flight notification responses, account-scoped workspace lifetime, and an explicit static favicon that avoids accidental marketing-route compilation. Existing uncommitted functional/UI and support-migration work was retained.

No business authorization checks, RPC definitions, queries' filters/bounds, write order, database schema, migrations, RLS, grants, account verification, opportunity eligibility, affiliation consent, or cross-role connection semantics were changed. All original endpoints remain compatible. Complex relationship mutations retain full reconciliation where multiple sections can change; this task does not claim every refresh can safely be removed.

**Real signed-in five-role navigation, sign-in, sign-out, and hosted mutations: MANUAL ACCEPTANCE REQUIRED.** No credentials or private tokens were requested/used. No users or hosted records were created. Authenticated Student workspace GET was not called live because it writes reminders. Backend timing comparisons below are explicitly controlled fixtures, not real Supabase timings.

## Changes, rationale and risk

| Original behavior | Repair | Risk / preservation |
|---|---|---|
| Application names RPC waited for application/opportunity/organization reads | Start these independent authorized reads together | Same RPC, filters, output enrichment, role condition and error handling |
| Mentor profile/connections waited for the entire shared aggregate | Fetch authorized Mentor inputs alongside other reads; compute project matching only after projects and inputs arrive | Matching and permissions unchanged; existing Mentor tests retained |
| University overview campus progress waited behind unrelated sections | Keep organization→verified-campus progress dependency inside its own parallel branch | Still selects the owned University organization, checks verification, then calls the same RPC |
| Campus endpoint made six independent reads sequentially, then progress | Parallel first six reads; progress still waits for owned verified organization | RLS, narrow name projection, invitation visibility and verified-campus gate unchanged |
| Mark-one/all refreshed every workspace section | Reuse existing recipient-scoped `/notifications` read; merge notifications, count and module unread counters atomically | No optimistic permission changes; failure retains previous data; old full snapshots cannot overwrite a newer notification result |
| Support report and settings save reloaded unrelated workspace data | Explicit `none` refresh scope after confirmed save | These results are owned by their form; the shared aggregate contains neither support reports nor saved preferences |
| Notification-only changes retriggered Campus/detail/activity requests | Depend on the relevant stable sections instead of the whole workspace object | Full workspace responses still replace those sections, preserving existing cross-role reconciliation |
| User-scoped provider lifetime was implicit | Server identity+role key; sign-out/account-change event immediately unmounts private state and asks the server to reconcile | Browser identity is used only to clear state, never authorize; server checks remain authoritative; pending old-account reads cannot populate a new provider |
| Missing favicon request fell into marketing `[slug]`, compiling it during login | Serve existing brand mark as `/favicon.svg` and declare it in root metadata | Public asset only; no route destination or auth change |

The shared provider already persisted across child routes and coalesced requests. Those features, 30-second visible-tab polling, background-data retention, cancellation and failure behavior were preserved. No global user cache or shared authenticated Supabase client was introduced. `createBrowserClient` retains the existing library convention; backend httpx pooling remains unchanged.

## Reproducible backend before/after

`tests/workspace-latency-benchmark.py`: actual workspace function, five `Actor` fixtures, empty domain tables plus a verified organization, 50 ms artificial wait per repository operation, three repetitions, median. No network, authentication or HTTP serialization in this measurement. Windows timer scheduling explains why stages exceed nominal 50 ms. Same fixture and source call shapes before/after.

| Workspace | Before median ms | After median ms | Observed reduction | Calls before → after | RPCs before → after |
|---|---:|---:|---:|---|---|
| Student | 112.81 | 110.87 | 1.7%, noise; no initial-load gain claimed | 22 → 22 | 2 → 2 |
| Mentor | 169.95 | 60.30 | 64.5% | 20 → 20 | 3 → 3 |
| Company | 118.04 | 58.40 | 50.5% | 18 → 18 | 2 → 2 |
| University | 176.43 | 116.59 | 33.9% | 19 → 19 | 3 → 3 |
| Founder | 110.15 | 52.21 | 52.6% | 17 → 17 | 1 → 1 |

Raw before samples: Student 112.81/108.66/115.32; Mentor 165.11/169.95/175.53; Company 108.39/118.04/118.92; University 173.15/176.43/180.27; Founder 114.92/107.81/110.15 ms.

Raw after samples: Student 111.13/109.52/110.87; Mentor 60.30/61.74/56.70; Company 65.83/57.57/58.40; University 116.15/123.08/116.59; Founder 52.21/55.33/51.96 ms.

University `/campus`, identical empty mocked reads with owned verified organization: 406.37/379.68/381.63 → 114.76/121.32/106.54 ms; medians **381.63 → 114.76 ms (69.9%)**. Seven calls remain seven, but seven serial stages become two. Structural tests enforce the overlap and ensure progress still waits for verification context.

Authentication remains two sequential authoritative upstream checks before protected handlers. It is not included in the table and has not been weakened. Python processing versus SQL execution cannot be isolated from these artificial I/O experiments; no claim is made about actual database execution speed. Output shape and empty-fixture JSON sizes remained unchanged. Populated accounts have extra task/stat/badge work and need separate real-account traces.

## Request counts and post-action behavior

| Flow | Before | After | Evidence |
|---|---|---|---|
| Module switch with shared data already loaded | 0 extra workspace fetches | 0 | Actual provider browser assertions, preserved behavior |
| StrictMode + explicit refresh + focus during pending read | 1 coalesced workspace request | 1 | Existing performance harness |
| Notification mark-one/all | Mutation + full workspace GET | Mutation + notifications GET | Actual provider and actual notification Action wiring tested |
| Post-notification aggregate data calls, Student/Mentor/Company/University/Founder empty fixtures | 22 / 20 / 18 / 19 / 17 | 1 each | Before aggregate counts measured; replacement listing uses one recipient-scoped read |
| Support report save | Mutation + full workspace GET | Mutation only | Explicit scope and no-refresh provider assertion |
| Settings save | Mutation + full workspace GET | Mutation only | Explicit scope and no-refresh provider assertion |
| Campus/detail/activity after notification-only update | Dependent fetches retriggered by whole-object replacement | Unchanged relevant sections no longer retrigger those reads | Stable-section dependencies; full refresh fixture still verifies campus decisions |
| Membership, application, affiliation, invitations, create/update flows | Server confirmation + existing reconciliation | Preserved unless already detail-scoped | No speculative small patch across relationship boundaries |

These counts exclude normal auth calls and route/static requests. For notification actions the number of browser API requests is still two; the important reduction is downstream work. The one-read replacement reduces empty-fixture post-action data calls by 94.1–95.5%. Support/settings eliminate the redundant refresh completely (two browser API requests become one, 50% fewer); no real write timing is claimed.

No optimistic writes were added: notifications wait for server mutation and authoritative listing. Targeted refreshes coalesce and repeat when another mutation occurred during the read. Generic mutations keep the original full-refresh invalidation. Separate notification revision tracking prevents old full snapshots restoring unread state. Failures surface through existing Action/link error handling.

## Browser, development and production measurements

Fresh Edge contexts; anonymous `/login`, wait for email input. These are page rendering measurements, **not credential submission or dashboard usability**. Production baseline was built before application changes and started with `npm run start -- -p 3001`. Production and development did not run against the same `.next` output simultaneously.

| Measurement | Before | After before favicon fix | Interpretation |
|---|---|---|---|
| Production first login page | 823 ms, TTFB 442 ms, 10 requests | 1,005 ms, TTFB 606 ms, 10 requests | Slower cold sample; no cold-login improvement claimed |
| Production warm login page samples | 194 / 189 ms; TTFB 56 / 47; 13 / 13 requests | 191 / 161 ms; TTFB 55 / 32; 10 / 13 requests | Warm median 191.5 → 176 ms (8.1% observed difference), too small a sample for a performance guarantee |
| Provider render after data | 154 ms | 108 ms | Controlled fixture; not live first dashboard |
| Student fixture Overview → Opportunities | 76 ms | 68 ms | Zero added workspace requests in both; no causal speedup claim |
| Student fixture Opportunities → Projects | 102 ms | 66 ms | Small samples; no causal speedup claim |
| Subsequent fixture Communities / Events switch | 99 / 59 ms | 69 / 40 ms | Preserved shared-data navigation |

The browser module timings are single samples influenced by local scheduling. The extended after-fixture also contains one notification for the new race tests, so it is not a strictly identical render payload. No source optimization was specifically aimed at these already-cached local list switches; no improvement percentage is attributed to them. Backend structural improvements use identical before/after fixtures and are stronger evidence.

**Final production build, including favicon:** 850 / 209 / 375 ms to input visibility; TTFB 424 / 57 / 46 ms; 11 / 14 / 21 observed requests. `/favicon.svg` was requested in each sample. Against the original baseline, cold visibility was 3.3% slower and the two-sample warm median was 292 vs 191.5 ms (52.5% slower). Warm TTFB median was unchanged at 51.5 ms. These small visibility/request-count samples include browser scheduling and asynchronous route prefetch; they do not isolate rendering CPU or prove a production regression/improvement. **No production login-page speedup is claimed from the final results.** The earlier intermediate result is retained for transparency, not selected as the final outcome. Authenticated production dashboard gains remain unverified; controlled backend gains and eliminated post-action calls are the substantiated improvements.

Development first run after the initial repairs, before favicon fix: input visible 10,653 / 7,376 / 1,739 ms; TTFB 9,092 / 5,991 / 745 ms. Logs: login compilation 6.6 s; **marketing `[slug]` compilation 4.9 s triggered by `/favicon.ico`**, favicon handling 6,123 ms then 404s. This reproduced repeated dev delay even on anonymous navigation.

After adding explicit static favicon and restarting development: input visible 11,858 / 1,344 / 1,263 ms; TTFB 10,371 / 291 / 264 ms. Browser requested `/favicon.svg`, which returned 200, and logs no longer showed marketing-route compilation. Login itself still compiled in 7 s. The second load no longer pays the accidental marketing compile; the cold sample is worse and **normal cold development compilation is not solved**. Restart/compiler caches and host load are not controlled enough to claim a universal cold-route percentage.

The original diagnostic's 10.5-second home compile is historical context, not a like-for-like baseline for the login route. Build compilation was 16.1 s before and 16.7 s after the initial repairs; no broad bundling improvement is claimed. No aggressive code splitting was introduced without a measured benefit.

### Required flow coverage and unavailable timings

| Flow | Before/after status |
|---|---|
| Sign in (Auth → role checks → dashboard) | MANUAL ACCEPTANCE REQUIRED; no real credential submission |
| Sign out → login | MANUAL ACCEPTANCE REQUIRED; fixture verifies immediate private-state removal, not live Auth revocation |
| Production first dashboard / sidebar route switch | MANUAL ACCEPTANCE REQUIRED for all five roles |
| Student Overview → Opportunities → Projects | Provider component timings above; actual authenticated RSC transition remains manual |
| Mentor Overview → Requests → Sessions | Existing role/Mentor browser workflows pass; real production timing manual |
| Company Overview → Opportunities → Applicants | Existing role/viewport/database workflows pass; real production timing manual |
| University Overview → Students → Opportunities | Campus and role workflows pass; controlled backend gain above; real production timing manual |
| Founder visible modules | Existing role/shared-interaction fixtures pass; real production timing manual |
| Notifications / Profile / Opportunities / Projects pages | Fixture coverage and shared-state checks pass; no invented authenticated production timings |
| Representative form mutation + refresh | Support/settings redundant refresh eliminated; notification narrow refresh tested; real hosted write duration manual |

## Auth, routing, providers and remaining architectural decisions

- Internal dashboard links already use client-side Next navigation. Existing `window.location` references mostly read origin/query strings for invitation links or return paths; they are not hard reloads to remove indiscriminately.
- Login still uses the existing Auth flow and guarded destination. Its push/refresh sequence was not removed without real-session evidence that server-rendered auth state remains correct. Backend profile/account checks and Next middleware/server checks remain authoritative. No cross-request authorization cache was added.
- Logout still performs Supabase sign-out and its existing 303 redirect. There was no proven duplicate cleanup to remove. A session event now immediately unmounts private client state; actual revocation and redirect remain unchanged.
- Dashboard provider is keyed by server-confirmed identity/role. Shared state persists within the same identity/role across page changes. A changed account cannot inherit a previous user's in-flight result. The client event handler cannot grant access.
- Shared right panel/RoleContext continue consuming the same snapshot. No separate count/notification fetch was added for every navigation.
- Local search/filter/sort behavior remains local and unchanged. No speculative memoization or debounce changes were needed.
- Initial aggregation still returns its full compatible response. Overview cards/right panels and subsequent modules consume those sections; splitting it without real-account readiness traces would risk empty/stale views. Mentor/Company/University/Founder gain from shorter read dependency chains, not removed data.
- Student initial reminder-write ordering is preserved. Student initial-load mock timing is effectively unchanged; its concrete gains are targeted actions and avoiding notification-triggered secondary reads. A future dedicated overview projection needs separate design/acceptance.
- Student activity still has per-joined-space detail reads. Reusing bounded catalog tasks as though they were complete details could change results; no unsafe N+1 substitution was made. Notification-only updates now avoid repeating this fan-out.
- No database/index changes were implemented. SQL plan and realistic-payload review for mentor hub, stats, directory and campus projections remains a documented follow-up rather than an unproven index migration.

## Hosted Supabase contribution after fixes

Safe public-key-only probes after repairs: Auth settings 1,368 / 3,299 / 390 ms; REST `profiles?select=id&limit=0` 314 / 811 / 366 ms, all 200. No profile records were retrieved. Earlier diagnostic samples were Auth 1,193 / 285 / 272 and REST 817 / 297 / 768 ms.

Hosted round-trip cost remains hundreds of milliseconds with an occasional multi-second outlier. Code changes do not make that network faster. Exact network/SQL/Auth/region fractions of a real dashboard remain unmeasured; applying public timings to authenticated RPCs would be misleading. We reduce serialization of independent calls and eliminate irrelevant calls after small actions. No region/configuration change is recommended on these samples alone.

Slowest remaining paths cannot be ranked live without account traces. Likely investigation priorities are populated Student initial aggregate, mentor hub JSON projections, activity detail fan-out and protected route/auth checks. These are priorities, not measured slowest-screen claims.

## Changed files for this repair

Application code:

- `backend/app/api/routes/ecosystem.py`: Campus read parallelism.
- `backend/app/api/routes/workspace.py`: independent organization/Mentor branches; existing University-selection correction retained.
- `backend/app/services/catalog.py`: applicant names read parallelism.
- `backend/app/services/mentors.py`: separate authorized reads from pure projection.
- `src/components/student/WorkspaceProvider.tsx`: scoped mutations, targeted notification reconciliation and race protection.
- `src/components/student/StudentModules.tsx`: Action forwards refresh scope.
- `src/components/student/StudentExtras.tsx`: notification/support/settings scopes; prior Help work retained.
- `src/components/student/StudentShell.tsx`: notification-menu scope and session-state invalidation; prior menu/sidebar work retained.
- `src/components/student/StudentDetail.tsx`, `StudentActivity.tsx`, `src/components/ecosystem/Campus.tsx`: relevant-section refresh dependencies.
- `src/lib/api/workspace.ts`: existing notifications-list API wrapper.
- `src/app/dashboard/layout.tsx`: identity/role key and server identity passed to shell.
- `src/app/layout.tsx`, `public/favicon.svg`: explicit static existing-brand favicon.

Validation:

- `backend/tests/test_latency_reads.py`: structural overlap and dependency-order tests.
- `tests/workspace-latency-benchmark.py`: reproducible five-role offline benchmark.
- `tests/workspace-ui/performance.tsx`, `targeted-refresh.mjs`: real provider/notification action scope, races, counts, errors.
- `tests/workspace-ui/session-client.ts`, `session.html`, `session.tsx`, `session.mjs`, `vite.config.mjs`: isolated real-shell account-switch/sign-out tests using synthetic events, never private tokens.
- `tests/workspace-ui/main.tsx`: full JSON fixture refresh now clones nested data, matching real API response identity behavior.
- This report. Pre-existing changes in other files remain separate and untouched by the repair.

## Regression evidence

- Full backend suite: **74 passed**, including new structural concurrency tests and existing security, support ownership, role, Mentor and cross-role tests.
- Node suites: **21 passed**, including auth routing/account admission, role modules, shared config, and isolated PostgreSQL/PGlite database/RLS suites. All migrations run only in the isolated test database; nothing was applied to hosted Supabase.
- Browser suites: role navigation/decision propagation; 25 general component/viewport cases; 35 cross-role viewport cases; 18 Mentor viewport cases; 18 affiliation/recruitment cases; 15 shared five-role/viewport/Help cases plus report failure; original provider performance assertions; targeted notification race tests; session isolation tests all passed.
- Tested consent, invitation/acceptance, Student/Company/University applications, Mentor opportunities/affiliations, session privacy, event registration, notification mark-one/all, support ownership and wrong-role denials remain covered by unchanged business suites. This is automated evidence, not a claim of live hosted acceptance.
- TypeScript, lint, production build and diff whitespace validation passed during final validation. Final favicon-inclusive production build compiled in 16.3 s and generated all 69 pages. Matching browser measurements are recorded above.
- Known non-blocking warnings: Supabase realtime dynamic dependency warning during Next build; Node TypeScript module-type warning in tests; Starlette TestClient/httpx deprecation; Git CRLF conversion notices. No new production debug logging was left.
- Initial environment issues were corrected: sandbox build-directory permission required an escalated build; viewport runner used installed Edge because bundled Chromium was absent; a fixture syntax/type omission and stale nested-object fixture were corrected and rerun. These failed attempts are not counted as passes.
- Git remains dirty with the preserved prior changes plus these repairs; nothing was committed. Diagnostic fixture/production servers were stopped and normal development startup restored. Running development uses the same `.next` directory, so rebuild before a subsequent production start.

## Remaining University verification product issue

Unverified Universities still cannot create drafts, edit drafts or publish. Verification protects campus management, not only publishing. No actionable verification-request/resolution flow was introduced. The existing wording/path gap remains a separate product issue; no eligibility, verification or RLS relaxation was included in latency work.

Business logic changed: NO
Cross-role connection semantics changed: NO
RLS weakened: NO
Supabase migration created for latency: NO
Hosted database modified for latency: NO
Git push performed: NO
Git merge performed: NO
