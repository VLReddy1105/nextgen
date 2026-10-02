-- Recheck campus scope at acceptance and later membership reads, including after revocation.
create function public.eco_scope_allowed(p_kind text,p_id uuid,p_user uuid) returns boolean language plpgsql stable security definer set search_path='' as $$
declare v_uni uuid; v_owner uuid; begin
 if p_kind='projects' then select university_id,created_by_user_id into v_uni,v_owner from public.projects where id=p_id;
 elsif p_kind='communities' then select case when visibility='university_scoped' then organization_id end,created_by into v_uni,v_owner from public.communities where id=p_id;else return false;end if;
 return v_owner is not null and (v_owner=p_user or v_uni is null or exists(select 1 from public.university_student_memberships where university_id=v_uni and student_user_id=p_user and status='active'));
end; $$;
create or replace function public.workspace_member(p_kind text,p_id uuid,p_user uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
 select public.workspace_ready() and public.eco_scope_allowed(p_kind,p_id,p_user) and case when p_kind='projects' then exists(select 1 from public.project_members where project_id=p_id and user_id=p_user and status='active') when p_kind='communities' then exists(select 1 from public.community_members where community_id=p_id and user_id=p_user and status='active') else false end;
$$;
create function public.eco_membership_scope() returns trigger language plpgsql security definer set search_path='' as $$
declare v_kind text;v_id uuid;begin
 if tg_table_name='project_members' then v_kind:='projects';v_id:=new.project_id;else v_kind:='communities';v_id:=new.community_id;end if;
 if new.status='active' and not public.eco_scope_allowed(v_kind,v_id,new.user_id) then raise exception 'Active campus membership required' using errcode='42501';end if;return new;
end; $$;
create trigger project_member_scope before insert or update on public.project_members for each row execute function public.eco_membership_scope();
create trigger community_member_scope before insert or update on public.community_members for each row execute function public.eco_membership_scope();
create function public.eco_space_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.visibility='private' and new.join_policy='open_join' then raise exception 'Private spaces require consent';end if;
 if tg_table_name='communities' then
  if new.visibility in ('university_scoped','organization_scoped') and new.organization_id is null then raise exception 'Organization context required';end if;
  if new.visibility='university_scoped' and not exists(select 1 from public.organizations where id=new.organization_id and type='university' and verified and official_account) then raise exception 'Verified university context required';end if;
 end if;
 return new;
end; $$;
create trigger project_visibility_guard before insert or update on public.projects for each row execute function public.eco_space_guard();
create trigger community_visibility_guard before insert or update on public.communities for each row execute function public.eco_space_guard();
create function public.eco_file_activity() returns trigger language plpgsql security definer set search_path='' as $$
begin perform public.eco_activity('projects',new.project_id,'File/link added: '||new.name);return new;end; $$;
create trigger project_file_activity after insert on public.project_files for each row execute function public.eco_file_activity();
create function public.eco_invitation_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='accepted' and old.status='pending' and not exists(select 1 from public.profiles where id=new.created_by and account_status='active') then raise exception 'Inviter is no longer active';end if;return new;
end; $$;
create trigger invitation_active_guard before update on public.workspace_invitations for each row execute function public.eco_invitation_guard();
create function public.eco_invitation_cancel(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare r public.workspace_invitations;begin
 select * into r from public.workspace_invitations where id=p_id for update;
 if not public.eco_manager(r.kind,r.entity_id) or r.status<>'pending' then raise exception 'Pending manager invitation required' using errcode='42501';end if;
 update public.workspace_invitations set status='cancelled' where id=p_id;
 perform public.eco_activity(r.kind,r.entity_id,'Invitation cancelled');
end; $$;
revoke all on function public.eco_scope_allowed(text,uuid,uuid),public.eco_membership_scope(),public.eco_space_guard(),public.eco_file_activity(),public.eco_invitation_guard(),public.eco_invitation_cancel(uuid) from public;
grant execute on function public.eco_invitation_cancel(uuid) to authenticated;
create policy registrations_organizer_read on public.event_registrations for select to authenticated using(public.workspace_ready() and exists(select 1 from public.events e where e.id=event_id and e.organizer_id=auth.uid()));
create or replace function public.workspace_task(p_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
declare t public.project_tasks;begin
 select * into t from public.project_tasks where id=p_id;
 if t.id is null then raise exception 'Task unavailable';end if;
 perform public.eco_task_save(t.project_id,jsonb_build_object('title',t.title,'description',t.description,'assignee_id',t.assignee_id,'status',p_status,'priority',t.priority,'deadline',t.deadline),p_id);
end; $$;
create function public.eco_event_attending(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.event_registrations where event_id=p_id and user_id=auth.uid());
$$;
revoke all on function public.eco_event_attending(uuid) from public;
grant execute on function public.eco_event_attending(uuid) to authenticated;
drop policy events_read on public.events;
create policy events_read on public.events for select to authenticated using(public.workspace_ready() and (organizer_id=auth.uid() or ((status='published' or (status='cancelled' and public.eco_event_attending(id))) and public.eco_eligible(university_id,eligibility) and (community_id is null or public.workspace_member('communities',community_id)))));
