-- Preserve report ownership and existing account admission for all five primary roles.
-- No read policy, grant, trigger or RPC changes.
alter policy reports_insert on public.support_reports
  with check (
    user_id = (select auth.uid())
    and (
      public.workspace_ready('student')
      or public.workspace_ready('mentor')
      or public.workspace_ready('company')
      or public.workspace_ready('university')
      or public.workspace_ready('founder')
    )
  );
