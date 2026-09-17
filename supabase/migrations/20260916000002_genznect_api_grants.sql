-- Make API privileges explicit. RLS still decides which rows each role may see
-- or change; these grants only allow the corresponding SQL operations to run.
-- This also supports Supabase projects where new public tables are not exposed
-- automatically to Data API roles.
grant usage on schema public to anon, authenticated, service_role;

-- Existing schema, retaining the operations allowed by its original policies.
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.organizations to authenticated;
grant select, insert, update, delete on public.student_details to authenticated;
grant select, insert, update, delete on public.posts to authenticated;
grant select on public.posts to anon;

-- Role-specific profile data.
grant select, insert, update on public.founder_profiles, public.mentor_profiles to authenticated;

-- Students may read their own memberships; verified university owners may read
-- their own memberships and invitations. All mutations use checked RPCs.
grant select on public.university_student_memberships,
  public.university_student_invitations to authenticated;

-- Space creation and member assignment use checked RPCs. Resource managers
-- can edit only rows allowed by the Captain/Project Head RLS policies.
grant select, update on public.communities, public.projects to authenticated;
grant select on public.community_members, public.project_members to authenticated;

-- Supabase service_role is reserved for trusted back-office administration.
grant all on public.profiles, public.organizations, public.student_details,
  public.posts, public.founder_profiles, public.mentor_profiles,
  public.university_student_memberships, public.university_student_invitations,
  public.communities, public.community_members, public.projects,
  public.project_members to service_role;
