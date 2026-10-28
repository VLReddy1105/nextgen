-- Correct direct hosted grants left intact by earlier REVOKE FROM PUBLIC.
-- Privileges only: no objects, policies, ownership, or data changes.
-- Checked SECURITY DEFINER callers execute as their owner and retain helper access.
REVOKE EXECUTE ON FUNCTION
  public.workspace_notify(uuid,text,text,text,uuid,text,text),
  public.eco_activity(text,uuid,text),
  public.eco_space_owner(text,uuid)
FROM PUBLIC, anon, authenticated;

-- Explicit application-table list; leave service/admin privileges unchanged.
REVOKE TRUNCATE ON TABLE
  public.application_history,
  public.applications,
  public.campus_announcements,
  public.communities,
  public.community_comments,
  public.community_members,
  public.community_posts,
  public.community_reactions,
  public.community_resources,
  public.ecosystem_activity,
  public.event_registrations,
  public.events,
  public.founder_profiles,
  public.mentor_connections,
  public.mentor_profiles,
  public.mentor_sessions,
  public.notifications,
  public.opportunities,
  public.organizations,
  public.posts,
  public.profiles,
  public.project_activity,
  public.project_code_redemptions,
  public.project_files,
  public.project_invite_codes,
  public.project_members,
  public.project_tasks,
  public.projects,
  public.saved_opportunities,
  public.space_join_requests,
  public.student_details,
  public.student_preferences,
  public.support_reports,
  public.university_connection_requests,
  public.university_domains,
  public.university_student_invitations,
  public.university_student_memberships,
  public.workspace_invitations
FROM PUBLIC, anon, authenticated;

-- Backend mark-one and mark-all PATCH only read_at, with recipient RLS.
REVOKE UPDATE ON TABLE public.notifications FROM PUBLIC, anon, authenticated;
-- Clear any existing per-column UPDATE grants as well as the table grant.
REVOKE UPDATE (id,recipient_user_id,type,title,message,source_module,
  source_entity_id,action_url,read_at,created_at,metadata,event_key)
ON TABLE public.notifications FROM PUBLIC, anon, authenticated;
GRANT UPDATE (read_at) ON TABLE public.notifications TO authenticated;
