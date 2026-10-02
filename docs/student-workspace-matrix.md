# Student Workspace implementation matrix

Sources read completely: Dashboard Blueprint (D, 25 PDF pages) and Connections & AI Tools Blueprint (C, 13 PDF pages). Page numbers below are physical PDF pages, including covers. These documents are used together; the master prompt supplies implementation constraints.

All paths are repository-relative. Existing auth, `.env.local`, five primary roles, and marketing remain unchanged. Existing migration files remain unchanged.

| PDF requirement | Existing implementation / missing functionality | Reuse | Modify/add | Backend/database requirement | Stage |
|---|---|---|---|---|---|
| D7,14,17; C3,8: onboarding and shared profile | Single onboarding form; basic academic fields/skills/links; missing step-by-step flow, career fields and completion | `components/onboarding/OnboardingForm.tsx`, `api/onboarding`, `student_details`, `profiles` | Student profile wizard, tag selector, `lib/api/students.ts`, backend student schemas/service | Extend student_details; atomic profile RPC; identity from verified Auth; no duplicated module skill lists | 2–4 |
| D9,14; master prompt: dropdowns/multi-select | Comma-separated skill input only | Existing field limits and role selection | Searchable custom skill/interest chips; education/work-mode/availability selectors; filters | Normalize/deduplicate/bound lists server-side | 3–4,8 |
| D4,6,15–17,23; C9: sidebar/header | Shared 270px sidebar, mobile drawer; missing submenus/counters/user completion | DashboardChrome/Header/Sidebar, logo | Student-only shell, exact sidebar order, one expanded section, compact account menu | Shared workspace counts from records | 5 |
| D19; C5–7: right panel | Missing | Existing domain IDs | Student context panel: Today, Applications, Deadlines, Quick Actions | Same event/application/task records as modules; no dashboard-only copies | 5,10,18 |
| D7,20–21,25; C6: Overview | Role-specific copy and membership counts | Existing overview, firstName | Student overview, greeting, completion checklist, recommendations, recent work, activity | Workspace aggregate; eligibility then deterministic ranking | 6 |
| D7–8,14; C8: My University | Real verified memberships/invites; sparse presentation | My University route, enrollment RPCs, organizations | Linked/independent views; education and verification instructions | Preserve official verification; self-declared university is unverified; scoped campus content | 7 |
| D8–9,18; C6: Opportunities | Placeholder | Existing organization identities | Search/filter/sort/detail/save/apply | New opportunities/saves; expiry/visibility/eligibility checks; normalized tags | 8 |
| D9–10; C6: Applications | Placeholder | Auth actor, organization ownership | List/counts/detail/timeline/withdraw | Applications/history; unique applicant/opportunity; atomic status/history/notification; employer-only status | 9–10 |
| D10–11; C7: Projects | Existing identity/memberships/manage UI | projects/project_members, management RPCs | Discovery/detail tabs/task board/team/files/activity | Add task/activity/file/invite records; self-join requests; assigned-task permission | 11 |
| D11–12; C7: Communities | Membership list and captain management | communities/community_members | Discovery/detail/feed/posts/comments/replies/likes/join | Add invitations/social records/resources; preserve old moderated posts; recipient-safe mentions | 12 |
| D12; C6: Events | Placeholder | Organization/community identity | Events filters/detail/registration | Events/registrations, audience scoping, duplicate guard, notification propagation | 13 |
| D13; C5,7: Mentorship | mentor_profiles only | Mentor expertise/profile | Read-only mentor discovery/detail, own relationships/session views | Scoped mentor directory; no invented ratings; lightweight relationships/sessions only | 14 |
| D13,22; C5–7,13: Notifications | Placeholder | Verified actor, existing account state | One service, bell/list/unread badges/deep links | Notifications with recipient RLS and dedupe key; transactional domain event delivery | 10,18 |
| C8–13: AI Tools | Absent | Student skills/interests | AI Tools after Mentorship and before Notifications; three Launching Soon cards; domain preview | Deterministic curated domain map; no LLM/external API/resume generation | 15 |
| D14: Settings | Redirect to profile | Recovery/logout and university flows | Account/security/verification; working preferences; clearly unavailable external connections | Per-user preferences; preserve Supabase auth | 16 |
| D15: Help | Absent | Existing routes | Help/guidelines/report form | Own support reports; no invented support address | 17 |
| C3–7,12–13: module connections | Isolated writes, no notification pipeline | Existing IDs/RPCs | Shared API client/provider; refetch after mutation/focus/polling | Domain services emit shared events; status/invite/reply/event pipelines; membership-derived audience | 18 |
| D4,15,19,22: responsive/accessibility/empty states | Some responsive structure, no contextual panel | Existing design language | 230px sidebar, 300px context at large sizes; drawer/focus/keyboard; loading/error/retry | No fabricated demo counts or active dead controls | 19–20 |

## Fields and profile ownership

Identity comes from Auth + profiles. Existing `student_details.skills` and `interests` remain authoritative normalized arrays. Extend student_details for soft skills, categorized interests, career roles/industries/locations/work mode/availability, education years and self-declared institution, experience, certifications, personal projects, languages, and resume storage reference. University verification comes only from existing memberships. Projects completed through the platform are joined into profile connections rather than copied into a second project database.

## Explicit conflict resolutions

1. D7/C8 suggest domain/reference verification. Existing official university enrollment is retained; typing a university name or domain never grants a membership. Invitation acceptance remains the supported verified path.
2. D6 includes an early "Saved" application submenu; D9/D23 and the master prompt specify application statuses. Saved postings belong to Opportunities, not submitted Applications.
3. D13 describes a read-only mentorship MVP with a rating action. Do not fabricate ratings or enable unimplemented session administration; show genuine stored values only.
4. C11–12 show functional AI resume/job tools as future architecture. Current user scope explicitly requires Launching Soon; only skill-based preview is active.
5. D22–23 calls for phased activation. Complete and verify each module before presenting working controls; truthful empty states represent no records, never a silently failed API.
6. Current RLS restricts team/profile reads and self-join. Add narrowly scoped functions/policies; do not bypass those restrictions with browser-supplied roles or a service key.

## Verification

Test token rejection/role admission; profile validation/completion; ranking/filter/expiry; duplicate apply/join/register; employer/task/notification ownership; timelines and notifications; then frontend lint/types/build and responsive widths 1440/1366/1024/768/390. Test fixtures are isolated from application data. New migrations are authored for review; applying them to a hosted database is a separate observable operation, never claimed implicitly.

## Implementation outcome

Stages 2–18 are implemented in the local working tree, with the scoped mentorship/AI/future integration limits described above. Stage 19 has passed an isolated 25-case component/viewport check. Stage 20 passes backend, auth/account-state, database/RLS and component checks, lint, types and production build. Live authenticated acceptance is still pending installation of the six new migrations. A read-only hosted schema probe confirmed the new domain tables are absent. See `student-workspace-report.md` and `../backend/README.md` for the exact boundaries, tests and setup.
