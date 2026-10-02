alter table public.events add column capacity integer check(capacity between 1 and 100000);
alter table public.events add column eligibility jsonb not null default '{}';
alter table public.events drop constraint events_status_check;
alter table public.events add constraint events_status_check check(status in ('draft','published','cancelled'));
alter table public.events drop constraint events_category_check;
alter table public.events add constraint events_category_check check(category in ('webinar','workshop','hackathon','hiring_drive','career_session','networking','startup_event','placement_session'));
drop policy events_read on public.events;
create policy events_read on public.events for select to authenticated using(public.workspace_ready() and (organizer_id=auth.uid() or (status='published' and public.eco_eligible(university_id,eligibility) and (community_id is null or public.workspace_member('communities',community_id)))));
create function public.eco_event_save(p_data jsonb,p_id uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid:=p_id; v_old public.events; v_uni uuid:=(p_data->>'university_id')::uuid; v_com uuid:=(p_data->>'community_id')::uuid; v_user uuid; begin
 if not public.workspace_ready() or not ((v_uni is not null and public.can_manage_university(v_uni)) or (v_com is not null and public.eco_manager('communities',v_com)) or (v_uni is null and v_com is null and exists(select 1 from public.profiles where id=auth.uid() and primary_role in ('company','mentor','founder')))) then raise exception 'Organizer access required' using errcode='42501'; end if;
 if p_data->>'status'='published' and ((p_data->>'deadline')::timestamptz<=now() or length(trim(p_data->>'description'))<10 or length(trim(p_data->>'location'))<2) then raise exception 'Complete required event fields'; end if;
 if p_id is not null then select * into v_old from public.events where id=p_id for update; if v_old.organizer_id is distinct from auth.uid() or v_old.university_id is distinct from v_uni or v_old.community_id is distinct from v_com then raise exception 'Event ownership required' using errcode='42501'; end if; end if;
 if v_id is null then
 insert into public.events(title,description,organizer_id,university_id,community_id,category,mode,location,starts_at,ends_at,deadline,tags,status,capacity,eligibility) values(p_data->>'title',p_data->>'description',auth.uid(),v_uni,v_com,p_data->>'category',p_data->>'mode',p_data->>'location',(p_data->>'starts_at')::timestamptz,(p_data->>'ends_at')::timestamptz,(p_data->>'deadline')::timestamptz,array(select jsonb_array_elements_text(p_data->'tags')),p_data->>'status',(p_data->>'capacity')::integer,coalesce(p_data->'eligibility','{}')) returning id into v_id;
 else
 if (p_data->>'capacity')::integer<(select count(*) from public.event_registrations where event_id=v_id) then raise exception 'Capacity is below confirmed registrations'; end if;
 update public.events set title=p_data->>'title',description=p_data->>'description',category=p_data->>'category',mode=p_data->>'mode',location=p_data->>'location',starts_at=(p_data->>'starts_at')::timestamptz,ends_at=(p_data->>'ends_at')::timestamptz,deadline=(p_data->>'deadline')::timestamptz,tags=array(select jsonb_array_elements_text(p_data->'tags')),status=p_data->>'status',capacity=(p_data->>'capacity')::integer,eligibility=coalesce(p_data->'eligibility','{}') where id=v_id;
 end if;
 if p_data->>'status'='published' and coalesce(v_old.status,'draft')<>'published' then
 for v_user in select id from public.profiles where primary_role='student' and public.eco_eligible(v_uni,coalesce(p_data->'eligibility','{}'),id) and (v_com is null or public.workspace_member('communities',v_com,id)) loop
 perform public.workspace_notify(v_user,'event_published','New event: '||(p_data->>'title'),'events',v_id,'/dashboard/events/'||v_id,v_id||':published'); end loop;
 elsif p_id is not null then
 for v_user in select user_id from public.event_registrations where event_id=v_id loop perform public.workspace_notify(v_user,'event_updated',case when p_data->>'status'='cancelled' then 'Event cancelled: '||(p_data->>'title') else 'Event updated: '||(p_data->>'title') end,'events',v_id,'/dashboard/events/'||v_id,v_id||':updated:'||clock_timestamp()); end loop;
 end if;
 return v_id;
end; $$;
create or replace function public.workspace_register(p_id uuid,p_registered boolean) returns void language plpgsql security definer set search_path='' as $$
declare e public.events; begin
 if not public.workspace_ready('student') then raise exception 'Student required' using errcode='42501'; end if;
 select * into e from public.events where id=p_id for update;
 if not p_registered then delete from public.event_registrations where event_id=p_id and user_id=auth.uid();return;end if;
 if e.id is null or e.status<>'published' or e.deadline<=now() or not public.eco_eligible(e.university_id,e.eligibility) or (e.community_id is not null and not public.workspace_member('communities',e.community_id)) then raise exception 'Event unavailable or ineligible';end if;
 if e.capacity is not null and (select count(*) from public.event_registrations where event_id=p_id)>=e.capacity then raise exception 'Event is full';end if;
 insert into public.event_registrations(event_id,user_id) values(p_id,auth.uid());
 perform public.workspace_notify(e.organizer_id,'event_registration','New registration: '||e.title,'events',p_id,'/dashboard/events/'||p_id,p_id||':registered:'||auth.uid());
 perform public.workspace_notify(auth.uid(),'event_registration','Registration confirmed: '||e.title,'events',p_id,'/dashboard/events/'||p_id,p_id||':confirmation:'||auth.uid());
end; $$;
-- Eliminate the legacy publishing path so campus audience rules have one writer.
create or replace function public.workspace_publish(p_kind text,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
begin
 if p_kind='opportunities' then return public.eco_opportunity_save(p_data,null); elsif p_kind='events' then return public.eco_event_save(p_data,null);end if;
 raise exception 'Unsupported publication';
end; $$;
alter table public.mentor_profiles add column years_experience integer not null default 0 check(years_experience between 0 and 80);
alter table public.mentor_profiles add column skills text[] not null default '{}';
alter table public.mentor_profiles add column industry text not null default '';
alter table public.mentor_profiles add column linkedin_url text not null default '';
alter table public.mentor_profiles add column portfolio_url text not null default '';
alter table public.mentor_profiles add column topics text[] not null default '{}';
alter table public.mentor_sessions add column meeting_url text not null default '';
alter table public.mentor_connections add column decided_at timestamptz;
create function public.eco_mentor_profile(p_data jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.workspace_ready('mentor') then raise exception 'Mentor required' using errcode='42501';end if;
 update public.profiles set full_name=p_data->>'full_name',headline=p_data->>'headline' where id=auth.uid();
 insert into public.mentor_profiles(user_id,headline,bio,current_position,company,expertise,availability_status,years_experience,skills,industry,linkedin_url,portfolio_url,topics)
 values(auth.uid(),p_data->>'headline',p_data->>'bio',p_data->>'current_position',p_data->>'company',array(select jsonb_array_elements_text(p_data->'expertise')),p_data->>'availability_status',(p_data->>'years_experience')::integer,array(select jsonb_array_elements_text(p_data->'skills')),p_data->>'industry',p_data->>'linkedin_url',p_data->>'portfolio_url',array(select jsonb_array_elements_text(p_data->'topics')))
 on conflict(user_id) do update set headline=excluded.headline,bio=excluded.bio,current_position=excluded.current_position,company=excluded.company,expertise=excluded.expertise,availability_status=excluded.availability_status,years_experience=excluded.years_experience,skills=excluded.skills,industry=excluded.industry,linkedin_url=excluded.linkedin_url,portfolio_url=excluded.portfolio_url,topics=excluded.topics;
end; $$;
create function public.eco_mentor_request(p_mentor uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.workspace_ready('student') or not exists(select 1 from public.mentor_profiles m join public.profiles p on p.id=m.user_id join auth.users u on u.id=p.id where m.user_id=p_mentor and p.primary_role='mentor' and p.account_status='active' and p.onboarding_completed and u.email_confirmed_at is not null and m.availability_status='available') then raise exception 'Available mentor required' using errcode='42501';end if;
 insert into public.mentor_connections(student_id,mentor_id) values(auth.uid(),p_mentor);
 perform public.workspace_notify(p_mentor,'mentorship_request','New mentorship request','mentorship',auth.uid(),'/dashboard/connections',p_mentor||':request:'||auth.uid());
end; $$;
create function public.eco_mentor_decide(p_student uuid,p_accept boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.workspace_ready('mentor') then raise exception 'Mentor required' using errcode='42501';end if;
 update public.mentor_connections set status=case when p_accept then 'accepted' else 'declined' end,decided_at=now() where mentor_id=auth.uid() and student_id=p_student and status='requested';
 if not found then raise exception 'Pending request required';end if;
 perform public.workspace_notify(p_student,'mentorship_decision','Mentorship request '||case when p_accept then 'accepted' else 'declined' end,'mentorship',auth.uid(),'/dashboard/mentorship?view=mine',auth.uid()||':decision:'||p_student);
end; $$;
create function public.eco_mentor_session(p_student uuid,p_title text,p_starts timestamptz,p_url text) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;begin
 if not public.workspace_ready('mentor') or not exists(select 1 from public.mentor_connections where student_id=p_student and mentor_id=auth.uid() and status='accepted') then raise exception 'Accepted connection required' using errcode='42501';end if;
 if length(trim(p_title)) not between 2 and 160 or p_starts<=now() or (p_url<>'' and p_url !~ '^https://') then raise exception 'Valid future session required';end if;
 insert into public.mentor_sessions(student_id,mentor_id,title,starts_at,meeting_url) values(p_student,auth.uid(),p_title,p_starts,p_url) returning id into v_id;
 perform public.workspace_notify(p_student,'mentor_session','Mentorship session: '||p_title,'mentorship',v_id,'/dashboard/mentorship?view=sessions',v_id||':confirmed');return v_id;
end; $$;
create function public.eco_connections() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('student_id',c.student_id,'mentor_id',c.mentor_id,'status',c.status,'full_name',p.full_name,'skills',s.skills)),'[]') from public.mentor_connections c join public.profiles p on p.id=case when c.mentor_id=auth.uid() then c.student_id else c.mentor_id end left join public.student_details s on s.profile_id=c.student_id where public.workspace_ready() and (c.student_id=auth.uid() or c.mentor_id=auth.uid());
$$;
revoke all on function public.eco_event_save(jsonb,uuid),public.eco_mentor_profile(jsonb),public.eco_mentor_request(uuid),public.eco_mentor_decide(uuid,boolean),public.eco_mentor_session(uuid,text,timestamptz,text),public.eco_connections() from public;
grant execute on function public.eco_event_save(jsonb,uuid),public.eco_mentor_profile(jsonb),public.eco_mentor_request(uuid),public.eco_mentor_decide(uuid,boolean),public.eco_mentor_session(uuid,text,timestamptz,text),public.eco_connections() to authenticated;
