# Support-report authorization audit — 2026-11-04

Branch: feature/cross-role-latency-ui-fixes. This audit describes the repository's existing migrations and code before the correction; no hosted metadata query or deployment was performed.

## Existing security rule

20261002000001_student_workspace_modules.sql creates public.support_reports with a required user_id foreign key to profiles, constrained category (problem/opportunity/support), subject/message length checks, received status and creation timestamp. RLS is enabled. reports_read allows authenticated users to SELECT only user_id=auth.uid(). No user UPDATE/DELETE policy, administrative support policy, support-specific trigger or support-report SECURITY DEFINER RPC exists in the migration history. Database-owner and existing privileged service access are unchanged.

20261002000002_workspace_actions.sql grants authenticated INSERT and creates reports_insert with user_id=auth.uid() AND workspace_ready('student'). This explicit Student argument is the non-Student blocker. workspace_ready checks an existing profile/auth user, active account, completed onboarding and confirmed email, and matches primary_role when an argument is supplied. Legacy role is not authoritative here.

20261028000000_harden_workspace_privileges.sql removes dangerous table privileges including TRUNCATE from application roles; it does not broaden the report policies. Existing SELECT/INSERT grants are sufficient. Broad hosted default grants do not bypass RLS, and no grant change is required.

POST /api/v1/support/reports uses Current (verified token, confirmed email, active/onboarded profile and one of the five supported primary roles). Report rejects unknown fields, including user_id. The endpoint inserts user_id=current.id using the caller's Supabase identity. Frontend sends only category, subject and message. The prior UI hid the form for non-Students because their INSERT would fail RLS.

## Implemented local correction — deployment pending

One local migration alters only reports_insert WITH CHECK. It preserves user_id=auth.uid() and permits workspace_ready for each explicit primary role: student, mentor, company, university, founder. This also denies a null/invalid primary_role, which a bare workspace_ready() would not check. No new RPC, grants, table, trigger, read policy or administrative access change is needed. Existing report editing/deletion remains unavailable.

The frontend exposes the same form using the already-defined role categories. Backend contract, validation, loading/success/error states and credential warning remain. Deployment is pending; enabling the local UI alone cannot override the hosted Student-only policy.

Migration: `supabase/migrations/20261104000000_support_reports_workspace_roles.sql`. It uses ALTER POLICY, preserving the existing policy's command, authenticated role and permissive mode. Local migration count is now 26; hosted count was not queried in this task. The five role predicates use the authoritative primary_role through workspace_ready; a null primary role cannot pass merely by being active/onboarded.

The form is now enabled for every supported workspace role. Existing role-specific topics, existing category values, ownership-free request body, validation, busy/success/error states and credential warning remain. Backend production code needed no support-related changes.

## Added evidence

- Backend: five role cases exercise the existing endpoint's authenticated-user binding and reject browser user_id spoofing and invalid input; unauthenticated POST is denied.
- Isolated PostgreSQL: all five roles insert/read their own report; cross-user insertion and reading denied; anonymous, suspended, disabled, unverified, incomplete onboarding, null role and absent profile denied. User UPDATE/DELETE remain unavailable. Existing owner/service visibility is retained.
- A before/after security snapshot proves all other policies, table ACLs/RLS flags, functions/ACLs and triggers unchanged. Reapplying the local migration is safe.
- Browser fixtures: all five roles submit through the existing form at mobile/tablet/desktop widths, with role-appropriate topics and no user_id in the request. Validation, successful reference display and retained input after failure are checked. These are isolated fixtures, not hosted writes.

## Later deployment (not executed)

After separate authorization, confirm the linked project is GenZnect and preview:

```powershell
npx supabase db push --linked --dry-run
```

The preview should contain only `20261104000000_support_reports_workspace_roles.sql`. Stop if any older migration is pending or the project is not the confirmed target. The eventual deployment command would be:

```powershell
npx supabase db push --linked
```

Use the established IPv4 Session Pooler connection method if needed; do not paste credentials into chat or logs. Neither command was run in this task.

## Post-deployment verification needed

1. Compare local/hosted history: expected 26 migrations, including the support correction, with no older migration reapplied.
2. Read pg_policies for public.support_reports: reports_insert remains INSERT to authenticated with own-user check and five workspace_ready role predicates; reports_read remains owner-only. Check RLS remains enabled and grants/triggers/functions match the pre-deployment snapshot.
3. In an explicitly authorized test environment, submit once as each active primary role through the API/UI. Confirm stored user_id equals the verified caller and original category/subject/message contract is intact.
4. Repeat direct-access negative cases: anonymous, spoofed user_id, other user's report, inactive/unverified/not-onboarded/null-role account, and UPDATE/DELETE. Verify owner/service administrative access remains as before.
5. Confirm Student behavior, role categories, validation, busy/error/success feedback and credential warning remain. Do not treat a successful elevated SQL-editor insert as proof of RLS behavior; use actual caller credentials for these checks.

No hosted database state was changed, no Git push/merge performed, and no latency optimization performed.

## Validation result

71 backend tests passed. All 21 Node test entries passed (the support database fixture required clearing its previous test JWT before owner-only fixture setup; its rerun passed). This includes auth/role/config tests and three isolated PostgreSQL suites. Browser validation passed: 15 all-role support/shared-control viewport cases plus report failure, 25 Student viewport cases, 35 cross-role form/viewport cases, existing role/connection tests, 18 Mentor cases and 18 affiliation cases. Performance regression passed with one overlapping load. TypeScript, lint, production build (69 routes) and git diff --check passed.

Existing warnings: Supabase realtime dynamic dependency in the build, Starlette/httpx deprecation in Python tests, and Node typeless-package warning. No hosted SQL was executed. Local development server restored on port 3000; test fixture server stopped after checks.
