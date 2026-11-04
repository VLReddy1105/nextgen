# Workspace bootstrap regression — 2026-11-04

Repository: `C:\Users\Jai\nextgen`. Branch: `feature/cross-role-latency-ui-fixes`.

## Proven cause, before code changes

The configured frontend API base is `http://localhost:8000`. Direct unauthenticated local HTTP probes returned:

| Request | Status | Response |
|---|---|---|
| `/health` | 200 | `{"status":"ok"}` |
| `/openapi.json` | 200 | Workspace paths contained only `/api/v1/workspace` |
| `/api/v1/workspace/progressive` | **404** | **`{"detail":"Not Found"}`** |
| `/api/v1/workspace?full_notifications=false` | 401 | `UNAUTHENTICATED`, `Sign in to continue.` |

The source tree already contained the progressive route, but the running local Python backend had loaded the older code and was not running with automatic reload. The newer Student frontend selected `/workspace/progressive`; its server did not have that endpoint. FastAPI rejected routing before the actor/profile/workspace service ran. The API client's generic error fallback turned FastAPI's plain `detail` response into “The request could not be completed.”

The “Account” label was a secondary display dependency: both menus read only `WorkspaceProvider.data.profile.primary_role`. With the bootstrap rejected, `data` remained null, even though the Next server layout already passed its validated role into `StudentShell`.

## Answers to the ten diagnostic questions

1. **Failing request:** Student initial `GET /api/v1/workspace/progressive`.
2. **Exact status:** HTTP 404.
3. **Backend error:** `{"detail":"Not Found"}`; route dispatch failure, not a Supabase error or service exception.
4. **Actual user session validity:** not independently inspected; **MANUAL ACCEPTANCE REQUIRED**. The unauthenticated probe does not test the user's token. The missing route fails regardless of session validity. The server shell's admission code still validates identity/account state; none of those checks was removed.
5. **Profile/primary role:** not reached by this failed API request. The server layout independently obtains the profile/role. Valid profile and role loading are now verified for all five roles through the actual backend admission dependency with a synthetic upstream transport.
6. **Workspace context:** Student context cannot load from a nonexistent endpoint. After refresh of the local backend, the endpoint exists; synthetic authorized tests produce valid context and overview for every role.
7. **AbortController/generation logic:** not the cause of this failure. The observed response is an actual HTTP 404, not an abort or network exception. Tests verify shared StrictMode bootstrap, old-account cancellation, the newest account request staying active, and late-response rejection.
8. **Incorrectly optional dependency:** not the cause. The missing route prevents all bootstrap service execution. Profile remains required before rendering protected main content. Menu labels now reuse the independently validated server role for display only.
9. **Parallel backend exception:** not the cause of the observed 404. No handler ran. Existing concurrency tests and authorized route tests pass; no parallel service behavior was changed for this fix.
10. **Role scope:** the missing-route regression specifically affects Student, which selects the progressive endpoint. Mentor, Company, University and Founder select the existing workspace endpoint with a query flag; the observed old server still recognized that route. Any role could previously show generic Account if its workspace request failed for another reason, but no such second failure is established here.

## Minimal fix

Restarted only the identified local workspace backend to load current branch code. The repository launcher initially encountered an unreadable optional `backend/.deps/typing_extensions.py`; the server was successfully started using the installed venv directly from `backend`, with development mode:

```powershell
$env:NODE_ENV='development'
..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

No dependency, environment file, database or Supabase configuration was changed. Subsequent local probes showed both workspace paths in OpenAPI and **401 UNAUTHENTICATED** for both without credentials. This confirms routing is repaired while authentication remains enforced. No authenticated live workspace call was made; that endpoint can write reminders.

Two production source files changed:

- `C:\Users\Jai\nextgen\src\components\student\StudentShell.tsx`: account menus and initial sidebar use the already server-validated role as display fallback until workspace profile data arrives. The scope is unmounted with the existing session/account isolation boundary. It grants no API permissions.
- `C:\Users\Jai\nextgen\src\lib\api\client.ts`: a 404 specifically from the new progressive endpoint now explains that the backend is out of date and should be restarted. It does not retry through the broad workspace endpoint, hide authorization failures, or fabricate success.

Tests changed/added:

- `C:\Users\Jai\nextgen\backend\tests\test_bootstrap_contract.py`: real ASGI routes and actual auth/profile admission using a synthetic Supabase HTTP transport; five valid roles and expired session denial.
- `C:\Users\Jai\nextgen\tests\workspace-ui\bootstrap.html`
- `C:\Users\Jai\nextgen\tests\workspace-ui\bootstrap.tsx`
- `C:\Users\Jai\nextgen\tests\workspace-ui\bootstrap.mjs`: actual API client/provider/shell with controlled HTTP responses; five-role overview and menu labels, StrictMode coalescing, missing endpoint, expired session and no broad fallback.
- `C:\Users\Jai\nextgen\tests\workspace-ui\session-client.ts`: isolated fixture session support; never used by the Next application.
- `C:\Users\Jai\nextgen\tests\workspace-ui\session.tsx` and `session.mjs`: assert old request cancellation cannot abort the newly mounted account bootstrap.
- This report. All other pre-existing working-tree changes were preserved.

## Role verification

| Role | Session admission → profile → primary role → context (synthetic backend HTTP) | Overview and both menu role labels (isolated actual client/provider) |
|---|---|---|
| Student | PASS | PASS |
| Mentor | PASS | PASS |
| Company | PASS | PASS |
| University | PASS | PASS |
| Founder | PASS | PASS |

Each backend bootstrap performs one authoritative user check and one profile lookup in these fixtures. Missing/expired authentication still returns 401 and the frontend shows reconnect/sign-in handling without an overview. Logout and account switch clear old private state. Real credential login and populated hosted account acceptance remain **MANUAL ACCEPTANCE REQUIRED**; no browser/session access was requested.

Latency work is retained: progressive rendering, targeted notification refresh, no-refresh support/settings operations, request coalescing, stale-response guards, account isolation, detail cancellation and parallel backend reads. No new bootstrap request or broad fallback was added.

## Validation completed

- Backend/auth/workspace/role suite: **85 passed**.
- Node/auth/role/database/RLS/stream suite: **24 passed**, using isolated local test databases only.
- Five-role real-client bootstrap, missing endpoint, expired session and role labels: passed.
- Session switch/logout/newest-bootstrap isolation, progressive/detail readiness, targeted refresh races and performance/polling tests: passed.
- Existing browser suites: 25 general component/width cases; role navigation/decisions; 35 ecosystem viewport cases; 18 Mentor cases; 18 affiliation cases; 15 shared role/viewport cases plus support failure: passed.
- TypeScript, lint, production build (69 pages) and `git diff --check`: passed.
- Existing non-blocking warnings: Supabase realtime dynamic dependency, Node module type, Starlette TestClient deprecation and Git line endings.

The local backend remains running with the corrected route; the frontend development server was restored after building. No Computer Use or personal browser session was accessed.

Business logic changed: NO

Connections changed: NO

Permissions changed: NO

RLS changed: NO

Migration created: NO

Hosted database modified by this work: NO

Git push performed: NO

Git merge performed: NO
