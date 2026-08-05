-- Row Level Security policies for all v1 tables.
--
-- RLS was switched on in the create-table migrations, so every table has been
-- deny-all up to this point. This migration opens the specific holes.
--
-- Conventions:
--   * auth.uid() is wrapped in a scalar subselect -- (select auth.uid()) -- so
--     Postgres evaluates it once per query rather than once per row.
--   * Multiple permissive policies on the same command are OR'd together, so
--     each policy below expresses one independent reason to allow access.
--   * No policy is written for anon anywhere except the approved-posts read.


-- ---------------------------------------------------------------------------
-- profiles: any signed-in user may read; only the owner may write.
-- ---------------------------------------------------------------------------

create policy profiles_select_authenticated
  on public.profiles for select
  to authenticated
  using (true);

create policy profiles_insert_own
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Deliberately no DELETE policy: profiles are removed by the cascade from
-- auth.users, not by the client.


-- ---------------------------------------------------------------------------
-- organizations: any signed-in user may read; the creator (or an admin) may
-- edit and delete.
-- ---------------------------------------------------------------------------

create policy organizations_select_authenticated
  on public.organizations for select
  to authenticated
  using (true);

create policy organizations_insert_own
  on public.organizations for insert
  to authenticated
  with check (
    (select auth.uid()) = created_by
    and (verified = false or public.is_platform_admin())
  );

create policy organizations_update_own
  on public.organizations for update
  to authenticated
  using ((select auth.uid()) = created_by)
  with check ((select auth.uid()) = created_by);

create policy organizations_update_admin
  on public.organizations for update
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy organizations_delete_own
  on public.organizations for delete
  to authenticated
  using ((select auth.uid()) = created_by);

create policy organizations_delete_admin
  on public.organizations for delete
  to authenticated
  using (public.is_platform_admin());


-- ---------------------------------------------------------------------------
-- student_details: same shape as profiles -- readable by signed-in users,
-- writable only by the profile owner.
-- ---------------------------------------------------------------------------

create policy student_details_select_authenticated
  on public.student_details for select
  to authenticated
  using (true);

create policy student_details_insert_own
  on public.student_details for insert
  to authenticated
  with check ((select auth.uid()) = profile_id);

create policy student_details_update_own
  on public.student_details for update
  to authenticated
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);

create policy student_details_delete_own
  on public.student_details for delete
  to authenticated
  using ((select auth.uid()) = profile_id);


-- ---------------------------------------------------------------------------
-- posts: approved posts are public; pending and rejected are visible only to
-- their author and to platform admins.
-- ---------------------------------------------------------------------------

-- Split into three read policies rather than one OR'd expression because
-- is_platform_admin() is not executable by anon; anon must never reach it.

create policy posts_select_approved
  on public.posts for select
  to anon, authenticated
  using (status = 'approved');

create policy posts_select_own
  on public.posts for select
  to authenticated
  using ((select auth.uid()) = author_id);

create policy posts_select_admin
  on public.posts for select
  to authenticated
  using (public.is_platform_admin());

create policy posts_insert_own
  on public.posts for insert
  to authenticated
  with check (
    (select auth.uid()) = author_id
    and (status = 'pending' or public.is_platform_admin())
  );

create policy posts_update_own
  on public.posts for update
  to authenticated
  using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);

create policy posts_update_admin
  on public.posts for update
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy posts_delete_own
  on public.posts for delete
  to authenticated
  using ((select auth.uid()) = author_id);

create policy posts_delete_admin
  on public.posts for delete
  to authenticated
  using (public.is_platform_admin());
