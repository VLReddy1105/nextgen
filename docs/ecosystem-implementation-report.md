# GenZnect ecosystem — third implementation pass

Implementation is ready for local review. New migrations were exercised in isolated PostgreSQL, **not applied to hosted Supabase**. Real-account, hosted end-to-end acceptance remains to be run using section 33. No production test identities were created.

## 1. Branch

`feature/student-login`. No branch change, commit, push, merge, or reset.

## 2. Git status and boundaries

The working tree already contained the earlier auth and Student Workspace work. Those changes remain uncommitted alongside this pass. `.env.local`, authentication configuration, and landing/marketing files were not changed by this pass. The user-created root `.venv` was preserved and ignored. All work is inside this repository.

All **16 pre-existing migration SHA-256 hashes** match the baseline captured before this pass, including the previous six workspace migrations. Seven new migrations are additive. The earlier report is historical; this report supersedes its statements that non-student workspaces are unchanged.

## 3. Gap matrix and specifications

See [ecosystem-gap-matrix.md](ecosystem-gap-matrix.md). The complete third-pass request is preserved in [product-specs/ecosystem-third-pass.txt](product-specs/ecosystem-third-pass.txt).

The two primary PDFs remain the foundation: Student Dashboard Blueprint (25 pages) and Connections & AI Tools Blueprint (13 pages), fully read during the preceding implementation, together with the baseline and [student-workspace-matrix.md](student-workspace-matrix.md). This pass extends their shared-data, career-workspace, navigation, context-panel, and phased AI behavior across roles.

## 4. Database changes

Reuse `profiles`, `student_details`, `organizations`, university invitations/memberships, project/community membership, opportunities, applications/history, events/registrations, mentors/connections/sessions, preferences and notifications.

Add domain claims, university connection requests, campus announcements, project invite codes/redemptions, space join requests, and ecosystem activity. Extend project privacy/context, invitation lifecycle, task details, opportunity eligibility, event capacity, and mentor profiles. Student structured experience/certification/portfolio entries use the existing profile JSON, without a competing Student identity table.

## 5. New migrations, in order

| File | Purpose |
|---|---|
| `20261002000006_ecosystem_relationships.sql` | Consent, pending invitations, requests, privacy and context |
| `20261002000007_ecosystem_project_actions.sql` | Hashed codes, creation/editing, tasks, removal/leave, portfolio opt-in |
| `20261002000008_ecosystem_opportunities.sql` | Draft/publish/edit/close, eligibility, applicant projection, owner notifications |
| `20261002000009_ecosystem_university.sql` | Reviewed domains, confirmed/requested connections, invitation-only enrollment, campus progress/resources |
| `20261002000010_ecosystem_events_mentors.sql` | Event audience/capacity, professional mentor profile, connection decisions and sessions |
| `20261002000011_ecosystem_integrity.sql` | Campus revocation, stale invitation/visibility checks, file activity, organizer registration access, legacy task checks |
| `20261002000012_ecosystem_directories.sql` | Narrow applicant/invitation/request names and privacy-aware portfolio projection |

Apply these through the project's existing migration workflow after reviewing them. Do not replace or replay historical files manually. New versioned RPCs fail closed when their migration is absent. Hosted schema application was not performed in this task.

## 6. Invitation architecture

Typing a verified student/mentor email creates a **pending** invitation with inviter, recipient, resource, requested non-owner role, expiry and decision timestamps. Accept/Decline are recipient-only, atomic operations. No member appears until acceptance. Managers can cancel pending invitations. Expiry, cancellation, duplicate/replay and unauthorized acceptance are rejected.

Legacy email-assignment RPCs now create invitations; direct client membership-assignment RPC execution is revoked. Legacy management pages route into the current management UI. Next API invitation endpoints also use the versioned consent RPCs.

Codes use server-generated randomness; only SHA-256 hashes are stored. Project heads choose 1–30 days and 1–100 uses, inspect usage and revoke codes. A signed-in Student previews a code before explicitly accepting. Redemption grants only member, never head.

## 7. Project privacy and visibility

Student projects default to private + invite-only. Public discovery reveals summaries; tasks, files, team and activity remain membership-protected. Invite-only, request-to-join and open-join policies are enforced server-side. Private + open-join is invalid. Company, university and community ownership reuse actual organization/community IDs and verified manager permissions. University scope is rechecked after membership revocation.

## 8. Student project flow

Create/edit name, short/detailed description, skills, category, visibility, join policy, project URL, team size and authorized context. Project Head can invite, review requests, manage codes, assign/edit tasks and remove members. Members can leave and update only permitted assigned tasks. Task fields include description, priority, deadline, creator and update timestamp. Progress derives from task completion.

Activity records include creation, invitations/decisions, joining/leaving/removal, task creation/assignment/status updates, visibility changes and file/link additions. Public accepted projects support explicit show/hide in the profile portfolio; private projects cannot be shared through that preference.

## 9. Company workspace

Shared shell with role-specific Overview, Opportunities, Applications, Projects, Communities, Events, Company Profile, Notifications and Settings. Actual records drive counts/activity. Existing organization profile editing is retained. Lists have search, status filtering, sorting and bounded results; provider error states support retry.

## 10. Company opportunity/application lifecycle

Create drafts, publish, edit and close through one authorized writer. Fields include title/type, description, skills, nice-to-have skills, mode/location, experience, duration, deadline, openings and eligibility. Publishing requires complete fields and a future deadline. Matching uses deterministic skills/preferences.

Student applies once to an eligible open posting. The company gets a notification and applicant record. Applicant names and professional summaries come from narrow authorized projections, not broad profile reads. Reviewed/Shortlisted/Interview/Selected/Rejected changes write history and Student notifications. Students can withdraw but cannot set employer-owned status.

## 11. University workspace

Overview, Students, Opportunities, Events, Projects, Communities, Announcements/Resources, University Profile, Notifications and Settings. Students screen includes domain policies, invitations, pending requests and limited enrolled-student progress. Official verification is required for campus management.

## 12. Domain verification

A verified university manager can request an exact email domain and configure confirmation/approval mode. A domain only matches after platform review sets `university_domains.approved_at`. No browser/API operation can approve that field. The reviewer must verify real domain ownership using the existing trusted administration process before approving the row; this pass does not invent an automatic ownership-verification service.

Confirmed Supabase email + exact approved domain + verified active university are all checked. Student confirmation is always required. Auto-enrollment policy connects only after that confirmation; otherwise the university decides a pending request. Self-declared institution names confer no rights.

## 13. University progress/privacy

Projection includes student name, program/year/status, shared profile completion percentage and counts of that campus's projects, registrations and owned campus applications. Private CV, personal links, unrelated applications, private personal projects and community activity are excluded. Completion is an aggregate; underlying private profile fields are not returned.

## 14. University events

Create/edit draft/published/cancelled workshops, webinars, hackathons, drives, career/placement sessions and networking events. Configure schedule, mode, venue/link, capacity, deadline, skill/program/year/graduation eligibility and campus context. Eligibility applies at SELECT and registration, with transactional capacity checks. Organizer registration counts use authorized rows. Publish/update/registration notifications feed the shared notification and context-panel flows. Community captains can publish community-scoped events.

## 15. Mentor workspace

Overview, My Profile, Connections, Sessions, Communities, Notifications and Settings. Profile supports headline, position/company, years, about, expertise, skills, industry, links, availability and topics. Sessions use a topic, time and optional meeting link for accepted student connections.

## 16. Mentor matching/connections

Expertise and skills feed deterministic ranking. Python/Django matches outrank unrelated Java/Spring profiles for a Python Student. Student requests remain pending until the mentor accepts/declines. Both parties get relevant notifications. Session creation requires an accepted connection; session records and links are visible only to their participants. No payments or calendar marketplace.

## 17. Communities

Reuse existing communities and social records. Support private/public/university-scoped/organization-scoped visibility, categories, skill tags and join policies. Invitations require acceptance; requests require manager approval. University scope is rechecked against active campus membership. Company organization scope permits explicit invitations rather than inventing organization-wide Student membership.

## 18. Posts/comments/mentions

Existing membership-protected posts, likes, comments, replies, mentions and resource links remain connected. Reply/mention notifications deep-link to the relevant discussion. No unrestricted global Student feed was introduced. Community projects retain their own joining/privacy rules.

## 19. Shared notifications

Reuse the internal `workspace_notify` writer and recipient/event-key deduplication. All ready roles can read/mark their own notifications. Meaningful events include opportunity matches, applications/status/withdrawal, space invitations/decisions, join requests, tasks, campus connections/announcements, event publication/registration/updates and mentorship decisions/sessions. No new-user signup noise. Mutations refetch shared state; focus and 30-second polling propagate other-account changes.

## 20. Student profile fixes

Add First/Second/Third/Fourth/Final Year and Graduated. Graduated clears current-year persistence and removes the requirement. Start year cannot follow graduation year. Experience, certifications and portfolio projects now have structured entries; explicit no-experience/no-certifications choices preserve a meaningful fresher profile. Existing free-text history remains preserved.

## 21. Autocomplete

`src/lib/catalogs.json` is shared by TypeScript and Python. Separate skills, roles, industries, locations, languages, interests, project categories and soft skills. Keyboard dropdowns support arrows, Enter and Escape, with labeled combobox/listbox semantics. Comma/newline/semicolon and recognized concatenated phrases split; casing deduplicates. Locations reject Remote/Hybrid; long sentences are rejected as single skills.

## 22. Validation/gating

Continue validates the current required step and shows inline errors. Final save validates all required steps. Save Progress supports partial drafts while preserving schema/URL/type validation and the required account name. Draft opportunities may omit publishing-only skills/description; publishing enforces them in API and SQL. Unsafe URLs, past publishing deadlines and invalid join-policy combinations are rejected.

## 23. Review redesign

Labeled section cards, individual values/chips and Edit controls replace the concatenated summary. Structured experience/certification/project records are reviewed separately. Only successful final save reveals Continue to Workspace plus Edit Profile; saving a draft does not masquerade as final completion.

## 24. Completion logic

Completion uses basic identity/headline, education, email verification, skills, career preferences, experience status and certification status. Explicit fresher/no-certification choices count as complete. Optional CV and project history do not penalize a fresher. University receives the aggregate corresponding to this checklist.

## 25. UI/UX

Reuse shared shell, card/input/button styles, reusable field editor, status badges, action errors, notifications and context panel. Role-specific navigation avoids showing unsupported mentor modules. Forms use human names for task assignees, sessions and community choices. AI Tools retains its polished Launching Soon and skill-preview experience; no LLM, external AI API or automation was added.

## 26. Responsive behavior

Passed 25 existing Student and 35 cross-role page/width cases at 1440, 1366, 1024, 768 and 390 pixels. No document horizontal overflow. Mobile drawer Escape/focus restoration, keyboard focus, form stacking, contextual-panel repositioning, loading/error and autocomplete behavior were checked. Screenshots are local, ignored artifacts under `work/ui-review/`.

## 27. Security/RLS

Preserved Supabase session/auth flow and FastAPI token verification. Server-verified active/onboarded/confirmed identity feeds user-token PostgREST; RLS and checked SQL writers remain authoritative. No service-role browser secret, unchecked browser recipient ID, client domain approval or owner-role invitation. Internal notification/activity helpers remain non-callable to clients. Public summaries do not grant mutation rights. Revoking campus membership blocks both task reads and legacy updates.

## 28. Tests

- Backend: **20 passed** (`backend/run.py --test`).
- Auth/account state: **12 passed** (`node --test tests/auth.test.mjs tests/account-state.test.mjs`).
- `tests/workspace-database.test.mjs`: all historical/new migrations, application/history/status, community discussion/mentions, notification isolation, registration, tasks, profile access and updated consent regression passed.
- `tests/ecosystem-database.test.mjs`: private/public project access, acceptance/replay/decline/expiry/cancel, join requests, code use limits/revoke, campus invitation/domain/approval/privacy, draft/publish/close, applicant ownership, eligibility, mentor/session isolation, portfolio opt-in and campus revocation passed.
- UI: **60 viewport cases**, plus hyd/py/back/eng autocomplete, phrase splitting, wrong-domain rejection, gating and Graduated behavior passed.
- These use isolated fixtures, not live Supabase users. Hosted/browser end-to-end acceptance is distinct and remains manual.

## 29. Lint

`npm run lint` passed with zero warnings. `git diff --check` passed. Git's local LF/CRLF notices are not whitespace failures.

## 30. TypeScript

`npx tsc --noEmit` passed. Production build also performs type validation.

## 31. Build and localhost

`npm run build` passed, generating 64 routes/pages. The existing Supabase realtime dependency emits a non-fatal webpack dynamic-dependency warning. Python tests emit a non-fatal Starlette/httpx deprecation warning; neither was suppressed.

From repository root, use two terminals:

```powershell
npm run dev
```

```powershell
python backend/run.py
```

Frontend: `http://localhost:3000`; FastAPI: `http://127.0.0.1:8000`. `NEXT_PUBLIC_API_BASE_URL` selects the API origin. The supplied root `.venv` currently references a missing Python installation; it was not altered. Validation used the available bundled Python runtime and existing ignored `backend/.deps`. Use a working Python interpreter or repair that environment independently. Do not run dev and build against the same `.next` directory concurrently.

## 32. Known limitations and deliberate boundaries

- New migrations need application to the intended Supabase database before live acceptance. No hosted schema deployment or real-account writes were performed.
- Domain ownership review remains a trusted platform-admin action. There is intentionally no self-approval or pretend DNS verification.
- No automatic email delivery was added. Existing-account university invitations notify in-app; managers can share the generated acceptance link for new accounts.
- Lists are bounded (repository reads at most 500 rows; management lists show at most 100 loaded matches). Counts are derived from the loaded permitted records, not unbounded analytics. Large deployments need server pagination/aggregate scaling.
- File sharing uses authorized HTTPS links; this pass does not introduce a general file-upload service. Private CV upload remains the existing separate storage flow.
- Portfolio preference and safe projection are implemented; this pass does not introduce a new public people-directory or anonymous profile site.
- AI automation, scraping, payment scheduling, chat marketplace and external calendar synchronization remain outside the authorized scope.
- An automatic review initially rejected the old enrollment-RPC call. Isolated consent tests established invitation-only behavior, and the API was changed to a versioned endpoint that cannot fall back to historical silent enrollment. No approval exception or bypass was used.

## 33. Exact manual acceptance sequence

Use separate browser profiles/sessions. Create accounts through the real signup flow with email addresses you control, confirm each email, complete onboarding and follow the existing approval process. Do not insert hardcoded users or change roles from browser input.

**Accounts:** Student A (Python, Django, FastAPI, PostgreSQL), Student B (Java initially), Company A, University A, Mentor Python (Python/Django/FastAPI), Mentor Java (Java/Spring). Company/University complete their official organization setup. A trusted platform administrator verifies University A. Mentors set availability to available. Record actual IDs through the UI only where needed for administration; none are hardcoded in code.

1. **Preflight:** apply all outstanding migrations in filename order using the established workflow; start API and Next. Confirm unauthenticated dashboard redirects, email verification, onboarding and existing role admission. Confirm no signup notification appears for Company A.
2. **Company opportunity:** Company A → Opportunities → Create → enter Python Backend Internship, description, Python/Django/FastAPI/PostgreSQL, mode, future deadline, openings. Save Draft. Student A cannot discover it. Company edits to Published. Student A sees it in Opportunities/Overview with explained skill matches. Apply once; repeat must fail.
3. **Application:** Company A → Applications → open Student A → Shortlisted with next-step note. Student A receives notification, sees timeline/overview/context update. Student B cannot read or mutate that application. Company closes posting; Student B cannot apply. Confirm withdrawal notifies Company for a separate active application.
4. **Company project:** Company A creates a private invite-only project. Invite Student A by email. Verify pending invitation and no member yet. Student A opens notification, inspects summary and accepts. Only then verify membership/My Projects on both sides. Repeat acceptance must fail.
5. **Student project:** Student A creates a private project and invites Student B. B accepts. A assigns a task to B. B updates state/content; unrelated accounts cannot. A changes project to public/request-to-join. An unrelated Student can see summary but not tasks/files or edit. Approve a join request and verify membership. Test leave/removal.
6. **Invite negatives/codes:** Decline, expire and cancel separate invitations; none may create membership. Generate a one-use code, copy its link, preview with an eligible Student, then accept. Further use fails. Generate another and revoke it; preview/accept fails. Codes never grant head. Private project cannot be shown on profile; public accepted project can be explicitly shown/hidden.
7. **University invitation:** University A → Students → invite Student A. Verify no enrollment before acceptance. A → My University → Accept. Confirm official connection, campus roster and limited progress. Verify roster excludes private CV/links and Company A application details.
8. **Domain:** University A requests its real official student email domain. Before platform review, a matching Student must not get domain enrollment. After verified ownership review/approval, a confirmed email on that exact domain sees the connection prompt. Approval mode creates a pending request; approving connects. Confirmation mode still requires Student action. Self-declared institution and unverified email never connect. Revocation blocks campus resources/tasks.
9. **Campus event/opportunity:** University A publishes a future workshop with capacity, registration deadline and program/year/skill audience. Eligible A sees it and its notification; ineligible B cannot read/register. A registers once; University count updates. Test a full event with another eligible Student and duplicate registration. Create a campus opportunity and verify matching eligibility at read/apply. Publish an important announcement/resource and follow its notification into My University.
10. **Mentorship:** Save both mentor profiles. A's Python profile should rank Mentor Python above Mentor Java. A requests; Mentor Python accepts in Connections. A's My Mentors updates. Mentor schedules a future session for A; A sees it and the meeting link. B cannot access A's session. Decline a separate request and verify no accepted connection/session permission.
11. **Community:** A creates Python Developers as Public + Open Join. B explicitly joins. A posts, B comments, A replies/mentions B. B's notification opens the exact discussion. Private/scoped community content remains unavailable to unrelated accounts. Test request-to-join, invitation acceptance and a community event/project with independent project policy.
12. **Profile:** Empty required step → Continue stays put with inline errors. Save Progress retains a draft. Test hyd/ben, py/djan/fas, back/soft, eng; paste concatenated and delimiter-separated examples. Reject Remote as location, sentence as skill, unsafe URL and reversed years. Graduated removes current-year requirement. Mark no experience/no certifications and verify no completion penalty. Review each labeled section, use Edit, final save, then single Continue to Workspace.
13. **Cross-role refresh:** Keep the second account open. Verify notification/count/list/context updates after focus or the 30-second polling interval. Marking read only affects that recipient. Repeat core flows at all five target widths and exercise mobile navigation/keyboard autocomplete.

Do not push or merge after acceptance without a separate instruction.
