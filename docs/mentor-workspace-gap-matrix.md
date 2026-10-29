# Mentor workspace audit and gap matrix

Branch: `feature/mentor-workspace-improvements`. Baseline: `a266fe5`.
Audit date: 2026-10-29. Initial schema-independent audit below; superseded by the authorized local extension status at the end. No hosted operations or new primary roles.

| Feature | Existing UI | Existing API | Existing DB/RPC | Required change / files | Schema blocker |
|---|---|---|---|---|---|
| Professional profile | Mentor.tsx profile editor; generic onboarding | GET/PUT /mentor/profile | mentor_profiles; eco_mentor_profile | Reuse fields; completion guidance in Mentor.tsx and MentorOverview.tsx; services/mentors.py | NO for existing fields; YES for new persisted fields |
| Explicit independent/university/company context | None; employer is free text | None | No approved Mentor–organization relation | Requires approved relationship model below; do not store in employer text or Auth metadata | YES |
| Mentor overview / context panel | Generic RoleWorkspace; RoleContext already has requests/sessions | /workspace | eco_connections, mentor_sessions, notifications | Dedicated MentorOverview; reuse aggregate data and existing polling | NO for existing data; YES for affiliated views |
| Requests / active mentees | Mentor.tsx | /connections, /mentorship/{id}/request, /connections/{id}/decision | mentor_connections unique student/mentor pair; eco_mentor_request/decide | Preserve lifecycle; skill explanations and distinct views | NO |
| Skill matching | Student-to-Mentor ranking exists | catalog service | eco_connections projects authorized students' names/skills | Deterministic shared skill/expertise matching in services/mentors.py, returned in /workspace | NO within existing connections |
| Global/shared-project Student discovery | No Mentor-safe skills directory | No suitable directory endpoint | student_details restrictive privacy; workspace_directory returns permitted member names, not discovery consent/skills | Do not query private Student rows or infer consent from project membership | YES for broader discovery |
| University affiliation and progress | Campus supports Students only | /campus Student flows | university_student_memberships/invitations and university_connection_requests; Student role checks | Approved Mentor relation, scoped progress projection and authorization required | YES |
| Company affiliation | No supported relationship | None | organizations.created_by is ownership, not employment; mentor_profiles.company is self-authored | Same approved Mentor relation; never give organization ownership/admin | YES |
| Mentor openings/applications | Publishing/applicants are Student recruitment | OpportunityEdit, application endpoints | workspace_apply requires workspace_ready('student'); applications.student_id; no Mentor audience | Audience discriminator and role-aware application RPC/projection required | YES |
| Project invitations | SpaceActions.tsx; Invitations.tsx | /relationships/projects/{id}/invitations; invitation decisions | eco_invite/eco_invitation_decide; project_members contextual roles | Reuse email invitations and consent; no implicit project_head | NO for permitted existing projects; YES for affiliation-scoped access |
| Sessions | Mentor.tsx session form/list | POST /sessions with SessionCreate | eco_mentor_session; accepted connection required | Retain validation and notifications; clear upcoming empty state | NO |
| Student Mentor visibility | StudentListing / mentorship details | catalog mentorship | mentor_profiles and workspace_directory('mentors') | Existing expertise/skills matching preserved; cannot claim verified affiliations | YES for affiliation badges |
| Notifications | Existing notification center | User-scoped mark-one/mark-all | workspace_notify called by checked RPCs | Existing request/decision/session/project notifications reused | NO; YES for new affiliation/application lifecycle |
| Mentor documents | None | None | student-resumes is Student-only | No Mentor upload offered; separate storage design needed | YES |

## Exact database blockers and minimal proposal (not a migration)

1. **Approved affiliation relation is missing.** mentor_profiles has headline, bio, current_position, company text, expertise, availability_status, years_experience, skills, industry, links and topics. It has no organization FK, approval status, approver or revocation history. Organizations represent organizations/owners, not approved Mentor membership. Workspace invitation kind is constrained to projects/communities. University relations explicitly represent Students. No existing general metadata field can safely substitute for an approved relation and RLS checks.

   Smallest proposed addition: one `mentor_affiliations` relation with mentor profile FK, organization FK, pending/accepted/rejected/ended state, requester, decision actor/timestamps and end timestamp. Enforce one pending-or-active request per pair and one accepted affiliation per Mentor with partial unique indexes; validate organization type and Mentor primary role in checked request/decision/end RPCs. Add narrowly scoped participant/organization-owner reads and notifications using owner-mediated helpers. Independent context is the absence of an accepted affiliation, not a new auth role. If onboarding intent must persist before requesting, add a constrained preference on mentor_profiles separately. No blanket University/Company data access follows acceptance; explicit Mentor-safe projections are required.

   Affected flows: Mentor onboarding/context; Company/University Mentor requests and progress; affiliation departure; scoped project eligibility. Existing Student memberships must remain unchanged. Those dependent stages are paused. Professional profile, own mentorship, sessions, authorized matching and existing project invitations can continue.

2. **Mentor audience and application semantics are missing.** Existing opportunity roles are job-role tags, not account audience. Eligibility describes Students; workspace_apply requires Student readiness, and applicant summaries/notifications assume Students. Reusing these fields without DB changes would mislabel mentors and bypass intended boundaries.

   Smallest proposed extension: explicit opportunity audience defaulting to Student, retain existing application storage only after generalizing its applicant identity semantics and checked RPCs/projections for each audience. Approval must call the affiliation decision path transactionally, not infer affiliation from application status alone. Tests must preserve every Student application default. This is a separate reviewed migration scope from affiliation; no implementation or migration created here.

3. **Broader Student matching authorization is missing.** Current safe source is eco_connections for the caller. Add a separately reviewed, consent-aware Student projection before recommending strangers or exposing shared-project skills. No new query to private Student details is used in this pass.

No migration has been created. No mock affiliation controls, false independent/affiliated badges, organization admin privileges, Mentor opportunity listings, or insecure resume uploads are shipped. The primary account role remains `mentor`.

## Initial continuation scope (historical)

Implement and test only schema-independent improvements. Affiliation selection/approval, affiliated dashboards, Company/University Mentor views, Mentor-targeted recruitment and real affiliation badges await explicit database approval. Existing general onboarding remains intact; supported Mentor professional fields get a completion prompt after account admission, not a fabricated persisted onboarding state.


## Authorized local extension status — 2026-10-29

The later request authorized one local migration and the blocked application flows.
The earlier blockers above describe the original audit, not the final local state.

| Gap | Final local implementation | Hosted activation |
|---|---|---|
| Independent / Company / University context | Derived accepted affiliation; organization choice and request UI; primary role remains Mentor | Pending manual deployment |
| Two-way affiliation | Mentor requests; owner invites; opposite-party consent; reject/cancel/end; partial unique indexes | Pending manual deployment |
| Private organization directory | Own organization requests, Mentor professional profiles and accepted scoped progress | Pending manual deployment |
| Mentor recruitment | Constrained opportunity audience; existing publishing/application/history RPCs extended | Pending manual deployment |
| Independent Mentor applications | Profile-based submission; review/shortlist/select/reject/withdraw; selection does not affiliate | Pending manual deployment |
| Explicit selected-applicant invitation | Existing affiliation request RPC invoked by a separate organization action; Mentor acceptance required | Pending manual deployment |
| Student badges | Accepted-only organization label; Independent only when new schema is available and no accepted badge exists | Pending manual deployment |
| Scoped sessions / campus projects | Explicit session sharing; aggregate counts only; actual project invitation/membership still required | Pending manual deployment |
| Notifications | Existing notification helper and deduplication keys; affiliation and application deep links | Pending manual deployment |
| Missing schema | Guarded unavailable state; capability check before reused recruitment mutations; existing Mentor flows stay available | Works before deployment |

Implementation: `20261029000000_mentor_affiliations.sql`, `mentor_affiliations.py`
service/router, `MentorAffiliations.tsx`, `MentorRecruitment.tsx`, workspace aggregate,
Student badges and optional session scope. See `mentor-affiliation-database-review.md`
for the design, authorization matrix, deployment and validation evidence.
