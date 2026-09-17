-- Enum types for the initial GenZnect schema.
--
-- user_role and organization_type mirror the TypeScript unions already declared
-- in src/types/index.ts. Keep the two in sync: adding a value here requires
-- adding it there (and regenerating src/lib/supabase/types.ts).

create type public.user_role as enum (
  'student',
  'founder',
  'mentor',
  'professional',
  'company_representative',
  'university_representative',
  'community_coordinator',
  'platform_admin'
);

create type public.organization_type as enum (
  'startup',
  'company',
  'university',
  'student_organization',
  'community',
  'nonprofit'
);

-- Drives the admin approval flow for posts. New posts start as 'pending' and
-- only a platform admin can move them to 'approved' or 'rejected'.
create type public.post_status as enum (
  'pending',
  'approved',
  'rejected'
);
