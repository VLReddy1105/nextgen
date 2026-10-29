-- Run manually only after an approved deployment. Metadata only; no user rows.
begin transaction read only;
select jsonb_build_object(
  'affiliation_table_present', to_regclass('public.mentor_affiliations') is not null,
  'affiliation_rls', (select relrowsecurity from pg_class where oid=to_regclass('public.mentor_affiliations')),
  'columns', (select jsonb_agg(jsonb_build_object('table',table_name,'column',column_name,'type',data_type,'nullable',is_nullable,'default',column_default)) from information_schema.columns where table_schema='public' and ((table_name='opportunities' and column_name='audience') or (table_name='mentor_sessions' and column_name='organization_id'))),
  'indexes', (select jsonb_agg(indexdef) from pg_indexes where schemaname='public' and tablename='mentor_affiliations'),
  'policies', (select jsonb_agg(to_jsonb(p)) from pg_policies p where schemaname='public' and tablename='mentor_affiliations'),
  'affiliation_privileges', (select jsonb_agg(to_jsonb(x)) from (select grantee,privilege_type from information_schema.role_table_grants where table_schema='public' and table_name='mentor_affiliations' and grantee in ('anon','authenticated')) x),
  'functions', (select jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),'security_definer',p.prosecdef,'configuration',p.proconfig,'anon_execute',has_function_privilege('anon',p.oid,'EXECUTE'),'authenticated_execute',has_function_privilege('authenticated',p.oid,'EXECUTE'))) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('eco_mentor_affiliation_request','eco_mentor_affiliation_decide','eco_mentor_hub','eco_mentor_badges','eco_mentor_session_scoped','mentor_org_manager','mentor_org_valid','mentor_active','mentor_org_student','mentor_audience_guard','eco_scope_allowed','eco_application_activity','workspace_apply','eco_opportunity_save','workspace_application_status','workspace_notify','eco_activity','eco_space_owner')),
  'api_truncate_grants', (select count(*) from pg_tables where schemaname='public' and (has_table_privilege('anon',quote_ident(schemaname)||'.'||quote_ident(tablename),'TRUNCATE') or has_table_privilege('authenticated',quote_ident(schemaname)||'.'||quote_ident(tablename),'TRUNCATE'))),
  'notification_update_columns', (select jsonb_agg(column_name order by column_name) from information_schema.columns where table_schema='public' and table_name='notifications' and has_column_privilege('authenticated','public.notifications',column_name,'UPDATE'))
) as verification_result;
rollback;
