# Working-tree file manifest

Branch: `feature/student-login`. No commit/push/merge. Paths are relative to the repository. The user supplied the PDFs. Earlier auth work is preserved, not newly rebuilt in this workspace phase.

## Modified by workspace work

- `.env.example`
- `.gitignore`
- `src/app/dashboard/applications/page.tsx`
- `src/app/dashboard/communities/page.tsx`
- `src/app/dashboard/events/page.tsx`
- `src/app/dashboard/layout.tsx`
- `src/app/dashboard/my-university/page.tsx`
- `src/app/dashboard/notifications/page.tsx`
- `src/app/dashboard/opportunities/page.tsx`
- `src/app/dashboard/overview/page.tsx`
- `src/app/dashboard/profile/page.tsx`
- `src/app/dashboard/projects/page.tsx`
- `src/app/dashboard/settings/page.tsx`
- `src/components/onboarding/OnboardingForm.tsx`
- `tsconfig.json`

## Previously modified authentication files, preserved

- `src/app/(auth)/login/page.tsx`
- `src/app/account-unavailable/page.tsx`
- `src/app/auth/callback/route.ts`
- `src/app/pending-approval/page.tsx`
- `src/components/auth/LoginForm.tsx`
- `src/components/auth/RecoveryForm.tsx`
- `src/components/auth/SignupForm.tsx`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/middleware.ts`
- `src/lib/supabase/server.ts`
- `src/middleware.ts`

## Newly present files (includes earlier auth additions and user PDFs)

- `backend/README.md`
- `backend/app/__init__.py`
- `backend/app/api/dependencies.py`
- `backend/app/api/routes/applications.py`
- `backend/app/api/routes/events.py`
- `backend/app/api/routes/mentorship.py`
- `backend/app/api/routes/notifications.py`
- `backend/app/api/routes/opportunities.py`
- `backend/app/api/routes/settings.py`
- `backend/app/api/routes/spaces.py`
- `backend/app/api/routes/students.py`
- `backend/app/api/routes/workspace.py`
- `backend/app/core/config.py`
- `backend/app/core/errors.py`
- `backend/app/core/logging.py`
- `backend/app/main.py`
- `backend/app/matching/rank.py`
- `backend/app/repositories/supabase.py`
- `backend/app/schemas/actions.py`
- `backend/app/schemas/student.py`
- `backend/app/services/catalog.py`
- `backend/app/services/students.py`
- `backend/requirements.txt`
- `backend/run.py`
- `backend/tests/test_api_contracts.py`
- `backend/tests/test_foundation.py`
- `backend/tests/test_security.py`
- `docs/local-auth.md`
- `docs/product-specs/GenZnect_Connections_and_AI_Tools_Blueprint.pdf`
- `docs/product-specs/GenZnect_Student_Dashboard_Blueprint.pdf`
- `docs/student-workspace-baseline.md`
- `docs/student-workspace-files.md`
- `docs/student-workspace-matrix.md`
- `docs/student-workspace-report.md`
- `next.config.ts`
- `src/app/dashboard/ai-tools/page.tsx`
- `src/app/dashboard/applications/[id]/page.tsx`
- `src/app/dashboard/communities/[id]/page.tsx`
- `src/app/dashboard/events/[id]/page.tsx`
- `src/app/dashboard/help/page.tsx`
- `src/app/dashboard/mentorship/[id]/page.tsx`
- `src/app/dashboard/mentorship/page.tsx`
- `src/app/dashboard/opportunities/[id]/page.tsx`
- `src/app/dashboard/projects/[id]/page.tsx`
- `src/components/student/CreateSpace.tsx`
- `src/components/student/ResourceEditor.tsx`
- `src/components/student/StudentActivity.tsx`
- `src/components/student/StudentDetail.tsx`
- `src/components/student/StudentExtras.tsx`
- `src/components/student/StudentModules.tsx`
- `src/components/student/StudentProfileEditor.tsx`
- `src/components/student/StudentShell.tsx`
- `src/components/student/TagSelect.tsx`
- `src/components/student/WorkspaceProvider.tsx`
- `src/components/student/student.css`
- `src/lib/api/client.ts`
- `src/lib/api/students.ts`
- `src/lib/api/types.ts`
- `src/lib/api/workspace.ts`
- `src/lib/auth/errors.ts`
- `src/lib/auth/routing.ts`
- `src/lib/supabase/config.ts`
- `supabase/migrations/20261002000000_student_workspace_profile.sql`
- `supabase/migrations/20261002000001_student_workspace_modules.sql`
- `supabase/migrations/20261002000002_workspace_actions.sql`
- `supabase/migrations/20261002000003_workspace_storage.sql`
- `supabase/migrations/20261002000004_workspace_integrity.sql`
- `supabase/migrations/20261002000005_workspace_reminders.sql`
- `tests/auth.test.mjs`
- `tests/workspace-database.test.mjs`
- `tests/workspace-ui/index.html`
- `tests/workspace-ui/link.tsx`
- `tests/workspace-ui/main.tsx`
- `tests/workspace-ui/navigation.ts`
- `tests/workspace-ui/style.css`
- `tests/workspace-ui/verify.mjs`
- `tests/workspace-ui/vite.config.mjs`
