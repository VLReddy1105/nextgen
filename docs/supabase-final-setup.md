# Shared Supabase final setup

Branch: `feature/supabase-final-setup`. Project: `orhoolcpcbihfrbkpioz`.
All changes in this pass are local and uncommitted. No hosted mutation was performed.

## Evidence and remaining verification

| Area | Result / evidence |
|---|---|
| Project targeting | Root application URL and local CLI project-ref both match `orhoolcpcbihfrbkpioz`; validated without logging keys |
| Migration history | Maintainer confirmed successful hardening deployment: 24 local = 24 remote, no missing/unexpected versions. Accepted as supplied evidence; not rerun. No deployment or dry run needed |
| CLI | Current agent's management token lacks `projects_read`; linked query fails IPv6. Maintainer's Session Pooler session works. These are maintainer tooling limitations, not runtime requirements |
| Hosted Auth | Read-only `/auth/v1/settings` returned email enabled, disable_signup=false, mailer_autoconfirm=true |
| Hosted metadata (maintainer-supplied JSON, 2026-10-28) | No missing expected tables/functions; all 38 public tables have RLS; profile columns, enabled signup trigger, five primary roles and private PDF resume bucket match expectations. Subsequent maintainer post-deployment verification passed: internal helper denial, no API-role TRUNCATE on all 38 tables, notification read_at-only UPDATE, retained public RPC execution and postgres nested-caller access |
| Local SQL architecture | All 24 migrations load successfully in isolated embedded PostgreSQL; existing privacy/lifecycle regression suites pass |
| Local runtime | Backend health 200, frontend login 200, unauthenticated dashboard redirects to login. No new signup/login or hosted business writes performed |
| Fresh developer configuration | Isolated tests with no .env.local load the shared development defaults in both Next.js and backend; production/test do not load development defaults |

The SQL artifact returns metadata only inside `BEGIN TRANSACTION READ ONLY`, with a 30-second statement timeout and rollback. It checks 38 expected table names and 94 historical function names, table RLS, profile columns, roles, auth triggers, profile trigger definition, policies, function privileges and resume bucket settings. Missing historical names need review against intentional drops before declaring drift. Do not send connection credentials with its result.

## Runtime setup for normal developers

Install Node dependencies (`npm ci`) and Python requirements in a virtual environment, then run:

```powershell
npm run dev
```

```powershell
python -m pip install -r backend/requirements.txt
python backend/run.py
```

Open `http://localhost:3000`. Backend listens on `127.0.0.1:8000`.
No Supabase CLI, database password, Session Pooler URL, migration command, or manually created `.env.local` is needed for this development configuration. New developers receive these defaults only after the maintainer chooses to distribute/commit this local work.

`.env.development` contains only public configuration. `.env.local` stays ignored and optional. Both runtimes support overrides, highest priority first: process environment, `.env.<mode>.local`, `.env.local` (except test), `.env.<mode>`, `.env`. Use plain values in shared files; backend's minimal loader does not interpolate shell expressions/multiline values.

`backend/run.py` defaults NODE_ENV to development without overriding it. Direct backend ASGI startup defaults to production; set NODE_ENV=development explicitly for a direct local uvicorn command. Next.js selects its normal development/production mode. Production must receive explicit Supabase URL/public key, API URL and frontend origin; it does not use `.env.development`. Existing `.env.local` may still override production on a developer machine and must not be shipped as deployment configuration.

| Variable | Classification | Use |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | PUBLIC | Same project for frontend and backend |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | PUBLIC | Anon/publishable key, not a privileged secret |
| NEXT_PUBLIC_API_BASE_URL | PUBLIC | Frontend business API URL |
| FRONTEND_ORIGIN | PUBLIC | Backend allowed browser origin |
| NODE_ENV | PUBLIC | Runtime mode selection |
| DB password / Pooler URL containing password | SECRET | Maintainer-only database administration; not application runtime |
| Service-role/secret key / Personal Access Token | SECRET | Never add to shared files or browser code |
| User access/refresh tokens | SECRET | Managed by existing Auth session, never shared development configuration |

Backend verifies the user through Supabase Auth and forwards that user's token with the public API key to PostgREST. Existing RLS remains the data-access authority; a public key is not a bypass.

## Architecture expectations from local migrations

- `auth.users` insert invokes `on_auth_user_created` / `public.handle_new_user`. The later identity migration replaces the original function; review the final function, not only the oldest file. It inserts a profile with role mapping, while onboarding/readiness checks gate workspace admission.
- Primary roles: student, company, university, mentor, founder. Legacy representative values map to company/university. Contextual project/community roles do not confer platform administration.
- Auth code requires Supabase-confirmed email. With hosted mailer_autoconfirm enabled, Supabase supplies confirmation automatically; no manual verification step or Auth code bypass is necessary.
- Privacy regression tests cover scoped profiles, application owners, project/community membership, campus consent, mentorship/session isolation, notifications and unauthorized actions. Supplied hosted policies show the expected principal scopes, including the restrictive Student privacy policy. This is not a full function-body or behavioral equivalence proof; the three scoped privilege blockers are resolved by the maintainer-reported deployment.
- RPCs use existing authenticated identity and scoped grants. No new function was created; the additive hardening migration narrows existing privileges.
- Resume bucket expectation: `student-resumes`, private, PDF only, 5,242,880 bytes (5 MiB), owner UUID first path segment, workspace-ready Student required for insert/read/delete. Hosted bucket settings and owner-scoped insert/read/delete policies match the supplied result. storage.objects RLS flag was not included in the original query and remains a narrower follow-up check.

## Acceptance limitations

No hosted test users or records were created. Maintainer should test existing Student login/dashboard and representative Company application/invitation, University connection/event, Mentor connection/session, community and notification flows with authorized accounts. The local regression suites exercise these database behaviors in an isolated database; they do not prove live multi-account acceptance.

## Validation

31 backend tests and 17 Node auth/config/database test entries passed. TypeScript and lint passed. Browser suites passed 25 Student and 35 cross-role viewport cases. Workspace performance tests passed with one overlapping refresh request, freshness/polling/visibility/cancellation protections intact. Production build passed (64/64 pages); existing Supabase Realtime dynamic-dependency warning remains. git diff --check passed. Localhost was restored after temporarily stopping Next dev to avoid concurrent .next writes. No live signed-in acceptance was claimed.

## Ordered local migrations (24)

1. `20260806071611_create_enums.sql`
2. `20260806071612_create_profiles_and_organizations.sql`
3. `20260806071613_create_student_details.sql`
4. `20260806071614_create_posts.sql`
5. `20260806071615_create_new_user_trigger.sql`
6. `20260806071616_create_rls_policies.sql`
7. `20260916000000_genznect_identity_and_enrollment.sql`
8. `20260916000001_genznect_contextual_roles.sql`
9. `20260916000002_genznect_api_grants.sql`
10. `20260916000003_scope_profile_reads.sql`
11. `20261002000000_student_workspace_profile.sql`
12. `20261002000001_student_workspace_modules.sql`
13. `20261002000002_workspace_actions.sql`
14. `20261002000003_workspace_storage.sql`
15. `20261002000004_workspace_integrity.sql`
16. `20261002000005_workspace_reminders.sql`
17. `20261002000006_ecosystem_relationships.sql`
18. `20261002000007_ecosystem_project_actions.sql`
19. `20261002000008_ecosystem_opportunities.sql`
20. `20261002000009_ecosystem_university.sql`
21. `20261002000010_ecosystem_events_mentors.sql`
22. `20261002000011_ecosystem_integrity.sql`
23. `20261002000012_ecosystem_directories.sql`
24. `20261028000000_harden_workspace_privileges.sql`

## Deployment closure (maintainer evidence, 2026-10-28)

The maintainer reports successful deployment and matching histories (24 local / 24 remote). Their read-only post-deployment verification passed: all three internal helpers deny anon/authenticated EXECUTE; all 38 application tables deny their TRUNCATE; notifications deny broad UPDATE and permit authenticated UPDATE only on read_at; expected public RPCs remain executable; checked SECURITY DEFINER callers retain helper access through postgres ownership.

This supersedes the earlier 23-migration status and pre-deployment privilege blocker. The scoped migration is unchanged. No further hosted changes or deployment commands are authorized. Broader default-ACL questions were outside this migration's scope and are not asserted resolved by this evidence.

The agent did not deploy this migration. No Git push, merge, migration repair/reset, or hosted mutation was performed in the final verification continuation.

## Final continuation verification

Refreshed after the maintainer's deployment report: 31 backend tests, 17 Node test entries, TypeScript, lint, 25 Student browser cases, 35 cross-role browser cases, performance checks, and the 64-page production build passed. Isolated database tests passed notification mark-one/mark-all, helper denial, recipient isolation, campus approval/invitation consent, project/community joins and mentor consent/session isolation. All five primary roles passed the existing admission-routing tests; these are fixture checks, not live credential logins.

The backend started from an isolated source copy with the actual shared .env.development, no .env.local and cleared configuration overrides; /health returned 200 with no hosted requests. The initial scratch copy omitted the tracked src/lib/catalogs.json dependency; including that repository file fixed the test harness, with no application change. Next.js development/production/test configuration isolation also passed. Installed dependencies were reused; a clean-machine npm/pip install and full fresh-checkout frontend server startup were not performed.

No existing localhost application tab was found in the in-app browser. Real Student/Company/University/Mentor/Founder account login acceptance remains unverified. Hosted notification/connection mutations were deliberately not exercised under the no-hosted-changes instruction. No credentials were requested or exposed.

Warnings: existing Starlette/httpx TestClient deprecation, Node module-type inference warning in direct TypeScript tests, and Supabase Realtime dynamic-dependency build warning. No SQL test failures. The migration was not edited. No db push or other hosted administration command was run in this continuation.
