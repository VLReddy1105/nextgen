# Cross-role functional pass — final report

Follow-up: the support-report blocker below is now corrected locally by `20261104000000_support_reports_workspace_roles.sql`, with all-role form access and security tests. Hosted deployment is still pending. See support-report-authorization.md; this report otherwise records the preceding functional pass and its original validation totals.

1. **Branch:** `feature/cross-role-latency-ui-fixes`; baseline commit `d6c1520`. No branch change.
2. **Git status:** local uncommitted changes from this pass; initial working tree was clean. No commit, push or merge.
3. **Files changed:** listed below, including tests and audit documentation.
4. **Student:** retained profile, discovery/applications, campus consent, projects/communities/events, mentoring and explicit AI preview. Fixed menus/navigation, Reviewed submenu, personal Today scope, duplicate mentorship detail action and reporting topics/feedback.
5. **Mentor:** retained independent/Company/University affiliation semantics, mentees, requests, sessions and private project boundaries. Fixed shared interactions, Events submenus, Help access, recruitment empty-state wording and repeated affiliation card.
6. **Company:** retained opportunity publishing/applicant review, Talent, spaces/events and Mentor recruitment/affiliation. Clearer creation controls, correct organization context, meaningful count labels, reduced duplicate overview content and Help guidance.
7. **University:** retained verified campus publishing, students/connections, announcements and Mentor workflows. Select the university organization for campus UI/publishing/counts, rather than an arbitrary first organization. Unverified publishing stays gated. Added Help guidance and shared interaction fixes.
8. **Founder:** retained personal projects/communities, their connections, events, profile/settings. Creation no longer passes an unsupported startup organization to the space RPC. No Company Talent/Applicants or University controls added.
9. **Sidebar:** role modules retained; Help added for non-Students; unsupported NEW badge removed.
10. **Parent/submenu:** parent links navigate and expand, separate chevrons toggle, active child routes auto-expand and highlight. Expansion is keyed to path and query so new filtered routes do not inherit a stale collapsed state.
11. **Profile menu:** shared header/sidebar implementation; outside/Escape/focus/link/route close, correct Profile/Settings and Account/Verification anchors, unchanged logout POST. Mobile account navigation closes the sidebar dialog.
12. **Notifications:** controlled popover shares mutual exclusion with account menus, closes on navigation, stays within mobile viewport. Existing mark-one/mark-all APIs and recipient permissions retained.
13. **Dashboard cards:** labels now describe existing count semantics (published opportunities, active applicants, joined spaces, upcoming published events). No invented counts or new aggregation requests.
14. **Right panel:** Student Today excludes unregistered discovery events and cancelled sessions. Company overview no longer repeats recent applicants in the side panel. Mentor affiliation badge omitted where main content already presents it.
15. **Help:** all-role navigation/FAQs and working workflow links; Student role topics mapped to existing storage categories, trimmed validation, success/reference/error/busy states and sensitive-information warning. Non-Student submissions remain explicitly blocked by current RLS; no fake submit control.
16. **Opportunities:** existing create/edit/publish APIs retained; creation disclosure made obvious; role-matching organization context and permission-aware empty states. University campus verification preserved.
17. **Applications:** Reviewed navigation added; existing application/status/history/withdrawal and applicant summary preserved. Empty state distinguishes Student applications from Mentor recruitment applications.
18. **Projects:** clearer Create control, corrected Founder organization context, retained invitation/code/request consent, team/task/file/activity and contextual manager checks.
19. **Communities:** clearer Create control, valid role context, retained feed/comments/reactions/resources, invitations and captain event creation.
20. **Events:** non-Student submenu values now match draft/published/cancelled filters; create disclosure is visible; eligibility, organizer ownership and Student registration unchanged.
21. **Announcements:** existing University publish/resource/notify form retained; campus organization selection corrected. Delivery/isolation covered in the existing isolated database suite.
22. **Mentorship:** removed unconditional duplicate Request mentorship button from detail; existing card remains authoritative for available/requested/accepted states. Request decisions and session permissions unchanged.
23. **Mentor affiliation UI:** retained consent, one-active-affiliation boundary, context and scoped progress; removed duplicate side-panel badge on relevant main pages. Recruitment creation disclosure/empty state clarified.
24. **Cross-role propagation:** existing RPC paths passed isolated database tests. No replacement propagation system or new notification logic added; UI fixes expose existing paths correctly.
25. **Removed elements:** hardcoded NEW badge, duplicate unconditional mentorship request, duplicate Company overview applicant panel and repeated Mentor affiliation side cards. No valid role module removed.
26. **Missing UI actions:** header account menu and all-role Help access added; existing creation actions made visible as styled disclosures. Existing API-backed flows retained rather than duplicated.
27. **Backend logic:** one narrow University count correction selects the university row from already-fetched organizations. Two regression cases cover unrelated-first organization and unverified campus. No latency architecture changes.
28. **Blocked feature:** non-Student report persistence requires separately authorized replacement of the Student-only reports_insert policy with an own-user, ready-account five-role policy. Exact scope is documented in cross-role-functional-review.md. No urgency field/workflow exists; no urgency control added.
29. **Accessibility:** semantic trigger buttons, aria-expanded/controls, active links, Escape focus restoration, focus-departure close, preserved dialog behavior, explicit report field names and status/error messages.
30. **Responsive:** shared controls tested at 390/820/1440; existing suites cover additional widths, including 768/1024/1366. Mobile popover overflow caught and corrected. Existing visual style preserved; local Student mobile screenshot inspected.
31. **Validation:** 65 backend tests; 21 Node test entries including three isolated PostgreSQL suites applying the existing migrations; 25 Student component/viewport cases, 35 cross-role viewport/form cases, existing role navigation/connection tests, 18 Mentor cases, 18 affiliation/recruitment cases, 15 new all-role shared-interaction/Help cases plus report failure; performance regression (one overlapping load), TypeScript, lint, production build (69 routes), and diff whitespace checks. See validation notes below.
32. **Remaining limitations:** non-Student support submission, urgency/response workflow and preserved AI execution previews are not implemented. No claim of live hosted login or end-to-end account testing. Existing bounded data counts describe loaded workspace data, not an unbounded analytics system.
33. **Manual real-account testing:** requires an authorized test environment because publishing/applying/inviting/marking notifications changes hosted data. Checklist in cross-role-functional-review.md covers all five sign-ins, opportunity/application chains, affiliations, project/campus consent, sessions, events/announcements, recipient notifications and negative permission cases.

## Changed files

- backend/app/api/routes/workspace.py
- backend/tests/test_role_connections.py
- src/app/dashboard/help/page.tsx
- src/components/ecosystem/Campus.tsx
- src/components/ecosystem/Editor.tsx
- src/components/ecosystem/MentorRecruitment.tsx
- src/components/ecosystem/Publishing.tsx
- src/components/ecosystem/RoleContext.tsx
- src/components/ecosystem/RoleWorkspace.tsx
- src/components/student/CreateSpace.tsx
- src/components/student/StudentDetail.tsx
- src/components/student/StudentExtras.tsx
- src/components/student/StudentShell.tsx
- src/components/student/WorkspacePopover.tsx (new)
- src/lib/role-workspaces.ts
- src/lib/workspace-help.ts (new)
- tests/workspace-ui/api.ts
- tests/workspace-ui/main.tsx
- tests/workspace-ui/functional.mjs (new)
- docs/cross-role-ui-audit.md (new)
- docs/cross-role-functional-review.md (new)
- docs/cross-role-final-report.md (new)

## Validation notes

All browser fixtures and PostgreSQL databases are local and isolated. They do not use a hosted service-role bypass. The production build reports the existing Supabase realtime dynamic-dependency warning. Python reports a Starlette/httpx deprecation warning. Node reports the existing typeless-package module warning. Git may emit Windows LF/CRLF normalization notices; diff whitespace checks pass. None is a SQL or hosted database warning.

No migrations, environment files, Supabase configuration, WorkspaceProvider polling/request architecture, HTTP pools, caching or concurrency code were changed. Local migrations remain 25. The existing local Next dev server was temporarily stopped for the production build to avoid .next conflicts and restarted afterward.

Git push performed: NO  
Git merge performed: NO  
Supabase migration created: NO  
Real Supabase db push performed: NO  
Hosted database modified: NO  
Latency optimization performed: NO
