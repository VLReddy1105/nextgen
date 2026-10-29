# Mentor affiliation and recruitment — final local report

2026-10-29. Supersedes the earlier schema-independent report.

1. **Branch:** `feature/mentor-workspace-improvements` in `C:\Users\Jai\nextgen`.
2. **Git status:** uncommitted tracked modifications and new files; earlier Mentor
   work preserved. HEAD remains `a266fe5`. No branch switch or new commit.
3. **Migration:** `supabase/migrations/20261029000000_mentor_affiliations.sql`.
   Exactly one new migration; 25 local files. Hosted 24 is the user's last reported
   count, not a new remote verification.
4. **Schema:** new `mentor_affiliations`, RLS, three indexes and update trigger;
   constrained `opportunities.audience`; nullable `mentor_sessions.organization_id`;
   application identity/audience guards; modified opportunity visibility policy,
   scope/application/publication/status/activity functions.
5. **Necessity:** no existing relationship safely represents Mentor–organization
   consent. Audience separates Mentor recruitment while reusing applications.
   Session scope prevents disclosure of historical private mentoring activity.
6. **Architecture:** Mentor remains the primary role; organization type supplies
   Company/University context. One accepted affiliation, no duplicate active pair,
   explicit initiator/decision actors, cancellation/end preserve history.
7. **Independent:** no affiliation row required. Display derives from accepted,
   eligible affiliation only. Current employer text never establishes affiliation.
8. **University:** Mentor requests verified university owner approval, or owner
   invites and Mentor consents. Accepted affiliation satisfies campus eligibility;
   project membership still requires its existing invitation/acceptance.
9. **Company:** same two-way consent, scoped to its current official owner.
   Affiliation never grants Company administration or unrelated project access.
10. **Recruitment:** existing opportunities with constrained Mentor audience;
    organization-owned requirements include skills, experience, availability,
    deadline and publication status. Skill-overlap recommendations are explicit.
11. **Applications:** existing application/history records contain Mentor identity
    under historical `student_id`; professional Mentor profile is shown. Independent
    Mentors apply; owners review/select/reject; Mentor may withdraw. Selection does
    not affiliate; a separate invitation and acceptance are required.
12. **RLS:** affiliation SELECT only for Mentor/authorized org owner; direct API
    writes revoked. No unrelated organization or Student sees private affiliations.
    Student directory gets only accepted public badges through a checked RPC.
13. **New RPCs:** `eco_mentor_hub`, `eco_mentor_affiliation_request`,
    `eco_mentor_affiliation_decide`, `eco_mentor_badges`,
    `eco_mentor_session_scoped`. Five internal authorization/trigger helpers.
14. **Grants:** eight new/modified public RPCs are authenticated-only. New helpers,
    campus-scope helper and application-activity trigger are not API executable.
    Existing hardened helpers remain blocked; trusted nested owner calls pass.
    Affiliation table gets authenticated SELECT only; no API TRUNCATE.
15. **Student:** accepted Company/University badge or truthful Independent label;
    no label inferred before migration. Existing Student recruitment stays separate.
16. **Company:** Mentor invitations/requests, professional profiles, accepted scoped
    progress, Mentor opening publication and applicant review.
17. **University:** same controls for verified owned university; scoped mentee,
    project and explicit session aggregates. No private session rows/URLs.
18. **Notifications:** existing recipient-safe helper and event keys; affiliation
    request/invitation/decision and application lifecycle deep links. Duplicate
    decisions rejected; mark-one/mark-all remains functional.
19. **Tests:** 63 backend; 21 Node entries including three isolated DB suites;
    25 Student + 35 cross-role + 18 Mentor + 18 new affiliation viewport cases;
    role interactions, refresh performance, typecheck, lint, build 69/69,
    diff check. Full evidence and known dependency warnings are in the review.
20. **Migration risk:** table locks and function/policy replacement require an
    approved deployment window. Existing rows retain Student audience and NULL
    session scope. No destructive backfill or primary role change. Local tests
    cannot substitute for hosted PostgREST and real-account verification.
21. **Future hosted command, NOT executed:** `npx supabase db push`.
    First manually preview with `npx supabase db push --dry-run` and require only
    this migration pending. No reset or repair.
22. **Verification:** `scripts/verify-mentor-affiliations.sql`, metadata only in a
    read-only transaction. See review for expected grants/indexes/RLS and manual
    two-account acceptance tests after separately approved deployment.
23. **Limitations:** not hosted yet; new features safely gated until migration.
    Existing owner-only org authority; 500-row directory cap; current profile
    rather than application snapshot; no resume storage or inferred completion
    scores; no hosted concurrency/load test or live account mutation performed.

Detailed architecture, manual steps and validation:
[Database review](mentor-affiliation-database-review.md).
[Updated gap matrix](mentor-workspace-gap-matrix.md).

Git push performed: NO
Git merge performed: NO
Real Supabase db push performed: NO
Hosted database modified: NO


## Final focused audit

[Security/compatibility audit](mentor-affiliation-security-audit.md): four direct scope callers and transitive authorization reviewed; explicit six-field Mentor profile whitelist replaces whole-row JSON. Pre-migration Student opportunity upgrade regression passes. Full local validation passed again, including build 69/69. Ready for separately authorized dry-run; no hosted operation performed.
