-- Run after the Supabase migrations against an isolated local PostgreSQL DB:
-- psql -v ON_ERROR_STOP=1 -f tests/profile-access.sql
-- Test identities and spaces are rolled back after the assertions.
begin;
grant usage on schema public, auth to authenticated;

insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
  ('f0000000-0000-0000-0000-000000000001','profile-captain@example.test',now(),'{"role":"student","full_name":"Captain Name"}'),
  ('f0000000-0000-0000-0000-000000000002','profile-member@example.test',now(),'{"role":"student","full_name":"Member Name"}'),
  ('f0000000-0000-0000-0000-000000000003','profile-stranger@example.test',now(),'{"role":"student","full_name":"Stranger Name"}');

set role authenticated;
set request.jwt.claim.sub = 'f0000000-0000-0000-0000-000000000001';
do $$ begin
  if (select count(*) from public.profiles) <> 1 then
    raise exception 'Profile SELECT exposed another signed-in account';
  end if;
end $$;
select public.finish_onboarding('student','Captain Name',null,null,null,null,null);
set app.genznect_finish_onboarding = '';
set app.genznect_onboarding_org = '';
do $$
declare community_id uuid;
  project_id uuid;
begin
  community_id := public.create_community('Profile Read Test','profile-read-test-community');
  project_id := public.create_project('Profile Read Test','profile-read-test-project');
  perform public.assign_community_member_by_email(community_id,'profile-member@example.test','member');
  perform public.assign_project_member_by_email(project_id,'profile-member@example.test','member');
  if (select count(*) from public.list_space_member_names('communities',community_id)) <> 2
     or (select count(*) from public.list_space_member_names('communities',community_id) where full_name = 'Member Name') <> 1
     or (select count(*) from public.list_space_member_names('projects',project_id)) <> 2 then
    raise exception 'Authorized manager did not receive member names';
  end if;
  if (select count(*) from public.profiles) <> 1 then
    raise exception 'Manager gained unrestricted profile SELECT';
  end if;
end $$;

set request.jwt.claim.sub = 'f0000000-0000-0000-0000-000000000002';
do $$
declare community_id uuid;
  project_id uuid;
  denied boolean;
begin
  if (select count(*) from public.profiles) <> 1 or
     (select count(*) from public.profiles where id = auth.uid()) <> 1 then
    raise exception 'Member cannot read exactly their own profile';
  end if;
  select id into community_id from public.communities where slug='profile-read-test-community';
  select id into project_id from public.projects where slug='profile-read-test-project';
  denied := false;
  begin perform public.list_space_member_names('communities',community_id);
  exception when others then denied := true; end;
  if not denied then raise exception 'Ordinary member read community names'; end if;
  denied := false;
  begin perform public.list_space_member_names('projects',project_id);
  exception when others then denied := true; end;
  if not denied then raise exception 'Ordinary member read project names'; end if;
end $$;

rollback;
