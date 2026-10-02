-- Branch before accessing relation-specific NEW fields (the previous trigger
-- referenced project columns on community updates). Preserve ownership rules.
create or replace function public.protect_context_owner()
returns trigger language plpgsql set search_path='' as $$
begin
 if tg_table_name='communities' then
  if new.created_by is distinct from old.created_by then raise exception 'Community owner cannot be changed'; end if;
 elsif tg_table_name='projects' then
  if new.created_by_user_id is distinct from old.created_by_user_id or new.community_id is distinct from old.community_id
   or new.university_id is distinct from old.university_id or new.company_id is distinct from old.company_id then
   raise exception 'Project ownership cannot be changed';
  end if;
 end if;
 return new;
end; $$;

-- Newly added career information and private resume references are owner-only.
create policy student_workspace_privacy on public.student_details as restrictive
 for select to authenticated using(profile_id=auth.uid() or public.is_platform_admin());

-- Retain an application's posting even after the posting is disabled.
-- Definer predicate avoids a recursive opportunities/applications RLS cycle.
create function public.workspace_applied(p_opportunity uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.applications where opportunity_id=p_opportunity and student_id=auth.uid());
$$;
revoke all on function public.workspace_applied(uuid) from public;
grant execute on function public.workspace_applied(uuid) to authenticated;
create policy applied_opportunity_read on public.opportunities for select to authenticated
 using(public.workspace_ready('student') and public.workspace_applied(id));

-- Team leads can create tasks; references are shared only by active members.
create function public.workspace_resource(p_kind text,p_id uuid,p_data jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; assignee uuid := (p_data->>'assignee_id')::uuid; begin
 if not public.workspace_ready() then raise exception 'Active account required' using errcode='42501'; end if;
 if coalesce(length(trim(p_data->>'title')),0) not between 2 and 160 then raise exception 'Invalid title'; end if;
 if p_kind='task' then
  if not public.is_project_head(p_id) then raise exception 'Project head required' using errcode='42501'; end if;
  if assignee is not null and not public.workspace_member('projects',p_id,assignee) then raise exception 'Assignee must be a member'; end if;
  insert into public.project_tasks(project_id,title,assignee_id,deadline) values(p_id,trim(p_data->>'title'),assignee,(p_data->>'deadline')::timestamptz) returning id into result;
  insert into public.project_activity(project_id,actor_id,message) values(p_id,auth.uid(),'Added task: '||trim(p_data->>'title'));
 elsif p_kind='file' then
  if not public.workspace_member('projects',p_id) then raise exception 'Membership required' using errcode='42501'; end if;
  insert into public.project_files(project_id,name,url,created_by) values(p_id,trim(p_data->>'title'),p_data->>'url',auth.uid()) returning id into result;
 elsif p_kind='resource' then
  if not public.is_community_captain(p_id) then raise exception 'Captain required' using errcode='42501'; end if;
  insert into public.community_resources(community_id,title,url) values(p_id,trim(p_data->>'title'),p_data->>'url') returning id into result;
 else raise exception 'Invalid resource'; end if;
 return result;
end; $$;
revoke all on function public.workspace_resource(text,uuid,jsonb) from public;
grant execute on function public.workspace_resource(text,uuid,jsonb) to authenticated;

-- Lookup totals without disclosing other students' identity or enrollment.
create function public.workspace_stats(p_kind text,p_ids uuid[])
returns table(entity_id uuid,member_count bigint) language plpgsql stable security definer set search_path='' as $$
begin
 if not public.workspace_ready() or cardinality(p_ids)>500 then raise exception 'Invalid request' using errcode='42501'; end if;
 if p_kind='communities' then return query select c.id,count(m.user_id) from public.communities c left join public.community_members m on m.community_id=c.id and m.status='active'
 where c.id=any(p_ids) and (c.visibility<>'private' or public.workspace_member('communities',c.id)) group by c.id;
 elsif p_kind='projects' then return query select p.id,count(m.user_id) from public.projects p left join public.project_members m on m.project_id=p.id and m.status='active'
 where p.id=any(p_ids) and (p.visibility<>'private' or public.workspace_member('projects',p.id)) group by p.id;
 elsif p_kind='events' then return query select e.id,count(r.user_id) from public.events e left join public.event_registrations r on r.event_id=e.id
 where e.id=any(p_ids) and public.workspace_audience(e.university_id,e.community_id) group by e.id;
 end if;
end; $$;
revoke all on function public.workspace_stats(text,uuid[]) from public;
grant execute on function public.workspace_stats(text,uuid[]) to authenticated;

create function public.workspace_create(p_kind text,p_data jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; normalized text[]; begin
 if not public.workspace_ready() then raise exception 'Active account required' using errcode='42501'; end if;
 select array_agg(distinct lower(trim(value))) into normalized from jsonb_array_elements_text(p_data->'tags');
 if cardinality(normalized)>20 then raise exception 'Too many tags'; end if;
 if p_kind='projects' then
  result:=public.create_project(p_data->>'title',p_data->>'slug',p_data->>'description');
  update public.projects set tags=coalesce(normalized,'{}') where id=result;
 elsif p_kind='communities' then
  result:=public.create_community(p_data->>'title',p_data->>'slug',p_data->>'description');
  update public.communities set tags=coalesce(normalized,'{}') where id=result;
 else raise exception 'Invalid kind'; end if;
 return result;
end; $$;
revoke all on function public.workspace_create(text,jsonb) from public;
grant execute on function public.workspace_create(text,jsonb) to authenticated;
