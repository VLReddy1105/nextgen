# Workspace performance report — 6 October 2026

Branch: `feature/workspace-performance`. The starting working tree was clean. Changes remain local and uncommitted. No branch switches, branch creation, reset, merge, push, or remote changes were performed.

## Findings and changes

The primary bottleneck was constructing an `httpx.AsyncClient` for every Supabase operation. Creating one real client took 1,220 ms in the initial local benchmark. This synchronous setup blocks the async event loop; repeated setup across overlapping workspace requests amplifies the delay. Each request also discarded its connection pool, preventing connection reuse.

Student aggregation performed 25 Supabase calls in the populated fixture, including duplicate organization and project-membership reads. Profile queries and several catalog enrichment queries were serial. Company, University, and Mentor aggregation was largely serial.

The frontend started a new request every 30 seconds and on every focus event, even when a previous request was pending. Its generation counter discarded all but the newest response. With requests exceeding the polling interval, successful responses could repeatedly be discarded and the initial loading screen could stall. Development Strict Mode also duplicated the initial load.

Implemented:

- One HTTP client/pool per backend worker, created and closed by FastAPI lifespan. Auth verification and database requests reuse it. Authorization and public-key headers remain per request; neither user identity nor response data is globally cached. Auth verification retains its 10-second timeout; database operations retain 15 seconds and redirects remain disabled.
- Parallel independent profile/catalog/role reads. Reminders finish before notifications are loaded. Shared concurrency cleanup cancels and drains sibling operations on errors without changing API error propagation.
- Exact read reuse within one workspace aggregation, with independent copies for callers. Different filters, ordering, limits, and tables remain distinct. RPCs are not cached. The wrapper is discarded after each request.
- One pending frontend refresh per mounted provider. Polling waits for completion, skips hidden tabs and fresh data, and focus/visibility events reuse pending work. Writes during a load queue a subsequent fresh read. Failed background refreshes preserve existing content. Unmount aborts the active fetch; Strict Mode effect replay reuses it.
- Stable context callbacks/value and request-scoped React caching of duplicate server session lookups. Middleware, dashboard admission, `getUser()` verification, and backend account/role checks remain in place.
- ESLint excludes generated Python dependency/cache directories, which previously caused an access-denied scan failure. Application and test source remain linted.

## Measurements

Live endpoint measurements use existing backend request-duration logs, including authentication. No tokens or credentials were exported. The user's signed-in Student account was used for UI checks.

| Measurement | Before | After |
| --- | --- | --- |
| First four live `GET /api/v1/workspace` samples | 90.688, 89.656, 85.531, 86.954 s | Final three samples: 3.047, 3.156, 3.016 s |
| Populated Student fixture: Supabase aggregation calls | 25 | 23 |
| HTTP clients created by that fixture | 25 per aggregation | 1 per worker lifespan; reused by requests |
| Strict Mode + refresh + two focus events while pending | 5 workspace loads | 1 workspace load |
| Additional loads from four component module transitions | 0 | 0 |

Both old and new live endpoints still verify the token and read the account profile: two additional Supabase requests beyond the aggregation counts. Thus the populated Student fixture corresponds to 27 versus 25 total Supabase calls including admission. Query counts depend on available records and memberships. No differently ordered/limited queries were merged merely to reduce this number.

The baseline was unstable: later successful requests ranged from 41.641 to 188.312 seconds, with authentication/data-service timeouts as well. Early optimized samples were 2.421–3.094 seconds; samples taken while build/tests ran also reached 6.328 seconds. The final three samples above were taken after the production server was started. These are local observations, not production percentile guarantees.

Live browser timings below measure action-to-observed-content and include browser-control overhead, server authentication and, for development first visits, compilation. They are upper bounds rather than in-browser performance marks.

| Student view | Optimized development observation | Optimized production observation |
| --- | ---: | ---: |
| Overview full load | 7.746 s | 9.507 s |
| Opportunities sidebar navigation | 5.089 s | 1.421 s |
| Projects sidebar navigation | 7.241 s | 1.879 s |
| Communities sidebar navigation | 11.249 s | 1.277 s |
| Events sidebar navigation | 8.528 s | 2.211 s |

A trustworthy completed live before-timing for each module was not obtained: the baseline Overview remained in loading, and the attempted Opportunities transition ended in an authentication-unavailable state. No successful before/after live navigation speedup is claimed. The production and development columns above are both optimized code, not a before/after comparison.

The isolated browser harness additionally measured the same real module components before and after, using controlled data and no server/auth network:

| Component measurement | Before | After |
| --- | ---: | ---: |
| Overview render after data release | 174 ms | 221 ms |
| Opportunities | 116 ms | 137 ms |
| Projects | 136 ms | 147 ms |
| Communities | 117 ms | 152 ms |
| Events | 79 ms | 83 ms |

These small timings include Playwright overhead and host load. They do not establish a rendering speedup; the major improvement is removing request setup/overlap and delayed data availability.

The offline endpoint harness imposes 50 ms per Supabase call and overrides authentication with synthetic actors. It exercises the real endpoint, repository, and services with an HTTP mock transport. It excludes real TLS/network costs and is separate from live timings:

| Role | Before endpoint | Final endpoint | Aggregation calls before/after |
| --- | ---: | ---: | ---: |
| Student | 582.86 ms | 357.56 ms | 25 / 23 |
| Company | 963.88 ms | 179.63 ms | 18 / 18 |
| University | 1,014.97 ms | 236.47 ms | 19 / 19 |
| Mentor | 1,023.77 ms | 226.08 ms | 19 / 19 |

All four complete fixture response payloads were equal before and after. Raw controlled results are stored locally in ignored `work/performance/` files; reproducible harnesses are in `tests/workspace-benchmark.py` and `tests/workspace-ui/performance.*`.

## Validation

- Backend: 25 tests passed, including authoritative auth, errors, API contracts, pool identity isolation/lifecycle, exact read reuse/copy isolation, and failed-read cancellation.
- Auth/account routing: 12 Node tests passed.
- Both database/RLS suites passed in isolated PGlite, including historical migrations, profile access, cross-role isolation, consent, private projects, invitations, applications, campus revocation, and mentor/session access. No hosted migrations were run or edited.
- Existing frontend suites: 25 Student viewport/component cases and 35 ecosystem cases passed.
- New provider regression passed: Strict Mode, refresh/focus deduplication, module retention, mutation during load, stale-data retention on failure, simulated 95-second load, polling after completion, fresh focus, hidden tabs, visibility recovery, and unmount cancellation.
- `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check` passed. Build generated all 64 pages.
- Existing non-fatal warnings remain: Supabase Realtime dynamic dependency during Next build and Starlette's HTTPX test-client deprecation.

## Boundaries and remaining limits

`.env.local`, Supabase configuration values, migrations, RLS, landing/marketing pages, authentication strategy, and product behavior were not changed. No browser service-role credentials or access bypasses were introduced. No new dependencies were installed.

The existing 500-row query limits and full workspace payload remain. Network latency, authoritative auth round trips, reminder execution and data volume still contribute to first load. Each separate browser tab has its own provider/polling lifecycle; deduplication is per provider, not cross-tab. Live Company/University/Mentor accounts were not exercised; their coverage here is backend, payload equivalence, database/RLS and component testing. A reliable live before/after navigation comparison remains unavailable as described above.

Current localhost is running the verified production build with `npm run start` on port 3000. Development remains `npm run dev`. Backend was launched from `backend` with `..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000`. The existing `backend/.deps` and formatter directory had pre-existing access errors; the working root `.venv` was used without changing dependency installations.

Reproduce checks from the repository root:

```powershell
Push-Location backend
..\.venv\Scripts\python.exe -m pytest tests -q
Pop-Location
node --test tests/auth.test.mjs tests/account-state.test.mjs
node tests/workspace-database.test.mjs
node tests/ecosystem-database.test.mjs
npm run typecheck
npm run lint
npm run build
git diff --check
.\.venv\Scripts\python.exe tests/workspace-benchmark.py comparison
```

For component checks, start `node work/ui-test/node_modules/vite/bin/vite.js --config tests/workspace-ui/vite.config.mjs`, set `UI_BROWSER_CHANNEL=msedge`, then run `node tests/workspace-ui/verify.mjs`, `node tests/workspace-ui/ecosystem.mjs`, and `node tests/workspace-ui/performance.mjs after`. Stop the Next development server before building to avoid concurrent writes to `.next`.
