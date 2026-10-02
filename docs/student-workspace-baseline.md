# Student Workspace: Stage 1 baseline

Branch inspected: `feature/student-login`.

The user confirms signup/login/logout now work. `.env.local` exists; its contents were not printed or modified. Previous Phase 1 changes remain uncommitted and must be preserved.

## Product references

The implementation request names two primary specifications:

- GenZnect Student Dashboard Blueprint
- GenZnect Connections & AI Tools Blueprint

Both documents are now present under `docs/product-specs/` and have been read page by page (25 Dashboard pages and 13 Connections pages), with rendered diagrams reviewed. See `student-workspace-matrix.md` for the combined page-referenced implementation plan and conflict resolutions. The following records the pre-implementation baseline.

## Existing implementation

- Next.js 15.5.22 App Router, React 19.1.1, TypeScript, Tailwind 4.
- Supabase Auth and SSR cookies; safe configuration and error mapping from Phase 1.
- Signup metadata selects one of five primary roles. The database trigger creates the profile. Confirmation callbacks and dashboard admission use the existing account-state logic.
- Login uses `signInWithPassword`; logout uses `POST /auth/signout`.
- Dashboard layout verifies the user and ready account state. `requirePrimaryRole` additionally checks the role. University administration uses official organization verification; space management uses contextual membership permissions.
- Shared dashboard shell has a 270px sidebar, mobile drawer, header/user menu, and main content. It has no right context panel or shared notification state.
- Overview displays role-specific copy and database membership counts.
- Student profile editor supports name/headline, degree/field, skills/interests, and portfolio/GitHub/LinkedIn URLs. Tags are comma-separated inputs. No calculated completion or multi-step Student profile editor exists.
- Onboarding is a shared single form backed by `finish_onboarding`. Established primary roles cannot be changed through it.
- My University reads active memberships and organization details; independent students can use the workspace.
- Projects and communities list active memberships; creation and management use existing RPCs.
- Opportunities, applications, events, notifications, messages, and discovery currently use placeholder pages. Settings redirects to profile. Mentorship, AI Tools, and Help routes are absent.
- No FastAPI backend, centralized business API client, matching service, or notification service exists.

## Existing database model in migrations

Ten migration files define profiles, organizations, student_details, posts, founder_profiles, mentor_profiles, university_student_invitations, university_student_memberships, communities, community_members, projects, and project_members, together with enums, triggers, RLS, grants, and RPCs.

Reuse these identities and relationships. Do not create a second role system or duplicate skills across modules. Student identity remains `primary_role = student`.

Important constraints:

- Profiles are owner-readable; directory display names need a narrowly scoped access design.
- University affiliation is authoritative through university memberships, not the legacy university text field.
- Existing membership mutations require contextual managers; unrestricted self-join is not provided.
- Team membership reads are limited to self or contextual managers.
- Existing posts use platform approval and organization association, not the requested community feed relationship.
- Opportunities/applications/history, notifications, events/registrations, project tasks, community social records, extended career preferences, and mentorship connections/sessions need additive storage where implemented.

This describes checked-in schema and queries, not a verification of the live database's applied migration history or records.

## Implementation constraints

Preserve existing auth, non-student routes, all previous migrations, and public marketing. Build FastAPI inside this repository with token-validated identity and user-scoped Supabase operations. Implement normalized Student Data Core before dependent modules. Use real persisted records and polished empty states; no demo counters or mock database substitution.

The latest request supersedes the earlier AI Tools exclusion: include the navigation item and a clearly labeled Launching Soon preview only. Do not call AI APIs or imply automation is active.

Follow the requested twenty-stage sequence, starting with backend identity validation and domain contracts before profile, shell, modules, cross-module notifications, and responsive checks. Final acceptance requires tests, lint, TypeScript, production build, and diff checks, plus explicitly reported live-test limitations.
