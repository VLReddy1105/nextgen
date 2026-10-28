# Privilege hardening review

Branch: feature/supabase-final-setup. Migration: `20261028000000_harden_workspace_privileges.sql`.

Scope is the three verified blockers, not a schema or general privilege redesign. The supplied hosted ACL lists explicit postgres/anon/authenticated/service_role EXECUTE on all three targeted helpers. This migration removes PUBLIC/anon/authenticated EXECUTE only. It preserves owner/service permissions and every other function ACL, including RLS helpers and public RPCs. Broader anonymous RPC/default-grant hardening and legacy assignment ACLs remain separate review items, not silently included here.

## Helper call audit

### workspace_notify

Direct callers in final local definitions (all SECURITY DEFINER):

- `enroll_university_student` (20261002000009_ecosystem_university.sql)
- `workspace_application_status` (20261002000002_workspace_actions.sql)
- `workspace_post` (20261002000002_workspace_actions.sql)
- `workspace_register` (20261002000010_ecosystem_events_mentors.sql)
- `workspace_refresh_reminders` (20261002000005_workspace_reminders.sql)
- `workspace_university_update` (20261002000005_workspace_reminders.sql)
- `eco_invite` (20261002000006_ecosystem_relationships.sql)
- `eco_invitation_decide` (20261002000006_ecosystem_relationships.sql)
- `eco_join_request` (20261002000006_ecosystem_relationships.sql)
- `eco_request_decide` (20261002000006_ecosystem_relationships.sql)
- `eco_code_accept` (20261002000007_ecosystem_project_actions.sql)
- `eco_task_save` (20261002000007_ecosystem_project_actions.sql)
- `eco_opportunity_save` (20261002000008_ecosystem_opportunities.sql)
- `eco_application_activity` (20261002000008_ecosystem_opportunities.sql)
- `eco_university_connect` (20261002000009_ecosystem_university.sql)
- `eco_university_decide` (20261002000009_ecosystem_university.sql)
- `eco_campus_invitation_decide` (20261002000009_ecosystem_university.sql)
- `eco_announcement` (20261002000009_ecosystem_university.sql)
- `eco_event_save` (20261002000010_ecosystem_events_mentors.sql)
- `eco_mentor_request` (20261002000010_ecosystem_events_mentors.sql)
- `eco_mentor_decide` (20261002000010_ecosystem_events_mentors.sql)
- `eco_mentor_session` (20261002000010_ecosystem_events_mentors.sql)

### eco_activity

Direct callers in final local definitions (all SECURITY DEFINER):

- `workspace_join` (20261002000006_ecosystem_relationships.sql)
- `eco_invite` (20261002000006_ecosystem_relationships.sql)
- `eco_invitation_decide` (20261002000006_ecosystem_relationships.sql)
- `eco_request_decide` (20261002000006_ecosystem_relationships.sql)
- `eco_code_create` (20261002000007_ecosystem_project_actions.sql)
- `eco_code_revoke` (20261002000007_ecosystem_project_actions.sql)
- `eco_code_accept` (20261002000007_ecosystem_project_actions.sql)
- `eco_space_save` (20261002000007_ecosystem_project_actions.sql)
- `eco_member_remove` (20261002000007_ecosystem_project_actions.sql)
- `eco_task_save` (20261002000007_ecosystem_project_actions.sql)
- `eco_file_activity` (20261002000011_ecosystem_integrity.sql)
- `eco_invitation_cancel` (20261002000011_ecosystem_integrity.sql)

### eco_space_owner

Direct callers in final local definitions (all SECURITY DEFINER):

- `eco_activity` (20261002000006_ecosystem_relationships.sql)
- `eco_join_request` (20261002000006_ecosystem_relationships.sql)

Owner-executed SECURITY DEFINER calls check nested EXECUTE as the caller function owner, not the browser role. Revoking browser-role grants does not remove owner EXECUTE. Existing declarations use an empty search_path and qualified objects. Trigger callers are included above. Hosted supplied ACL grantor is postgres, but function ownership was not returned: the post-deployment query additionally reports owner effective access for each nested path; this must pass before accepting deployment. No grant is added to compensate.

Reference: https://www.postgresql.org/docs/17/sql-createfunction.html

## Preserved function identities

Every existing function other than the three named helpers is left unchanged. The following final local definitions are preserved verbatim and retain their existing privileges (includes trigger/RLS helpers, not all are public API entry points):

- `accept_university_invitation(p_token_hash text)`
- `assign_community_member(p_community_id uuid, p_user_id uuid, p_role text)`
- `assign_community_member_by_email(p_community_id uuid,p_email text,p_role text)`
- `assign_project_member(p_project_id uuid, p_user_id uuid, p_role text)`
- `assign_project_member_by_email(p_project_id uuid,p_email text,p_role text)`
- `can_manage_university(p_university_id uuid)`
- `cancel_university_invitation(p_university_id uuid, p_invitation_id uuid)`
- `create_community(p_name text, p_slug text, p_description text default null)`
- `create_project(p_title text, p_slug text, p_description text default null)`
- `eco_announcement(p_university uuid,p_title text,p_body text,p_url text,p_important boolean)`
- `eco_applicant_summary(p_id uuid)`
- `eco_applicants()`
- `eco_application_activity()`
- `eco_campus_invitation_decide(p_id uuid,p_accept boolean)`
- `eco_campus_invitations()`
- `eco_campus_invite(p_university_id uuid,p_email text,p_token_hash text,p_student_name text default null,p_student_identifier text default null,p_program text default null,p_department text default null)`
- `eco_campus_progress(p_university uuid)`
- `eco_campus_requests()`
- `eco_code_accept(p_token text)`
- `eco_code_create(p_id uuid,p_hash text,p_days integer default 7,p_limit integer default 10)`
- `eco_code_preview(p_token text)`
- `eco_code_revoke(p_id uuid)`
- `eco_connections()`
- `eco_context(p_org uuid)`
- `eco_domain_save(p_university uuid,p_domain text,p_auto boolean)`
- `eco_eligible(p_university uuid,p_rules jsonb,p_user uuid default auth.uid()`
- `eco_event_attending(p_id uuid)`
- `eco_event_save(p_data jsonb,p_id uuid default null)`
- `eco_file_activity()`
- `eco_invitation_cancel(p_id uuid)`
- `eco_invitation_decide(p_id uuid,p_accept boolean)`
- `eco_invitation_guard()`
- `eco_invite(p_kind text,p_id uuid,p_email text,p_role text default 'member')`
- `eco_join_request(p_kind text,p_id uuid)`
- `eco_manager(p_kind text,p_id uuid)`
- `eco_member_remove(p_kind text,p_id uuid,p_user uuid)`
- `eco_membership_scope()`
- `eco_mentor_decide(p_student uuid,p_accept boolean)`
- `eco_mentor_profile(p_data jsonb)`
- `eco_mentor_request(p_mentor uuid)`
- `eco_mentor_session(p_student uuid,p_title text,p_starts timestamptz,p_url text)`
- `eco_opportunity_save(p_data jsonb,p_id uuid default null)`
- `eco_portfolio(p_project uuid,p_show boolean)`
- `eco_portfolio_projects(p_student uuid)`
- `eco_relationship_directory(p_kind text,p_id uuid)`
- `eco_request_decide(p_id uuid,p_accept boolean)`
- `eco_scope_allowed(p_kind text,p_id uuid,p_user uuid)`
- `eco_space_guard()`
- `eco_space_save(p_kind text,p_data jsonb,p_id uuid default null)`
- `eco_space_visible(p_kind text,p_id uuid)`
- `eco_task_save(p_project uuid,p_data jsonb,p_id uuid default null)`
- `eco_university_connect(p_university uuid)`
- `eco_university_decide(p_id uuid,p_accept boolean)`
- `enforce_organization_verified_change()`
- `enforce_post_review_fields()`
- `enforce_profile_identity()`
- `enforce_profile_role_change()`
- `enroll_university_student(p_university_id uuid,p_email text,p_token_hash text,p_student_name text default null,p_student_identifier text default null,p_program text default null,p_department text default null)`
- `finish_onboarding(   p_role public.primary_account_role, p_name text, p_headline text default null,   p_organization_name text default null, p_website text default null,   p_field_of_study text default null, p_degree text default null,   p_skills text[] default '{}', p_interests text[] default '{}',   p_portfolio_url text default null, p_linkedin_url text default null, p_github_url text default null,   p_expertise text[] default '{}' )`
- `handle_new_user()`
- `is_community_captain(p_community_id uuid)`
- `is_platform_admin()`
- `is_project_head(p_project_id uuid)`
- `list_space_member_names(p_kind text, p_space_id uuid)`
- `list_university_students(p_university_id uuid)`
- `protect_context_owner()`
- `protect_legacy_student_university()`
- `protect_official_organization()`
- `revoke_university_student(p_university_id uuid, p_student_user_id uuid)`
- `set_updated_at()`
- `update_student_workspace_profile(p_data jsonb)`
- `workspace_application_status(p_id uuid,p_status text,p_note text default '',p_interview_at timestamptz default null)`
- `workspace_applied(p_opportunity uuid)`
- `workspace_apply(p_id uuid)`
- `workspace_audience(p_university uuid,p_community uuid)`
- `workspace_create(p_kind text,p_data jsonb)`
- `workspace_directory(p_kind text,p_id uuid default null)`
- `workspace_invite(p_kind text,p_id uuid,p_email text)`
- `workspace_join(p_kind text,p_id uuid)`
- `workspace_member(p_kind text,p_id uuid,p_user uuid default auth.uid()`
- `workspace_post(p_community uuid,p_content text,p_post uuid default null,p_parent uuid default null,p_mentions uuid[] default '{}')`
- `workspace_publish(p_kind text,p_data jsonb)`
- `workspace_react(p_id uuid,p_liked boolean)`
- `workspace_ready(p_role text default null)`
- `workspace_refresh_reminders()`
- `workspace_register(p_id uuid,p_registered boolean)`
- `workspace_resource(p_kind text,p_id uuid,p_data jsonb)`
- `workspace_save(p_id uuid,p_saved boolean)`
- `workspace_stats(p_kind text,p_ids uuid[])`
- `workspace_task(p_id uuid,p_status text)`
- `workspace_university_update()`

## Tables losing TRUNCATE

The supplied hosted grants list both anon and authenticated on each of these 38 application tables. PUBLIC is also revoked to prevent inherited access. Owner/service grants are unchanged.

`application_history`, `applications`, `campus_announcements`, `communities`, `community_comments`, `community_members`, `community_posts`, `community_reactions`, `community_resources`, `ecosystem_activity`, `event_registrations`, `events`, `founder_profiles`, `mentor_connections`, `mentor_profiles`, `mentor_sessions`, `notifications`, `opportunities`, `organizations`, `posts`, `profiles`, `project_activity`, `project_code_redemptions`, `project_files`, `project_invite_codes`, `project_members`, `project_tasks`, `projects`, `saved_opportunities`, `space_join_requests`, `student_details`, `student_preferences`, `support_reports`, `university_connection_requests`, `university_domains`, `university_student_invitations`, `university_student_memberships`, `workspace_invitations`

## Notification path

`backend/app/api/routes/notifications.py` updates notifications directly through the user-scoped repository: mark-one filters id and recipient; mark-all filters recipient and unread state. Both change only read_at. SELECT and recipient RLS stay unchanged. Table UPDATE and per-column UPDATE are removed from PUBLIC/anon/authenticated; authenticated receives only UPDATE(read_at), which it already had under the intended migration contract. No notification RPC is invented.

## Validation / acceptance

Local tests passed with broad hosted-style default grants before replaying all 24 migrations. Assertions verify helper denial, unchanged other function ACLs, preserved service helper access, zero API-role TRUNCATE, column-only notification UPDATE, idempotency, mark-one/mark-all, denial of content/recipient updates and recipient isolation. Existing nested application, invitation, campus, event, mentorship and reminder flows pass. The prepared verification SQL also executes successfully in the isolated database. Backend: 31 passed; Node auth/config/database: 17 entries passed; TypeScript and lint passed. Production build passed (64/64 pages); existing Supabase Realtime dynamic-dependency warning remains. git diff --check passed. Localhost restored after build. The maintainer subsequently reports successful deployment, matching local/remote histories (24/24), and passing read-only privilege verification for all scoped corrections and owner-mediated nested access. This is maintainer-supplied hosted evidence; the agent did not deploy it. No further hosted changes are authorized. Live multi-account acceptance remains distinct from the passing isolated tests.


## Exact public/RLS RPC names retained for authenticated execution

`accept_university_invitation`, `assign_community_member_by_email`, `assign_project_member_by_email`, `can_manage_university`, `cancel_university_invitation`, `create_community`, `create_project`, `eco_announcement`, `eco_applicant_summary`, `eco_applicants`, `eco_campus_invitation_decide`, `eco_campus_invitations`, `eco_campus_invite`, `eco_campus_progress`, `eco_campus_requests`, `eco_code_accept`, `eco_code_create`, `eco_code_preview`, `eco_code_revoke`, `eco_connections`, `eco_context`, `eco_domain_save`, `eco_eligible`, `eco_event_attending`, `eco_event_save`, `eco_invitation_cancel`, `eco_invitation_decide`, `eco_invite`, `eco_join_request`, `eco_manager`, `eco_member_remove`, `eco_mentor_decide`, `eco_mentor_profile`, `eco_mentor_request`, `eco_mentor_session`, `eco_opportunity_save`, `eco_portfolio`, `eco_portfolio_projects`, `eco_relationship_directory`, `eco_request_decide`, `eco_scope_allowed`, `eco_space_save`, `eco_space_visible`, `eco_task_save`, `eco_university_connect`, `eco_university_decide`, `enroll_university_student`, `finish_onboarding`, `is_community_captain`, `is_platform_admin`, `is_project_head`, `list_space_member_names`, `list_university_students`, `revoke_university_student`, `update_student_workspace_profile`, `workspace_application_status`, `workspace_applied`, `workspace_apply`, `workspace_audience`, `workspace_create`, `workspace_directory`, `workspace_invite`, `workspace_join`, `workspace_member`, `workspace_post`, `workspace_publish`, `workspace_react`, `workspace_ready`, `workspace_refresh_reminders`, `workspace_register`, `workspace_resource`, `workspace_save`, `workspace_stats`, `workspace_task`
