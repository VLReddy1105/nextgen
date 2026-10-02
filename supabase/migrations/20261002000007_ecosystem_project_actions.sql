create function public.eco_code_create(p_id uuid,p_hash text,p_days integer default 7,p_limit integer default 10) returns uuid language plpgsql security definer set search_path='' as $$
declare v_result uuid; begin
 if not public.eco_manager('projects',p_id) then raise exception 'Project head required' using errcode='42501'; end if;
 if p_days not between 1 and 30 or p_limit not between 1 and 100 then raise exception 'Invalid code limits'; end if;
 insert into public.project_invite_codes(project_id,token_hash,created_by,expires_at,usage_limit) values(p_id,p_hash,auth.uid(),now()+make_interval(days=>p_days),p_limit) returning id into v_result;
 perform public.eco_activity('projects',p_id,'Invite code generated'); return v_result;
end; $$;
create function public.eco_code_revoke(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare v_project uuid; begin
 select project_id into v_project from public.project_invite_codes where id=p_id;
 if not public.eco_manager('projects',v_project) then raise exception 'Project head required' using errcode='42501'; end if;
 update public.project_invite_codes set revoked_at=now() where id=p_id;
 perform public.eco_activity('projects',v_project,'Invite code revoked');
end; $$;
create function public.eco_code_preview(p_token text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_code public.project_invite_codes; v_project public.projects; begin
 if not public.workspace_ready('student') or length(p_token) not between 20 and 200 then raise exception 'Student access required' using errcode='42501'; end if;
 select * into v_code from public.project_invite_codes where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') and revoked_at is null and expires_at>now() and uses<usage_limit;
 if v_code.id is null then raise exception 'Invitation code is invalid, expired or unavailable'; end if;
 select * into v_project from public.projects where id=v_code.project_id and status in ('planning','active');
 if v_project.id is null or not public.eco_context(v_project.university_id) then raise exception 'Project unavailable'; end if;
 return jsonb_build_object('id',v_project.id,'title',v_project.title,'description',v_project.short_description,'tags',v_project.tags,'visibility',v_project.visibility,'requested_role','member','expires_at',v_code.expires_at,'owner_type',v_project.owner_type,'team_count',(select count(*) from public.project_members where project_id=v_project.id and status='active'));
end; $$;
create function public.eco_code_accept(p_token text) returns uuid language plpgsql security definer set search_path='' as $$
declare v_code public.project_invite_codes; v_preview jsonb; begin
 v_preview:=public.eco_code_preview(p_token);
 select * into v_code from public.project_invite_codes where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') for update;
 if v_code.revoked_at is not null or v_code.expires_at<=now() or v_code.uses>=v_code.usage_limit or public.workspace_member('projects',v_code.project_id) then raise exception 'Invitation unavailable or already joined'; end if;
 insert into public.project_code_redemptions(code_id,user_id) values(v_code.id,auth.uid());
 insert into public.project_members(project_id,user_id,role) values(v_code.project_id,auth.uid(),'member') on conflict(project_id,user_id) do update set status='active',role='member';
 update public.project_invite_codes set uses=uses+1 where id=v_code.id;
 perform public.eco_activity('projects',v_code.project_id,'Invitation code accepted; member joined');
 perform public.workspace_notify(v_code.created_by,'project_invitation_accepted','A Student accepted your project invite link.','projects',v_code.project_id,'/dashboard/projects/'||v_code.project_id,v_code.id||':'||auth.uid());
 return v_code.project_id;
end; $$;

create function public.eco_space_save(p_kind text,p_data jsonb,p_id uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid:=p_id; v_role text; v_org uuid:=(p_data->>'organization_id')::uuid; v_community uuid:=(p_data->>'community_id')::uuid; v_owner text; v_visibility text:=coalesce(p_data->>'visibility',case when p_kind='projects' then 'private' else 'public' end); v_policy text:=coalesce(p_data->>'join_policy',case when p_kind='projects' then 'invite_only' else 'open_join' end); v_tags text[]; v_old text; begin
 if not public.workspace_ready() then raise exception 'Active account required' using errcode='42501'; end if;
 select primary_role::text into v_role from public.profiles where id=auth.uid();
 if coalesce(length(trim(p_data->>'title')),0) not between 2 and 160 or coalesce(length(trim(p_data->>'short_description')),0) not between 2 and 500 or length(coalesce(p_data->>'description',''))>10000 then raise exception 'Name and short description required'; end if;
 select array_agg(distinct lower(trim(value))) into v_tags from jsonb_array_elements_text(p_data->'tags');
 if coalesce(cardinality(v_tags),0) not between 1 and 20 then raise exception 'Choose 1 to 20 skill tags'; end if;
 if v_visibility='private' and v_policy='open_join' then raise exception 'Private spaces cannot allow open joining'; end if;
 if v_org is not null then
  select type::text into v_owner from public.organizations where id=v_org and created_by=auth.uid();
  if v_owner is null or (v_owner='university' and not public.can_manage_university(v_org)) or v_owner not in ('university','company') then raise exception 'Organization ownership required' using errcode='42501'; end if;
 elsif v_community is not null then
  if p_kind<>'projects' or not public.eco_manager('communities',v_community) then raise exception 'Community management required' using errcode='42501'; end if; v_owner:='community';
 else v_owner:=v_role; end if;
 if p_kind='communities' and v_visibility in ('university_scoped','organization_scoped') and v_org is null then raise exception 'Owning organization required'; end if;
 if p_kind='communities' and v_visibility='university_scoped' and v_owner<>'university' then raise exception 'University context required'; end if;
 if v_id is null then
  if p_kind='projects' then
   insert into public.projects(title,slug,description,short_description,created_by_user_id,visibility,join_policy,owner_type,company_id,university_id,community_id,tags,category,project_url,expected_team_size)
   values(trim(p_data->>'title'),p_data->>'slug',p_data->>'description',p_data->>'short_description',auth.uid(),v_visibility,v_policy,v_owner,case when v_owner='company' then v_org end,case when v_owner='university' then v_org end,v_community,v_tags,p_data->>'category',nullif(p_data->>'project_url',''),(p_data->>'expected_team_size')::integer) returning id into v_id;
   insert into public.project_members(project_id,user_id,role) values(v_id,auth.uid(),'project_head');
  elsif p_kind='communities' then
   insert into public.communities(name,slug,description,created_by,visibility,join_policy,organization_id,tags,category) values(trim(p_data->>'title'),p_data->>'slug',p_data->>'description',auth.uid(),v_visibility,v_policy,v_org,v_tags,p_data->>'category') returning id into v_id;
   insert into public.community_members(community_id,user_id,role) values(v_id,auth.uid(),'captain');
  else raise exception 'Invalid kind'; end if;
  perform public.eco_activity(p_kind,v_id,case when p_kind='projects' then 'Project created' else 'Community created' end);
 else
  if not public.eco_manager(p_kind,v_id) then raise exception 'Manager required' using errcode='42501'; end if;
  if p_kind='projects' then select visibility into v_old from public.projects where id=v_id;
   update public.projects set title=trim(p_data->>'title'),short_description=p_data->>'short_description',description=p_data->>'description',visibility=v_visibility,join_policy=v_policy,tags=v_tags,category=p_data->>'category',project_url=nullif(p_data->>'project_url',''),expected_team_size=(p_data->>'expected_team_size')::integer where id=v_id;
  else select visibility into v_old from public.communities where id=v_id;
   update public.communities set name=trim(p_data->>'title'),description=p_data->>'description',visibility=v_visibility,join_policy=v_policy,tags=v_tags,category=p_data->>'category' where id=v_id; end if;
  perform public.eco_activity(p_kind,v_id,case when v_old<>v_visibility then 'Visibility changed to '||v_visibility else 'Space updated' end);
 end if;
 return v_id;
end; $$;

create function public.eco_member_remove(p_kind text,p_id uuid,p_user uuid) returns void language plpgsql security definer set search_path='' as $$
declare v_role text; begin
 if not public.workspace_ready() or (p_user<>auth.uid() and not public.eco_manager(p_kind,p_id)) then raise exception 'Access required' using errcode='42501'; end if;
 if p_kind='projects' then select role into v_role from public.project_members where project_id=p_id and user_id=p_user and status='active';
 else select role into v_role from public.community_members where community_id=p_id and user_id=p_user and status='active'; end if;
 if v_role is null or v_role in ('project_head','captain') then raise exception 'Space owners must remain members'; end if;
 if p_kind='projects' then update public.project_members set status='removed' where project_id=p_id and user_id=p_user; update public.project_tasks set assignee_id=null where project_id=p_id and assignee_id=p_user;
 else update public.community_members set status='removed' where community_id=p_id and user_id=p_user; end if;
 perform public.eco_activity(p_kind,p_id,case when p_user=auth.uid() then 'Member left' else 'Member removed' end);
end; $$;
create function public.eco_task_save(p_project uuid,p_data jsonb,p_id uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare v_task public.project_tasks; v_assignee uuid:=(p_data->>'assignee_id')::uuid; v_id uuid:=p_id; begin
 if not public.workspace_ready() or not public.workspace_member('projects',p_project) then raise exception 'Membership required' using errcode='42501'; end if;
 if coalesce(length(trim(p_data->>'title')),0) not between 2 and 160 or length(coalesce(p_data->>'description',''))>5000 then raise exception 'Invalid task'; end if;
 if v_assignee is not null and not public.workspace_member('projects',p_project,v_assignee) then raise exception 'Assignee must be an active member'; end if;
 if v_id is null then
  if not public.eco_manager('projects',p_project) then raise exception 'Project head required' using errcode='42501'; end if;
  insert into public.project_tasks(project_id,title,description,assignee_id,status,priority,deadline,created_by) values(p_project,p_data->>'title',coalesce(p_data->>'description',''),v_assignee,coalesce(p_data->>'status','todo'),coalesce(p_data->>'priority','medium'),(p_data->>'deadline')::timestamptz,auth.uid()) returning id into v_id;
  perform public.eco_activity('projects',p_project,'Task created: '||(p_data->>'title'));
 else
  select * into v_task from public.project_tasks where id=v_id and project_id=p_project for update;
  if v_task.id is null or (not public.eco_manager('projects',p_project) and (v_task.assignee_id is distinct from auth.uid() or v_assignee is distinct from v_task.assignee_id or p_data->>'priority' is distinct from v_task.priority or (p_data->>'deadline')::timestamptz is distinct from v_task.deadline)) then raise exception 'Task permission required' using errcode='42501'; end if;
  update public.project_tasks set title=p_data->>'title',description=coalesce(p_data->>'description',''),assignee_id=v_assignee,status=p_data->>'status',priority=p_data->>'priority',deadline=(p_data->>'deadline')::timestamptz where id=v_id;
  perform public.eco_activity('projects',p_project,case when v_task.status is distinct from p_data->>'status' then 'Task status changed to '||(p_data->>'status')||': '||(p_data->>'title') else 'Task updated: '||(p_data->>'title') end);
 end if;
 if v_assignee is not null and v_assignee<>auth.uid() and (p_id is null or v_assignee is distinct from v_task.assignee_id) then
  perform public.eco_activity('projects',p_project,'Task assigned: '||(p_data->>'title'));
  perform public.workspace_notify(v_assignee,'task_assigned','You were assigned a project task.','projects',p_project,'/dashboard/projects/'||p_project||'?tab=tasks',v_id||':assigned:'||gen_random_uuid()); end if;
 return v_id;
end; $$;
create function public.eco_portfolio(p_project uuid,p_show boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.workspace_ready('student') or not public.workspace_member('projects',p_project) or (p_show and not exists(select 1 from public.projects where id=p_project and visibility='public')) then raise exception 'Only your public projects can be shown' using errcode='42501'; end if;
 update public.project_members set show_on_profile=p_show where project_id=p_project and user_id=auth.uid();
end; $$;

revoke update on public.projects,public.communities from authenticated;
grant update(title,description,visibility,join_policy,tags,category,short_description,project_url,expected_team_size) on public.projects to authenticated;
grant update(name,description,visibility,join_policy,tags,category) on public.communities to authenticated;
revoke all on function public.eco_code_create(uuid,text,integer,integer),public.eco_code_revoke(uuid),public.eco_code_preview(text),public.eco_code_accept(text),public.eco_space_save(text,jsonb,uuid),public.eco_member_remove(text,uuid,uuid),public.eco_task_save(uuid,jsonb,uuid),public.eco_portfolio(uuid,boolean) from public;
grant execute on function public.eco_code_create(uuid,text,integer,integer),public.eco_code_revoke(uuid),public.eco_code_preview(text),public.eco_code_accept(text),public.eco_space_save(text,jsonb,uuid),public.eco_member_remove(text,uuid,uuid),public.eco_task_save(uuid,jsonb,uuid),public.eco_portfolio(uuid,boolean) to authenticated;
