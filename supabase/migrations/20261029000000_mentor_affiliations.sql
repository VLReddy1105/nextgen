-- Local proposal only. No hosted deployment authorized.
-- Existing opportunities remain Student-targeted; no affiliation backfill.
alter table public.opportunities add column audience text not null default 'student'
  check (audience in ('student','mentor'));
comment on column public.applications.student_id is 'Applicant profile ID; historical name retained. Role must match opportunity audience.';
alter table public.mentor_sessions add column organization_id uuid references public.organizations(id);

create table public.mentor_affiliations (
 id uuid primary key default gen_random_uuid(),
 mentor_user_id uuid not null references public.profiles(id),
 organization_id uuid not null references public.organizations(id),
 requested_by uuid not null references public.profiles(id),
 status text not null default 'pending' check(status in ('pending','accepted','rejected','cancelled','ended')),
 decided_by uuid references public.profiles(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 decided_at timestamptz, accepted_at timestamptz, ended_at timestamptz,
 check(status <> 'accepted' or (accepted_at is not null and decided_by is not null))
);
create unique index mentor_one_affiliation on public.mentor_affiliations(mentor_user_id) where status='accepted';
create unique index mentor_pending_pair on public.mentor_affiliations(mentor_user_id,organization_id) where status in ('pending','accepted');
create index mentor_organization_status on public.mentor_affiliations(organization_id,status);
create trigger mentor_affiliation_updated before update on public.mentor_affiliations for each row execute function public.set_updated_at();
alter table public.mentor_affiliations enable row level security;
revoke all on table public.mentor_affiliations from public,anon,authenticated;
grant select on table public.mentor_affiliations to authenticated;

-- Internal helpers: invoked only through owner-executed checked RPCs.
create function public.mentor_org_manager(p_org uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select public.workspace_ready() and exists(select 1 from public.organizations o join public.profiles p on p.id=o.created_by
 where o.id=p_org and o.created_by=auth.uid() and o.official_account
 and ((o.type='company' and p.primary_role='company') or (o.type='university' and o.verified and p.primary_role='university')));
$$;
create function public.mentor_org_valid(p_org uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.organizations o join public.profiles p on p.id=o.created_by join auth.users u on u.id=p.id
 where o.id=p_org and o.official_account and p.account_status='active' and p.onboarding_completed and u.email_confirmed_at is not null
 and ((o.type='company' and p.primary_role='company') or (o.type='university' and o.verified and p.primary_role='university')));
$$;
create function public.mentor_active(p_user uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p join auth.users u on u.id=p.id where p.id=p_user and p.primary_role='mentor'
 and p.account_status='active' and p.onboarding_completed and u.email_confirmed_at is not null);
$$;
create policy mentor_affiliation_read on public.mentor_affiliations for select to authenticated using(
 public.workspace_ready() and (mentor_user_id=auth.uid() or exists(select 1 from public.organizations o
 where o.id=organization_id and o.created_by=auth.uid() and o.official_account
 and ((o.type='company' and public.workspace_ready('company')) or (o.type='university' and o.verified and public.workspace_ready('university'))))));

create function public.eco_mentor_affiliation_request(p_org uuid,p_mentor uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_mentor uuid:=coalesce(p_mentor,auth.uid()); v_owner uuid; v_id uuid; begin
 if not public.workspace_ready() or not public.mentor_org_valid(p_org) or not public.mentor_active(v_mentor) then raise exception 'Eligible Mentor and organization required' using errcode='42501';end if;
 select created_by into v_owner from public.organizations where id=p_org;
 if not ((v_mentor=auth.uid() and public.workspace_ready('mentor')) or public.mentor_org_manager(p_org)) or v_mentor=v_owner then raise exception 'Request not permitted' using errcode='42501';end if;
 perform 1 from public.profiles where id=v_mentor for update;
 if exists(select 1 from public.mentor_affiliations where mentor_user_id=v_mentor and status='accepted') then raise exception 'End the current affiliation first';end if;
 insert into public.mentor_affiliations(mentor_user_id,organization_id,requested_by) values(v_mentor,p_org,auth.uid()) returning id into v_id;
 perform public.workspace_notify(case when v_mentor=auth.uid() then v_owner else v_mentor end,'mentor_affiliation','New Mentor affiliation request or invitation','mentors',v_id,'/dashboard/mentors',v_id||':pending');
 return v_id;
end;$$;

create function public.eco_mentor_affiliation_decide(p_id uuid,p_action text) returns void
language plpgsql security definer set search_path='' as $$
declare r public.mentor_affiliations; v_mentor uuid; v_owner uuid; v_status text; begin
 if not public.workspace_ready() then raise exception 'Active account required' using errcode='42501';end if;
 select mentor_user_id into v_mentor from public.mentor_affiliations where id=p_id;
 perform 1 from public.profiles where id=v_mentor for update;
 select * into r from public.mentor_affiliations where id=p_id for update;
 select created_by into v_owner from public.organizations where id=r.organization_id;
 if r.id is null then raise exception 'Affiliation unavailable' using errcode='42501';end if;
 if p_action in ('accept','reject') then
  if r.status<>'pending' or not public.mentor_active(r.mentor_user_id) or not public.mentor_org_valid(r.organization_id) then raise exception 'Pending eligible affiliation required';end if;
  if r.requested_by=r.mentor_user_id then
   if not public.mentor_org_manager(r.organization_id) then raise exception 'Organization approval required' using errcode='42501';end if;
  else
   if auth.uid()<>r.mentor_user_id or r.requested_by<>v_owner then raise exception 'Invited Mentor consent required' using errcode='42501';end if;
  end if;
  v_status:=case when p_action='accept' then 'accepted' else 'rejected' end;
  update public.mentor_affiliations set status=v_status,decided_by=auth.uid(),decided_at=now(),accepted_at=case when p_action='accept' then now() end where id=p_id;
 elsif p_action='cancel' then
  if r.status<>'pending' or r.requested_by<>auth.uid() then raise exception 'Only initiator may cancel a pending request' using errcode='42501';end if;
  v_status:='cancelled'; update public.mentor_affiliations set status=v_status,decided_by=auth.uid(),decided_at=now() where id=p_id;
 elsif p_action='end' then
  if r.status<>'accepted' or not (r.mentor_user_id=auth.uid() or public.mentor_org_manager(r.organization_id)) then raise exception 'Participant required' using errcode='42501';end if;
  v_status:='ended'; update public.mentor_affiliations set status=v_status,ended_at=now(),decided_by=auth.uid(),decided_at=now() where id=p_id;
 else raise exception 'Unsupported affiliation action';end if;
 perform public.workspace_notify(case when auth.uid()=r.mentor_user_id then v_owner else r.mentor_user_id end,'mentor_affiliation','Mentor affiliation '||v_status,'mentors',p_id,'/dashboard/mentors',p_id||':'||v_status);
end;$$;

-- Safe badge projection, never pending/private relationship history.
create function public.eco_mentor_badges(p_ids uuid[]) returns jsonb
language plpgsql stable security definer set search_path='' as $$ begin
 if not public.workspace_ready() or coalesce(cardinality(p_ids),0)>500 then raise exception 'Active bounded directory required' using errcode='42501';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('mentor_user_id',a.mentor_user_id,'organization_id',o.id,'organization_name',o.name,'context',o.type::text)),'[]')
 from public.mentor_affiliations a join public.organizations o on o.id=a.organization_id
 where a.status='accepted' and a.mentor_user_id=any(p_ids) and public.mentor_active(a.mentor_user_id) and public.mentor_org_valid(o.id));
end;$$;

-- Scoped Student connection helper; no private profile data returned.
create function public.mentor_org_student(p_org uuid,p_mentor uuid,p_student uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p join auth.users u on u.id=p.id where p.id=p_student and p.primary_role='student' and p.account_status='active' and p.onboarding_completed and u.email_confirmed_at is not null)
 and exists(select 1 from public.mentor_connections c where c.mentor_id=p_mentor and c.student_id=p_student and c.status='accepted')
 and (exists(select 1 from public.university_student_memberships m where m.university_id=p_org and m.student_user_id=p_student and m.status='active')
 or exists(select 1 from public.projects p join public.project_members m on m.project_id=p.id join public.project_members s on s.project_id=p.id
 where (p.company_id=p_org or p.university_id=p_org) and m.user_id=p_mentor and s.user_id=p_student and m.status='active' and s.status='active' and public.eco_scope_allowed('projects',p.id,p_mentor) and public.eco_scope_allowed('projects',p.id,p_student)));
$$;
create function public.eco_mentor_session_scoped(p_org uuid,p_student uuid,p_title text,p_starts timestamptz,p_url text default '') returns uuid
language plpgsql security definer set search_path='' as $$ declare v_id uuid; begin
 perform 1 from public.profiles where id=auth.uid() for update;
 if not public.workspace_ready('mentor') or not public.mentor_org_valid(p_org) or not exists(select 1 from public.mentor_affiliations where mentor_user_id=auth.uid() and organization_id=p_org and status='accepted')
 or not public.mentor_org_student(p_org,auth.uid(),p_student) then raise exception 'Accepted scoped affiliation and mentee required' using errcode='42501';end if;
 v_id:=public.eco_mentor_session(p_student,p_title,p_starts,p_url);
 update public.mentor_sessions set organization_id=p_org where id=v_id;
 return v_id;
end;$$;

-- Affiliation only satisfies the campus scope prerequisite. Actual project or
-- community membership/invitation is still required by existing checks.
create or replace function public.eco_scope_allowed(p_kind text,p_id uuid,p_user uuid) returns boolean language plpgsql stable security definer set search_path='' as $$
declare v_uni uuid; v_owner uuid; begin
 if p_kind='projects' then select university_id,created_by_user_id into v_uni,v_owner from public.projects where id=p_id;
 elsif p_kind='communities' then select case when visibility='university_scoped' then organization_id end,created_by into v_uni,v_owner from public.communities where id=p_id;else return false;end if;
 return v_owner is not null and (v_owner=p_user or v_uni is null or exists(select 1 from public.university_student_memberships where university_id=v_uni and student_user_id=p_user and status='active')
 or (public.mentor_active(p_user) and public.mentor_org_valid(v_uni) and exists(select 1 from public.mentor_affiliations where organization_id=v_uni and mentor_user_id=p_user and status='accepted')));
end; $$;

-- Prevent audience changes and all legacy/direct application paths from crossing roles.
create function public.mentor_audience_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare v_audience text; begin
 if tg_table_name='opportunities' then
  if tg_op='UPDATE' and new.audience<>old.audience then raise exception 'Opportunity audience cannot change';end if;
  if new.audience='mentor' and not public.mentor_org_valid(new.organization_id) then raise exception 'Eligible Mentor organization required';end if;
 else
  select audience into v_audience from public.opportunities where id=new.opportunity_id;
  if tg_op='UPDATE' and (new.student_id<>old.student_id or new.opportunity_id<>old.opportunity_id) then raise exception 'Application identity cannot change';end if;
  if tg_op='INSERT' and not exists(select 1 from public.profiles where id=new.student_id and primary_role::text=v_audience) then raise exception 'Applicant role does not match audience' using errcode='42501';end if;
 end if;return new;
end;$$;
create trigger opportunity_audience_guard before insert or update on public.opportunities for each row execute function public.mentor_audience_guard();
create trigger application_audience_guard before insert or update on public.applications for each row execute function public.mentor_audience_guard();

drop policy opportunities_read on public.opportunities;
create policy opportunities_read on public.opportunities for select to authenticated using(public.workspace_ready() and (created_by=auth.uid() or (status='published' and ((audience='student' and public.eco_eligible(university_id,eligibility)) or (audience='mentor' and public.workspace_ready('mentor'))))));
create policy mentor_applied_opportunity_read on public.opportunities for select to authenticated using(public.workspace_ready('mentor') and audience='mentor' and public.workspace_applied(id));

create or replace function public.workspace_apply(p_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare v_result uuid; o public.opportunities; begin
 if not public.workspace_ready() then raise exception 'Active account required' using errcode='42501';end if;
 select * into o from public.opportunities where id=p_id for share;
 if o.id is null or o.status<>'published' or o.deadline<=now() then raise exception 'Opportunity unavailable';end if;
 if o.audience='student' then
  if not public.workspace_ready('student') or not public.eco_eligible(o.university_id,o.eligibility) then raise exception 'Eligible Student required' using errcode='42501';end if;
 else
  if not public.workspace_ready('mentor') or not public.mentor_org_valid(o.organization_id) then raise exception 'Eligible Mentor required' using errcode='42501';end if;
  perform 1 from public.profiles where id=auth.uid() for update;
  if exists(select 1 from public.mentor_affiliations where mentor_user_id=auth.uid() and status='accepted') then raise exception 'Independent Mentor required';end if;
 end if;
 insert into public.applications(student_id,opportunity_id) values(auth.uid(),p_id) returning id into v_result;
 insert into public.application_history(application_id,status,actor_id) values(v_result,'applied',auth.uid());return v_result;
end;$$;

create or replace function public.eco_opportunity_save(p_data jsonb,p_id uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid:=p_id; v_org uuid:=(p_data->>'organization_id')::uuid; v_uni uuid:=(p_data->>'university_id')::uuid; v_old public.opportunities; v_status text:=coalesce(p_data->>'status','draft'); v_user uuid; v_tags text[]; v_audience text:=coalesce(p_data->>'audience','student'); begin
 if v_audience not in ('student','mentor') then raise exception 'Invalid audience';end if;
 if v_audience='mentor' and not public.mentor_org_manager(v_org) then raise exception 'Mentor recruitment organization required' using errcode='42501';end if;
 if not public.workspace_ready() or not exists(select 1 from public.profiles where id=auth.uid() and primary_role in ('company','university','founder')) or not exists(select 1 from public.organizations where id=v_org and created_by=auth.uid()) then raise exception 'Organization ownership required' using errcode='42501'; end if;
 if v_uni is not null and (v_uni<>v_org or not public.can_manage_university(v_uni)) then raise exception 'Verified university required' using errcode='42501'; end if;
 if exists(select 1 from public.organizations where id=v_org and type='university') and (v_uni is distinct from v_org or not public.can_manage_university(v_org)) then raise exception 'Verified campus context required' using errcode='42501'; end if;
 select array_agg(distinct lower(trim(value))) into v_tags from jsonb_array_elements_text(p_data->'tags');
 if v_status='published' and ((p_data->>'deadline')::timestamptz<=now() or coalesce(cardinality(v_tags),0)=0 or coalesce(length(trim(p_data->>'description')),0)<10 or (p_data->>'work_mode'<>'remote' and coalesce(length(trim(p_data->>'location')),0)=0)) then raise exception 'Complete required publishing fields'; end if;
 if p_id is not null then
  select * into v_old from public.opportunities where id=p_id for update;
  if v_old.audience<>v_audience or v_old.created_by is distinct from auth.uid() or v_old.organization_id<>v_org or v_old.university_id is distinct from v_uni then raise exception 'Posting ownership required' using errcode='42501'; end if;
 end if;
 if v_id is null then
  insert into public.opportunities(title,description,organization_id,created_by,type,location,work_mode,experience,duration,tags,interests,roles,deadline,university_id,status,nice_to_have,openings,eligibility,audience)
  values(p_data->>'title',p_data->>'description',v_org,auth.uid(),p_data->>'type',coalesce(p_data->>'location',''),p_data->>'work_mode',p_data->>'experience',p_data->>'duration',coalesce(v_tags,'{}'),array(select jsonb_array_elements_text(p_data->'interests')),array(select jsonb_array_elements_text(p_data->'roles')),(p_data->>'deadline')::timestamptz,v_uni,v_status,array(select jsonb_array_elements_text(p_data->'nice_to_have')),coalesce((p_data->>'openings')::integer,1),coalesce(p_data->'eligibility','{}'),v_audience) returning id into v_id;
 else
  update public.opportunities set title=p_data->>'title',description=p_data->>'description',type=p_data->>'type',location=coalesce(p_data->>'location',''),work_mode=p_data->>'work_mode',experience=p_data->>'experience',duration=p_data->>'duration',tags=coalesce(v_tags,'{}'),interests=array(select jsonb_array_elements_text(p_data->'interests')),roles=array(select jsonb_array_elements_text(p_data->'roles')),deadline=(p_data->>'deadline')::timestamptz,status=v_status,nice_to_have=array(select jsonb_array_elements_text(p_data->'nice_to_have')),openings=coalesce((p_data->>'openings')::integer,1),eligibility=coalesce(p_data->'eligibility','{}') where id=v_id;
 end if;
 if v_audience='student' and v_status='published' and coalesce(v_old.status,'draft')<>'published' then
  for v_user in select s.profile_id from public.student_details s where public.eco_eligible(v_uni,coalesce(p_data->'eligibility','{}'),s.profile_id) and exists(select 1 from unnest(s.skills) x where lower(x)=any(v_tags)) loop
   perform public.workspace_notify(v_user,'opportunity_match','New opportunity: '||(p_data->>'title'),'opportunities',v_id,'/dashboard/opportunities/'||v_id,v_id||':published');
  end loop;
 end if;
 insert into public.ecosystem_activity(actor_id,source_module,source_entity_id,owner_user_id,message) values(auth.uid(),'opportunities',v_id,auth.uid(),'Opportunity '||v_status);
 return v_id;
end; $$;

create or replace function public.workspace_application_status(p_id uuid,p_status text,p_note text default '',p_interview_at timestamptz default null)
returns void language plpgsql security definer set search_path='' as $$
declare a public.applications; owner_id uuid; begin
 if not public.workspace_ready() then raise exception 'Active account required' using errcode='42501'; end if;
 select * into a from public.applications where id=p_id for update;
 select created_by into owner_id from public.opportunities where id=a.opportunity_id;
 if a.id is null then raise exception 'Application unavailable'; end if;
 if p_status='withdrawn' then
  if a.student_id<>auth.uid() or not (public.workspace_ready('student') or public.workspace_ready('mentor')) or a.status in ('selected','rejected','withdrawn') then raise exception 'Withdrawal unavailable' using errcode='42501'; end if;
 else
  if exists(select 1 from public.opportunities o where o.id=a.opportunity_id and o.audience='mentor' and not public.mentor_org_manager(o.organization_id)) then raise exception 'Organization permission required' using errcode='42501';end if;
  if owner_id is distinct from auth.uid() or p_status not in ('reviewed','shortlisted','interview','selected','rejected') or a.status in ('selected','rejected','withdrawn') then raise exception 'Status change unavailable' using errcode='42501'; end if;
 end if;
 if a.status=p_status or length(p_note)>2000 then raise exception 'Invalid status change'; end if;
 update public.applications set status=p_status,next_step=nullif(p_note,''),interview_at=p_interview_at,updated_at=now() where id=p_id;
 insert into public.application_history(application_id,status,note,actor_id) values(p_id,p_status,p_note,auth.uid());
 if a.student_id<>auth.uid() then perform public.workspace_notify(a.student_id,'application_status_changed','Application update: '||p_status,'applications',p_id,case when exists(select 1 from public.opportunities where id=a.opportunity_id and audience='mentor') then '/dashboard/mentor-opportunities' else '/dashboard/applications/'||p_id end,p_id||':'||gen_random_uuid()); end if;
end; $$;


create or replace function public.eco_application_activity() returns trigger language plpgsql security definer set search_path='' as $$
declare v_owner uuid; v_title text; begin
 select created_by,title into v_owner,v_title from public.opportunities where id=new.opportunity_id;
 if tg_op='INSERT' then
  perform public.workspace_notify(v_owner,'application_submitted','New application for '||v_title,'applications',new.id,case when exists(select 1 from public.opportunities where id=new.opportunity_id and audience='mentor') then '/dashboard/mentor-opportunities' else '/dashboard/applications/'||new.id end,new.id||':submitted');
 elsif new.status='withdrawn' and old.status<>'withdrawn' then
  perform public.workspace_notify(v_owner,'application_withdrawn','An application was withdrawn for '||v_title,'applications',new.id,case when exists(select 1 from public.opportunities where id=new.opportunity_id and audience='mentor') then '/dashboard/mentor-opportunities' else '/dashboard/applications/'||new.id end,new.id||':withdrawn');
 end if;
 insert into public.ecosystem_activity(actor_id,source_module,source_entity_id,owner_user_id,message) values(coalesce(auth.uid(),new.student_id),'applications',new.id,v_owner,'Application '||new.status);return new;
end; $$;

create function public.eco_mentor_hub() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_role text; v_result jsonb; begin
 if not public.workspace_ready() then raise exception 'Active account required' using errcode='42501';end if;
 select primary_role::text into v_role from public.profiles where id=auth.uid();
 if v_role not in ('mentor','company','university') then raise exception 'Mentor workspace role required' using errcode='42501';end if;
 select jsonb_build_object(
 'context',coalesce((select o.type::text from public.mentor_affiliations a join public.organizations o on o.id=a.organization_id where a.mentor_user_id=auth.uid() and a.status='accepted' and public.mentor_org_valid(o.id)),'independent'),
 'organizations',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'type',type,'can_manage',public.mentor_org_manager(id))),'[]') from (select * from public.organizations where public.mentor_org_valid(id) order by name,id limit 500) o),
 'mentor_directory',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'full_name',full_name)),'[]') from (select p.id,p.full_name from public.profiles p where v_role in ('company','university') and public.mentor_active(p.id) order by p.full_name,p.id limit 500) m),
 'affiliations',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'mentor_user_id',a.mentor_user_id,'organization_id',o.id,'organization_name',o.name,'context',o.type,'status',a.status,'requested_by',a.requested_by,'full_name',p.full_name,'profile',case when m.user_id is null then null else jsonb_build_object('headline',m.headline,'bio',m.bio,'skills',m.skills,'expertise',m.expertise,'years_experience',m.years_experience,'availability_status',m.availability_status) end,
 'can_decide',a.status='pending' and case when a.requested_by=a.mentor_user_id then public.mentor_org_manager(o.id) else a.mentor_user_id=auth.uid() and a.requested_by=o.created_by end,
 'can_cancel',a.status='pending' and a.requested_by=auth.uid(),
 'can_end',a.status='accepted' and (a.mentor_user_id=auth.uid() or public.mentor_org_manager(o.id)),
 'progress',case when a.status='accepted' then jsonb_build_object(
  'projects',(select coalesce(jsonb_agg(jsonb_build_object('id',pr.id,'title',pr.title)),'[]') from public.projects pr join public.project_members pm on pm.project_id=pr.id where (pr.company_id=o.id or pr.university_id=o.id) and pm.user_id=a.mentor_user_id and pm.status='active'),
  'mentees',(select count(*) from public.mentor_connections c where c.mentor_id=a.mentor_user_id and public.mentor_org_student(o.id,c.mentor_id,c.student_id)),
  'upcoming_sessions',(select count(*) from public.mentor_sessions s where s.mentor_id=a.mentor_user_id and s.organization_id=o.id and s.starts_at>now() and s.status<>'cancelled'),
  'past_sessions',(select count(*) from public.mentor_sessions s where s.mentor_id=a.mentor_user_id and s.organization_id=o.id and s.starts_at<=now() and s.status<>'cancelled')) else null end)),'[]')
 from (select * from public.mentor_affiliations where mentor_user_id=auth.uid() or public.mentor_org_manager(organization_id) order by created_at desc limit 500) a join public.organizations o on o.id=a.organization_id join public.profiles p on p.id=a.mentor_user_id left join public.mentor_profiles m on m.user_id=a.mentor_user_id),
 'opportunities',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from (select op.*,o.name organization from public.opportunities op join public.organizations o on o.id=op.organization_id where op.audience='mentor' and (public.mentor_org_manager(o.id) or (v_role='mentor' and public.mentor_org_valid(o.id) and ((op.status='published' and op.deadline>now()) or exists(select 1 from public.applications ap where ap.opportunity_id=op.id and ap.student_id=auth.uid())))) order by op.created_at desc limit 500) x),
 'applications',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from (select ap.*,op.title,op.organization_id,o.name organization,p.full_name,case when m.user_id is null then null else jsonb_build_object('headline',m.headline,'bio',m.bio,'skills',m.skills,'expertise',m.expertise,'years_experience',m.years_experience,'availability_status',m.availability_status) end mentor_profile,
 (select coalesce(jsonb_agg(jsonb_build_object('status',h.status,'note',h.note,'created_at',h.created_at) order by h.created_at),'[]') from public.application_history h where h.application_id=ap.id) history
 from public.applications ap join public.opportunities op on op.id=ap.opportunity_id join public.organizations o on o.id=op.organization_id join public.profiles p on p.id=ap.student_id left join public.mentor_profiles m on m.user_id=p.id
 where op.audience='mentor' and (ap.student_id=auth.uid() or public.mentor_org_manager(o.id)) order by ap.created_at desc limit 500) x)
 ) into v_result;
 return v_result;
end;$$;

-- Explicit allowlists defeat broad Supabase default ACLs on newly created objects.
revoke all on function public.eco_scope_allowed(text,uuid,uuid),public.mentor_org_manager(uuid),public.mentor_org_valid(uuid),public.mentor_active(uuid),public.mentor_org_student(uuid,uuid,uuid),public.mentor_audience_guard() from public,anon,authenticated;
revoke all on function public.workspace_apply(uuid),public.eco_opportunity_save(jsonb,uuid),public.workspace_application_status(uuid,text,text,timestamptz),public.eco_mentor_affiliation_request(uuid,uuid),public.eco_mentor_affiliation_decide(uuid,text),public.eco_mentor_badges(uuid[]),public.eco_mentor_session_scoped(uuid,uuid,text,timestamptz,text),public.eco_mentor_hub() from public,anon,authenticated;
grant execute on function public.workspace_apply(uuid),public.eco_opportunity_save(jsonb,uuid),public.workspace_application_status(uuid,text,text,timestamptz),public.eco_mentor_affiliation_request(uuid,uuid),public.eco_mentor_affiliation_decide(uuid,text),public.eco_mentor_badges(uuid[]),public.eco_mentor_session_scoped(uuid,uuid,text,timestamptz,text),public.eco_mentor_hub() to authenticated;
-- Trigger entry points are not public RPCs. Owner-executed triggers retain access.
revoke execute on function public.eco_application_activity() from public,anon,authenticated;
notify pgrst, 'reload schema';
