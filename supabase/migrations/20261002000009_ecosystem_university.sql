-- Domain claims require platform review. No client can approve a claim.
create table public.university_domains(id uuid primary key default gen_random_uuid(),university_id uuid not null references public.organizations(id),domain text not null unique check(domain=lower(domain) and domain ~ '^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$'),approved_at timestamptz,auto_enrollment boolean not null default false,created_at timestamptz not null default now());
create table public.university_connection_requests(id uuid primary key default gen_random_uuid(),university_id uuid not null references public.organizations(id),student_id uuid not null references public.profiles(id),status text not null default 'pending' check(status in ('pending','accepted','declined')),created_at timestamptz not null default now(),decided_at timestamptz,unique(university_id,student_id));
create table public.campus_announcements(id uuid primary key default gen_random_uuid(),university_id uuid not null references public.organizations(id),title text not null,body text not null,url text not null default '',important boolean not null default false,created_by uuid not null references public.profiles(id),created_at timestamptz not null default now());
alter table public.university_domains enable row level security;
alter table public.university_connection_requests enable row level security;
alter table public.campus_announcements enable row level security;
grant select on public.university_domains,public.university_connection_requests,public.campus_announcements to authenticated;
create policy domains_read on public.university_domains for select to authenticated using(public.workspace_ready() and (approved_at is not null or public.can_manage_university(university_id)));
create policy connections_read on public.university_connection_requests for select to authenticated using(public.workspace_ready() and (student_id=auth.uid() or public.can_manage_university(university_id)));
create policy campus_read on public.campus_announcements for select to authenticated using(public.workspace_ready() and (public.can_manage_university(university_id) or public.eco_eligible(university_id,'{}')));
create function public.eco_domain_save(p_university uuid,p_domain text,p_auto boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.workspace_ready('university') or not public.can_manage_university(p_university) then raise exception 'Verified university manager required' using errcode='42501'; end if;
 if exists(select 1 from public.university_domains where domain=lower(trim(p_domain)) and university_id<>p_university) then raise exception 'Domain already claimed'; end if;
 insert into public.university_domains(university_id,domain,auto_enrollment) values(p_university,lower(trim(p_domain)),p_auto)
 on conflict(domain) do update set auto_enrollment=excluded.auto_enrollment where university_domains.university_id=p_university;
end; $$;
create function public.eco_university_connect(p_university uuid) returns text language plpgsql security definer set search_path='' as $$
declare v_auto boolean; v_owner uuid; v_id uuid; begin
 if not public.workspace_ready('student') then raise exception 'Verified Student required' using errcode='42501'; end if;
 select d.auto_enrollment,o.created_by into v_auto,v_owner from public.university_domains d join public.organizations o on o.id=d.university_id join public.profiles p on p.id=o.created_by join auth.users u on u.id=auth.uid()
 where d.university_id=p_university and d.approved_at is not null and o.verified and o.official_account and o.type='university' and p.account_status='active' and p.primary_role='university' and u.email_confirmed_at is not null and split_part(lower(u.email),'@',2)=d.domain limit 1;
 if not found then raise exception 'Verified university email required' using errcode='42501'; end if;
 if exists(select 1 from public.university_student_memberships where university_id=p_university and student_user_id=auth.uid() and status='active') then raise exception 'Already connected'; end if;
 insert into public.university_connection_requests(university_id,student_id,status,decided_at) values(p_university,auth.uid(),case when v_auto then 'accepted' else 'pending' end,case when v_auto then now() end) returning id into v_id;
 if v_auto then
  insert into public.university_student_memberships(university_id,student_user_id,enrolled_by) values(p_university,auth.uid(),v_owner) on conflict(university_id,student_user_id) do update set status='active',joined_at=now(),verified_at=now();
 end if;
 perform public.workspace_notify(v_owner,'university_connection',case when v_auto then 'A Student confirmed their campus connection' else 'New campus connection request' end,'university',v_id,'/dashboard/students',v_id||':request');
 return case when v_auto then 'connected' else 'requested' end;
end; $$;
create function public.eco_university_decide(p_id uuid,p_accept boolean) returns void language plpgsql security definer set search_path='' as $$
declare r public.university_connection_requests; begin
 select * into r from public.university_connection_requests where id=p_id for update;
 if r.id is null or not public.workspace_ready('university') or not public.can_manage_university(r.university_id) or r.status<>'pending' then raise exception 'Pending university request required' using errcode='42501'; end if;
 if p_accept then
  if not exists(select 1 from auth.users u join public.profiles p on p.id=u.id join public.university_domains d on d.domain=split_part(lower(u.email),'@',2) where u.id=r.student_id and u.email_confirmed_at is not null and p.account_status='active' and p.primary_role='student' and d.university_id=r.university_id and d.approved_at is not null) then raise exception 'Verified domain no longer matches'; end if;
  insert into public.university_student_memberships(university_id,student_user_id,enrolled_by) values(r.university_id,r.student_id,auth.uid()) on conflict(university_id,student_user_id) do update set status='active',joined_at=now(),verified_at=now();
 end if;
 update public.university_connection_requests set status=case when p_accept then 'accepted' else 'declined' end,decided_at=now() where id=p_id;
 perform public.workspace_notify(r.student_id,'university_connection','Campus connection '||case when p_accept then 'accepted' else 'declined' end,'university',p_id,'/dashboard/my-university',p_id||':decision');
end; $$;
-- Preserve the existing token acceptance flow, but enrollment always creates an invitation.
create or replace function public.enroll_university_student(p_university_id uuid,p_email text,p_token_hash text,p_student_name text default null,p_student_identifier text default null,p_program text default null,p_department text default null) returns text language plpgsql security definer set search_path='' as $$
declare v_student uuid; v_id uuid; begin
 if not public.workspace_ready('university') or not public.can_manage_university(p_university_id) then raise exception 'University access denied' using errcode='42501'; end if;
 select p.id into v_student from public.profiles p join auth.users u on u.id=p.id where lower(u.email)=lower(trim(p_email)) and p.primary_role='student' and p.account_status='active' and u.email_confirmed_at is not null;
 if exists(select 1 from public.university_student_memberships where university_id=p_university_id and student_user_id=v_student and status='active') then return 'already_enrolled'; end if;
 insert into public.university_student_invitations(university_id,email,token_hash,student_name,student_identifier,program,department,expires_at,created_by)
 values(p_university_id,lower(trim(p_email)),p_token_hash,p_student_name,p_student_identifier,p_program,p_department,now()+interval '7 days',auth.uid())
 on conflict(university_id,email) where status='pending' do update set token_hash=excluded.token_hash,expires_at=excluded.expires_at,program=excluded.program,department=excluded.department returning id into v_id;
 if v_student is not null then perform public.workspace_notify(v_student,'university_invitation','A university invited you to connect','university',v_id,'/dashboard/my-university',v_id||':invited'); end if;
 return 'invited';
end; $$;
-- Recipient sees safe invitation fields via RPC, never the reusable token hash.
create function public.eco_campus_invitations() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'university_id',i.university_id,'name',o.name,'program',i.program,'department',i.department,'expires_at',i.expires_at)),'[]') from public.university_student_invitations i join public.organizations o on o.id=i.university_id join auth.users u on lower(u.email)=i.email where u.id=auth.uid() and public.workspace_ready('student') and i.status='pending' and i.expires_at>now();
$$;
create function public.eco_campus_invitation_decide(p_id uuid,p_accept boolean) returns void language plpgsql security definer set search_path='' as $$
declare r public.university_student_invitations; begin
 select i.* into r from public.university_student_invitations i join auth.users u on lower(u.email)=i.email where i.id=p_id and u.id=auth.uid() for update of i;
 if r.id is null or not public.workspace_ready('student') or r.status<>'pending' or r.expires_at<=now() then raise exception 'Valid invitation required' using errcode='42501'; end if;
 if p_accept then perform public.accept_university_invitation(r.token_hash); else update public.university_student_invitations set status='cancelled' where id=p_id; end if;
 perform public.workspace_notify(r.created_by,'university_invitation','Campus invitation '||case when p_accept then 'accepted' else 'declined' end,'university',p_id,'/dashboard/students',p_id||':decision');
end; $$;
create function public.eco_campus_progress(p_university uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.workspace_ready('university') or not public.can_manage_university(p_university) then raise exception 'University access denied' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('student_id',p.id,'full_name',p.full_name,'program',m.program,'year',s.workspace_profile->'current_year','study_status',s.workspace_profile->'study_status','status',m.status,
 'completion',round(100.0*((case when coalesce(p.full_name,'')<>'' and coalesce(p.headline,'')<>'' then 1 else 0 end)+(case when coalesce(s.degree_level,'')<>'' and coalesce(s.field_of_study,'')<>'' then 1 else 0 end)+(case when exists(select 1 from auth.users u where u.id=p.id and u.email_confirmed_at is not null) then 1 else 0 end)+(case when coalesce(cardinality(s.skills),0)>0 then 1 else 0 end)+(case when s.workspace_profile->'preferred_roles'->0 is not null and coalesce(s.workspace_profile->>'availability','')<>'' then 1 else 0 end)+(case when coalesce(s.workspace_profile->'no_experience'='true'::jsonb,false) or s.workspace_profile->'experience_entries'->0 is not null or coalesce(s.workspace_profile->>'experience','')<>'' then 1 else 0 end)+(case when coalesce(s.workspace_profile->'no_certifications'='true'::jsonb,false) or s.workspace_profile->'certification_entries'->0 is not null or coalesce(s.workspace_profile->>'certifications','')<>'' then 1 else 0 end))/7),
 'projects',(select count(*) from public.project_members pm join public.projects pr on pr.id=pm.project_id where pm.user_id=p.id and pm.status='active' and pr.university_id=p_university),
 'events',(select count(*) from public.event_registrations er join public.events e on e.id=er.event_id where er.user_id=p.id and e.university_id=p_university),
 'applications',(select count(*) from public.applications a join public.opportunities o on o.id=a.opportunity_id where a.student_id=p.id and o.university_id=p_university and o.organization_id=p_university))), '[]') from public.university_student_memberships m join public.profiles p on p.id=m.student_user_id left join public.student_details s on s.profile_id=p.id where m.university_id=p_university and m.status='active');
end; $$;
create function public.eco_announcement(p_university uuid,p_title text,p_body text,p_url text,p_important boolean) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_user uuid; begin
 if not public.workspace_ready('university') or not public.can_manage_university(p_university) then raise exception 'University access denied' using errcode='42501'; end if;
 if length(trim(p_title)) not between 2 and 160 or length(trim(p_body)) not between 2 and 5000 or (p_url<>'' and p_url !~ '^https://') then raise exception 'Invalid announcement'; end if;
 insert into public.campus_announcements(university_id,title,body,url,important,created_by) values(p_university,p_title,p_body,p_url,p_important,auth.uid()) returning id into v_id;
 if p_important then for v_user in select student_user_id from public.university_student_memberships where university_id=p_university and status='active' loop perform public.workspace_notify(v_user,'campus_announcement',p_title,'university',v_id,'/dashboard/my-university#'||v_id,v_id||':published'); end loop; end if;
 return v_id;
end; $$;
revoke all on function public.eco_domain_save(uuid,text,boolean),public.eco_university_connect(uuid),public.eco_university_decide(uuid,boolean),public.eco_campus_invitations(),public.eco_campus_invitation_decide(uuid,boolean),public.eco_campus_progress(uuid),public.eco_announcement(uuid,text,text,text,boolean) from public;
grant execute on function public.eco_domain_save(uuid,text,boolean),public.eco_university_connect(uuid),public.eco_university_decide(uuid,boolean),public.eco_campus_invitations(),public.eco_campus_invitation_decide(uuid,boolean),public.eco_campus_progress(uuid),public.eco_announcement(uuid,text,text,text,boolean) to authenticated;
-- The new API calls this versioned entry point. On an older database it fails
-- closed (missing function), rather than invoking historical direct enrollment.
create function public.eco_campus_invite(p_university_id uuid,p_email text,p_token_hash text,p_student_name text default null,p_student_identifier text default null,p_program text default null,p_department text default null) returns text language sql security definer set search_path='' as $$
 select public.enroll_university_student(p_university_id,p_email,p_token_hash,p_student_name,p_student_identifier,p_program,p_department);
$$;
revoke all on function public.eco_campus_invite(uuid,text,text,text,text,text,text) from public;
grant execute on function public.eco_campus_invite(uuid,text,text,text,text,text,text) to authenticated;

