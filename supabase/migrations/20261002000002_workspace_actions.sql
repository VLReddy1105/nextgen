-- Atomic mutations and notifications. Identity always comes from auth.uid().
create function public.workspace_apply(p_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; begin
 if not public.workspace_ready('student') then raise exception 'Student required' using errcode='42501'; end if;
 perform 1 from public.opportunities where id=p_id and status='published' and deadline>now() and public.workspace_audience(university_id,null) for share;
 if not found then raise exception 'Opportunity unavailable'; end if;
 insert into public.applications(student_id,opportunity_id) values(auth.uid(),p_id) returning id into result;
 insert into public.application_history(application_id,status,actor_id) values(result,'applied',auth.uid());
 return result;
end; $$;

create function public.workspace_application_status(p_id uuid,p_status text,p_note text default '',p_interview_at timestamptz default null)
returns void language plpgsql security definer set search_path='' as $$
declare a public.applications; owner_id uuid; begin
 if not public.workspace_ready() then raise exception 'Active account required' using errcode='42501'; end if;
 select * into a from public.applications where id=p_id for update;
 select created_by into owner_id from public.opportunities where id=a.opportunity_id;
 if a.id is null then raise exception 'Application unavailable'; end if;
 if p_status='withdrawn' then
  if a.student_id<>auth.uid() or not public.workspace_ready('student') or a.status in ('selected','rejected','withdrawn') then raise exception 'Withdrawal unavailable' using errcode='42501'; end if;
 else
  if owner_id is distinct from auth.uid() or p_status not in ('reviewed','shortlisted','interview','selected','rejected') or a.status in ('selected','rejected','withdrawn') then raise exception 'Status change unavailable' using errcode='42501'; end if;
 end if;
 if a.status=p_status or length(p_note)>2000 then raise exception 'Invalid status change'; end if;
 update public.applications set status=p_status,next_step=nullif(p_note,''),interview_at=p_interview_at,updated_at=now() where id=p_id;
 insert into public.application_history(application_id,status,note,actor_id) values(p_id,p_status,p_note,auth.uid());
 if a.student_id<>auth.uid() then perform public.workspace_notify(a.student_id,'application_status_changed','Application update: '||p_status,'applications',p_id,'/dashboard/applications/'||p_id,p_id||':'||gen_random_uuid()); end if;
end; $$;

create function public.workspace_save(p_id uuid,p_saved boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.workspace_ready('student') then raise exception 'Student required' using errcode='42501'; end if;
 if p_saved then
 if not exists(select 1 from public.opportunities where id=p_id and status='published' and public.workspace_audience(university_id,null)) then raise exception 'Unavailable'; end if;
 insert into public.saved_opportunities(user_id,opportunity_id) values(auth.uid(),p_id) on conflict do nothing;
 else delete from public.saved_opportunities where user_id=auth.uid() and opportunity_id=p_id; end if;
end; $$;

create function public.workspace_join(p_kind text,p_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare visible text; begin
 if not public.workspace_ready('student') then raise exception 'Student required' using errcode='42501'; end if;
 if p_kind='communities' then select visibility into visible from public.communities where id=p_id for share;
 elsif p_kind='projects' then select visibility into visible from public.projects where id=p_id for share;
 else raise exception 'Invalid kind'; end if;
 if visible is null or (visible<>'public' and not exists(select 1 from public.workspace_invitations where kind=p_kind and entity_id=p_id and recipient_user_id=auth.uid() and status='pending')) then raise exception 'Invitation required' using errcode='42501'; end if;
 if public.workspace_member(p_kind,p_id) then raise exception 'Already joined' using errcode='23505'; end if;
 if p_kind='communities' then insert into public.community_members(community_id,user_id,role) values(p_id,auth.uid(),'member') on conflict(community_id,user_id) do update set status='active',role='member';
 else insert into public.project_members(project_id,user_id,role) values(p_id,auth.uid(),'member') on conflict(project_id,user_id) do update set status='active',role='member'; end if;
 update public.workspace_invitations set status='accepted' where kind=p_kind and entity_id=p_id and recipient_user_id=auth.uid();
end; $$;

create function public.workspace_invite(p_kind text,p_id uuid,p_email text)
returns void language plpgsql security definer set search_path='' as $$
declare recipient uuid; label text; inv uuid; begin
 if not public.workspace_ready() or not (case when p_kind='communities' then public.is_community_captain(p_id) when p_kind='projects' then public.is_project_head(p_id) else false end) then raise exception 'Management access required' using errcode='42501'; end if;
 select u.id into recipient from auth.users u join public.profiles p on p.id=u.id where lower(u.email)=lower(trim(p_email)) and u.email_confirmed_at is not null and p.primary_role='student' and p.account_status='active';
 if recipient is null then raise exception 'Recipient unavailable'; end if;
 if p_kind='communities' then select name into label from public.communities where id=p_id; else select title into label from public.projects where id=p_id; end if;
 insert into public.workspace_invitations(kind,entity_id,recipient_user_id,created_by) values(p_kind,p_id,recipient,auth.uid()) returning id into inv;
 perform public.workspace_notify(recipient,case when p_kind='communities' then 'community_invitation' else 'project_invitation' end,label||' invited you to join. ',p_kind,p_id,'/dashboard/'||p_kind||'/'||p_id,inv::text);
end; $$;

create function public.workspace_task(p_id uuid,p_status text)
returns void language plpgsql security definer set search_path='' as $$
declare task public.project_tasks; begin
 select * into task from public.project_tasks where id=p_id for update;
 if not public.workspace_ready() or not public.workspace_member('projects',task.project_id) or (task.assignee_id is distinct from auth.uid() and not public.is_project_head(task.project_id)) then raise exception 'Task access required' using errcode='42501'; end if;
 if p_status not in ('todo','in_progress','review','done') then raise exception 'Invalid state'; end if;
 update public.project_tasks set status=p_status where id=p_id;
 insert into public.project_activity(project_id,actor_id,message) values(task.project_id,auth.uid(),task.title||' moved to '||p_status);
end; $$;

create function public.workspace_post(p_community uuid,p_content text,p_post uuid default null,p_parent uuid default null,p_mentions uuid[] default '{}')
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; recipient uuid; author uuid; begin
 if not public.workspace_ready() or not public.workspace_member('communities',p_community) then raise exception 'Membership required' using errcode='42501'; end if;
 if cardinality(p_mentions)>10 then raise exception 'Too many mentions'; end if;
 if p_post is null then
  insert into public.community_posts(community_id,author_id,content) values(p_community,auth.uid(),trim(p_content)) returning id into result;
 else
  select author_id into author from public.community_posts where id=p_post and community_id=p_community;
  if author is null then raise exception 'Post unavailable'; end if;
  if p_parent is not null then select author_id into author from public.community_comments where id=p_parent and post_id=p_post; if author is null then raise exception 'Reply unavailable'; end if; end if;
  insert into public.community_comments(post_id,parent_id,author_id,content) values(p_post,p_parent,auth.uid(),trim(p_content)) returning id into result;
  if author<>auth.uid() then perform public.workspace_notify(author,'community_reply','Someone replied to your community conversation.','communities',p_community,'/dashboard/communities/'||p_community||'?tab=posts#comment-'||result,result||':reply'); end if;
 end if;
 foreach recipient in array p_mentions loop
  if recipient<>auth.uid() and public.workspace_member('communities',p_community,recipient) then
   perform public.workspace_notify(recipient,'community_mention','You were mentioned in a community conversation.','communities',p_community,'/dashboard/communities/'||p_community||'?tab=posts#'||case when p_post is null then 'post-' else 'comment-' end||result,result||':mention');
  end if;
 end loop;
 return result;
end; $$;

create function public.workspace_react(p_id uuid,p_liked boolean)
returns void language plpgsql security definer set search_path='' as $$
declare community uuid; begin
 select community_id into community from public.community_posts where id=p_id;
 if not public.workspace_ready() or not public.workspace_member('communities',community) then raise exception 'Membership required' using errcode='42501'; end if;
 if p_liked then insert into public.community_reactions(post_id,user_id) values(p_id,auth.uid()) on conflict do nothing;
 else delete from public.community_reactions where post_id=p_id and user_id=auth.uid(); end if;
end; $$;

create function public.workspace_register(p_id uuid,p_registered boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.workspace_ready('student') then raise exception 'Student required' using errcode='42501'; end if;
 if p_registered then
 perform 1 from public.events where id=p_id and status='published' and deadline>now() and public.workspace_audience(university_id,community_id) for share;
 if not found then raise exception 'Registration unavailable'; end if;
 insert into public.event_registrations(event_id,user_id) values(p_id,auth.uid());
 else delete from public.event_registrations where event_id=p_id and user_id=auth.uid(); end if;
end; $$;

-- Publishing integrates other roles without granting students employer privileges.
create function public.workspace_publish(p_kind text,p_data jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; org uuid := (p_data->>'organization_id')::uuid; community uuid := (p_data->>'community_id')::uuid; target_university uuid := (p_data->>'university_id')::uuid; recipient uuid;
begin
 if not public.workspace_ready() then raise exception 'Active account required' using errcode='42501'; end if;
 if p_kind='opportunities' then
 if not exists(select 1 from public.organizations where id=org and created_by=auth.uid()) or not exists(select 1 from public.profiles where id=auth.uid() and primary_role in ('company','university','founder')) then raise exception 'Organization ownership required' using errcode='42501'; end if;
 if target_university is not null and not public.can_manage_university(target_university) then raise exception 'University access required' using errcode='42501'; end if;
 insert into public.opportunities(title,description,organization_id,created_by,type,location,work_mode,experience,duration,tags,interests,roles,deadline,university_id)
 values(p_data->>'title',p_data->>'description',org,auth.uid(),p_data->>'type',p_data->>'location',p_data->>'work_mode',p_data->>'experience',p_data->>'duration',array(select jsonb_array_elements_text(p_data->'tags')),array(select jsonb_array_elements_text(p_data->'interests')),array(select jsonb_array_elements_text(p_data->'roles')),(p_data->>'deadline')::timestamptz,target_university) returning id into result;
 for recipient in select s.profile_id from public.student_details s join public.profiles p on p.id=s.profile_id where p.primary_role='student' and p.account_status='active' and exists(select 1 from unnest(s.skills) skill where lower(skill) in (select lower(jsonb_array_elements_text(p_data->'tags')))) and (target_university is null or exists(select 1 from public.university_student_memberships m where m.student_user_id=p.id and m.university_id=target_university and m.status='active')) loop
 perform public.workspace_notify(recipient,'opportunity_match','A new opportunity matches your skills.','opportunities',result,'/dashboard/opportunities/'||result,result::text); end loop;
 elsif p_kind='events' then
 if community is not null then if not public.is_community_captain(community) then raise exception 'Captain required' using errcode='42501'; end if;
 elsif target_university is not null then if not public.can_manage_university(target_university) then raise exception 'University required' using errcode='42501'; end if;
 elsif not exists(select 1 from public.profiles where id=auth.uid() and primary_role in ('university','company','founder','mentor')) then raise exception 'Organizer required' using errcode='42501'; end if;
 insert into public.events(title,description,organizer_id,community_id,university_id,category,mode,location,starts_at,ends_at,deadline,tags)
 values(p_data->>'title',p_data->>'description',auth.uid(),community,target_university,p_data->>'category',p_data->>'mode',p_data->>'location',(p_data->>'starts_at')::timestamptz,(p_data->>'ends_at')::timestamptz,(p_data->>'deadline')::timestamptz,array(select jsonb_array_elements_text(p_data->'tags'))) returning id into result;
 for recipient in select p.id from public.profiles p where p.primary_role='student' and p.account_status='active' and
 ((community is not null and public.workspace_member('communities',community,p.id)) or (target_university is not null and exists(select 1 from public.university_student_memberships m where m.student_user_id=p.id and m.university_id=target_university and m.status='active'))) loop
 perform public.workspace_notify(recipient,'event_published','A new event was published for your network.','events',result,'/dashboard/events/'||result,result::text); end loop;
 else raise exception 'Invalid kind'; end if;
 return result;
end; $$;

-- Explicit grants; no new function is callable anonymously.
revoke all on function public.workspace_apply(uuid),public.workspace_application_status(uuid,text,text,timestamptz),public.workspace_save(uuid,boolean),public.workspace_join(text,uuid),public.workspace_invite(text,uuid,text),public.workspace_task(uuid,text),public.workspace_post(uuid,text,uuid,uuid,uuid[]),public.workspace_react(uuid,boolean),public.workspace_register(uuid,boolean),public.workspace_publish(text,jsonb) from public;
grant execute on function public.workspace_apply(uuid),public.workspace_application_status(uuid,text,text,timestamptz),public.workspace_save(uuid,boolean),public.workspace_join(text,uuid),public.workspace_invite(text,uuid,text),public.workspace_task(uuid,text),public.workspace_post(uuid,text,uuid,uuid,uuid[]),public.workspace_react(uuid,boolean),public.workspace_register(uuid,boolean),public.workspace_publish(text,jsonb) to authenticated;

grant insert,update on public.student_preferences to authenticated;
create policy preferences_insert on public.student_preferences for insert to authenticated with check(user_id=auth.uid() and public.workspace_ready('student'));
create policy preferences_update on public.student_preferences for update to authenticated using(user_id=auth.uid() and public.workspace_ready('student')) with check(user_id=auth.uid());
grant insert on public.support_reports to authenticated;
create policy reports_insert on public.support_reports for insert to authenticated with check(user_id=auth.uid() and public.workspace_ready('student'));
