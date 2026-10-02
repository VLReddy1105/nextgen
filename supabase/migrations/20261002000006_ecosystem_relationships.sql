-- Third pass: append only. Explicit consent replaces silent membership assignment.
alter table public.projects alter column visibility set default 'private';
alter table public.projects add column join_policy text not null default 'invite_only' check(join_policy in ('invite_only','request_to_join','open_join'));
alter table public.projects add column owner_type text not null default 'student' check(owner_type in ('student','company','university','community','founder','mentor'));
alter table public.projects add column short_description text not null default '';
alter table public.projects add column category text not null default 'Other';
alter table public.projects add column project_url text;
alter table public.projects add column expected_team_size integer check(expected_team_size between 1 and 1000);
update public.projects p set owner_type=case when p.community_id is not null then 'community' when p.company_id is not null then 'company' when p.university_id is not null then 'university' else coalesce((select primary_role::text from public.profiles where id=p.created_by_user_id),'student') end;
alter table public.project_members add column show_on_profile boolean not null default false;
alter table public.communities add column join_policy text not null default 'open_join' check(join_policy in ('invite_only','request_to_join','open_join'));
alter table public.communities add column organization_id uuid references public.organizations(id);
alter table public.communities add column category text not null default 'Other';
alter table public.communities drop constraint communities_visibility_check;
alter table public.communities add constraint communities_visibility_check check(visibility in ('public','private','unlisted','university_scoped','organization_scoped'));
alter table public.project_tasks add column description text not null default '';
alter table public.project_tasks add column priority text not null default 'medium' check(priority in ('low','medium','high','urgent'));
alter table public.project_tasks add column created_by uuid references public.profiles(id);
alter table public.project_tasks add column updated_at timestamptz not null default now();
create trigger project_tasks_updated before update on public.project_tasks for each row execute function public.set_updated_at();
alter table public.workspace_invitations add column requested_role text not null default 'member';
alter table public.workspace_invitations add column expires_at timestamptz not null default now()+interval '14 days';
alter table public.workspace_invitations add column accepted_at timestamptz;
alter table public.workspace_invitations add column declined_at timestamptz;
alter table public.workspace_invitations drop constraint workspace_invitations_status_check;
alter table public.workspace_invitations add constraint workspace_invitations_status_check check(status in ('pending','accepted','declined','cancelled','expired'));
alter table public.workspace_invitations drop constraint workspace_invitations_kind_entity_id_recipient_user_id_key;
create unique index workspace_pending_invite on public.workspace_invitations(kind,entity_id,recipient_user_id) where status='pending';
create table public.space_join_requests(id uuid primary key default gen_random_uuid(),kind text not null check(kind in ('projects','communities')),entity_id uuid not null,user_id uuid not null references public.profiles(id),status text not null default 'pending' check(status in ('pending','approved','declined')),created_at timestamptz not null default now(),decided_at timestamptz);
create unique index space_pending_request on public.space_join_requests(kind,entity_id,user_id) where status='pending';
create table public.project_invite_codes(id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id),token_hash text not null unique check(token_hash ~ '^[0-9a-f]{64}$'),created_by uuid not null references public.profiles(id),expires_at timestamptz not null,revoked_at timestamptz,usage_limit integer not null default 10 check(usage_limit between 1 and 100),uses integer not null default 0,created_at timestamptz not null default now());
create table public.project_code_redemptions(code_id uuid not null references public.project_invite_codes(id),user_id uuid not null references public.profiles(id),created_at timestamptz not null default now(),primary key(code_id,user_id));
create table public.ecosystem_activity(id uuid primary key default gen_random_uuid(),actor_id uuid not null references public.profiles(id),source_module text not null,source_entity_id uuid not null,owner_user_id uuid not null references public.profiles(id),message text not null,created_at timestamptz not null default now());

create function public.eco_manager(p_kind text,p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.workspace_ready() and case when p_kind='projects' then public.is_project_head(p_id) when p_kind='communities' then public.is_community_captain(p_id) else false end;
$$;
create function public.eco_space_owner(p_kind text,p_id uuid) returns uuid language sql stable security definer set search_path='' as $$
 select case when p_kind='projects' then (select created_by_user_id from public.projects where id=p_id) when p_kind='communities' then (select created_by from public.communities where id=p_id) end;
$$;
create function public.eco_context(p_org uuid) returns boolean language sql stable security definer set search_path='' as $$
 select p_org is null or exists(select 1 from public.organizations o where o.id=p_org and o.created_by=auth.uid()) or exists(select 1 from public.university_student_memberships m where m.university_id=p_org and m.student_user_id=auth.uid() and m.status='active');
$$;
create function public.eco_space_visible(p_kind text,p_id uuid) returns boolean language plpgsql stable security definer set search_path='' as $$
declare v_visibility text; v_org uuid; begin
 if not public.workspace_ready() then return false; end if;
 if p_kind='projects' then select visibility,university_id into v_visibility,v_org from public.projects where id=p_id;
 elsif p_kind='communities' then select visibility,organization_id into v_visibility,v_org from public.communities where id=p_id; else return false; end if;
 if v_visibility is null then return false; end if;
 return public.workspace_member(p_kind,p_id) or public.eco_manager(p_kind,p_id)
 or (v_visibility in ('public','unlisted','university_scoped','organization_scoped') and public.eco_context(v_org))
 or exists(select 1 from public.workspace_invitations i where i.kind=p_kind and i.entity_id=p_id and i.recipient_user_id=auth.uid() and i.status='pending' and i.expires_at>now());
end; $$;
drop policy projects_read on public.projects;
drop policy invited_project_read on public.projects;
create policy projects_read on public.projects for select to authenticated using(public.eco_space_visible('projects',id));
drop policy communities_read on public.communities;
drop policy invited_community_read on public.communities;
create policy communities_read on public.communities for select to authenticated using(public.eco_space_visible('communities',id));

create function public.eco_activity(p_kind text,p_id uuid,p_message text) returns void language plpgsql security definer set search_path='' as $$
begin
 insert into public.ecosystem_activity(actor_id,source_module,source_entity_id,owner_user_id,message) values(auth.uid(),p_kind,p_id,public.eco_space_owner(p_kind,p_id),p_message);
 if p_kind='projects' then insert into public.project_activity(project_id,actor_id,message) values(p_id,auth.uid(),p_message); end if;
end; $$;
create function public.eco_invite(p_kind text,p_id uuid,p_email text,p_role text default 'member') returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid; v_id uuid; v_title text; v_inviter text; begin
 if not public.eco_manager(p_kind,p_id) then raise exception 'Manager required' using errcode='42501'; end if;
 if (p_kind='projects' and p_role not in ('member','team_lead','mentor')) or (p_kind='communities' and p_role not in ('member','moderator')) then raise exception 'Invalid invitation role'; end if;
 select u.id into v_user from auth.users u join public.profiles p on p.id=u.id where lower(u.email)=lower(trim(p_email)) and u.email_confirmed_at is not null and p.account_status='active' and p.onboarding_completed and p.primary_role in ('student','mentor');
 if v_user is null or v_user=auth.uid() or public.workspace_member(p_kind,p_id,v_user) then raise exception 'Recipient unavailable or already a member'; end if;
 update public.workspace_invitations set status='expired' where kind=p_kind and entity_id=p_id and recipient_user_id=v_user and status='pending' and expires_at<=now();
 insert into public.workspace_invitations(kind,entity_id,recipient_user_id,created_by,requested_role) values(p_kind,p_id,v_user,auth.uid(),p_role) returning id into v_id;
 select full_name into v_inviter from public.profiles where id=auth.uid();
 if p_kind='projects' then select title into v_title from public.projects where id=p_id; else select name into v_title from public.communities where id=p_id; end if;
 perform public.eco_activity(p_kind,p_id,'Member invited');
 perform public.workspace_notify(v_user,case when p_kind='projects' then 'project_invitation' else 'community_invitation' end,coalesce(v_inviter,'A manager')||' invited you to join '||v_title,p_kind,p_id,'/dashboard/'||p_kind||'/'||p_id,v_id||':invitation');
 return v_id;
end; $$;
create or replace function public.workspace_invite(p_kind text,p_id uuid,p_email text) returns void language plpgsql security definer set search_path='' as $$ begin perform public.eco_invite(p_kind,p_id,p_email); end; $$;
create or replace function public.assign_project_member_by_email(p_project_id uuid,p_email text,p_role text) returns text language plpgsql security definer set search_path='' as $$ begin perform public.eco_invite('projects',p_project_id,p_email,p_role); return 'invited'; end; $$;
create or replace function public.assign_community_member_by_email(p_community_id uuid,p_email text,p_role text) returns text language plpgsql security definer set search_path='' as $$ begin perform public.eco_invite('communities',p_community_id,p_email,p_role); return 'invited'; end; $$;
-- Disable legacy direct client assignment; owner creation and the consent RPCs insert memberships internally.
revoke execute on function public.assign_project_member(uuid,uuid,text),public.assign_community_member(uuid,uuid,text) from authenticated;

create function public.eco_invitation_decide(p_id uuid,p_accept boolean) returns void language plpgsql security definer set search_path='' as $$
declare v_inv public.workspace_invitations; begin
 select * into v_inv from public.workspace_invitations where id=p_id for update;
 if not public.workspace_ready() or v_inv.recipient_user_id is distinct from auth.uid() or v_inv.status<>'pending' or v_inv.expires_at<=now() then raise exception 'Invitation unavailable' using errcode='42501'; end if;
 if p_accept then
  if public.workspace_member(v_inv.kind,v_inv.entity_id) then raise exception 'Already a member';end if;
  if not exists(select 1 from public.profiles where id=v_inv.created_by and account_status='active') or not (case when v_inv.kind='projects' then exists(select 1 from public.project_members where project_id=v_inv.entity_id and user_id=v_inv.created_by and status='active' and role='project_head') else exists(select 1 from public.community_members where community_id=v_inv.entity_id and user_id=v_inv.created_by and status='active' and role='captain') end) then raise exception 'Inviter is no longer authorized' using errcode='42501';end if;
  if v_inv.kind='projects' then insert into public.project_members(project_id,user_id,role) values(v_inv.entity_id,auth.uid(),v_inv.requested_role) on conflict(project_id,user_id) do update set status='active',role=excluded.role;
  else insert into public.community_members(community_id,user_id,role) values(v_inv.entity_id,auth.uid(),v_inv.requested_role) on conflict(community_id,user_id) do update set status='active',role=excluded.role; end if;
 end if;
 update public.workspace_invitations set status=case when p_accept then 'accepted' else 'declined' end,accepted_at=case when p_accept then now() end,declined_at=case when not p_accept then now() end where id=p_id;
 perform public.eco_activity(v_inv.kind,v_inv.entity_id,case when p_accept then 'Invitation accepted; member joined' else 'Invitation declined' end);
 perform public.workspace_notify(v_inv.created_by,case when p_accept then 'project_invitation_accepted' else 'invitation_declined' end,case when p_accept then 'Your invitation was accepted.' else 'Your invitation was declined.' end,v_inv.kind,v_inv.entity_id,'/dashboard/'||v_inv.kind||'/'||v_inv.entity_id,p_id||':decision');
end; $$;

create or replace function public.workspace_join(p_kind text,p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare v_policy text; v_visibility text; v_org uuid; begin
 if not public.workspace_ready() or not public.eco_space_visible(p_kind,p_id) then raise exception 'Access required' using errcode='42501'; end if;
 if p_kind='projects' then select join_policy,visibility,university_id into v_policy,v_visibility,v_org from public.projects where id=p_id and status in ('planning','active') for share;
 elsif p_kind='communities' then select join_policy,visibility,organization_id into v_policy,v_visibility,v_org from public.communities where id=p_id for share; end if;
 if v_policy is distinct from 'open_join' or v_visibility='private' or not public.eco_context(v_org) then raise exception 'An invitation or approval is required' using errcode='42501'; end if;
 if public.workspace_member(p_kind,p_id) then raise exception 'Already joined' using errcode='23505'; end if;
 if p_kind='projects' then insert into public.project_members(project_id,user_id,role) values(p_id,auth.uid(),'member') on conflict(project_id,user_id) do update set status='active',role='member';
 else insert into public.community_members(community_id,user_id,role) values(p_id,auth.uid(),'member') on conflict(community_id,user_id) do update set status='active',role='member'; end if;
 perform public.eco_activity(p_kind,p_id,'Member joined');
end; $$;
create function public.eco_join_request(p_kind text,p_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare v_policy text; v_org uuid; v_result uuid; begin
 if not public.workspace_ready() or not public.eco_space_visible(p_kind,p_id) or public.workspace_member(p_kind,p_id) then raise exception 'Request unavailable' using errcode='42501'; end if;
 if p_kind='projects' then select join_policy,university_id into v_policy,v_org from public.projects where id=p_id;
 elsif p_kind='communities' then select join_policy,organization_id into v_policy,v_org from public.communities where id=p_id; end if;
 if v_policy is distinct from 'request_to_join' or not public.eco_context(v_org) then raise exception 'Request unavailable'; end if;
 insert into public.space_join_requests(kind,entity_id,user_id) values(p_kind,p_id,auth.uid()) returning id into v_result;
 perform public.workspace_notify(public.eco_space_owner(p_kind,p_id),case when p_kind='projects' then 'project_join_request' else 'community_join_request' end,'A member requested to join.',p_kind,p_id,'/dashboard/'||p_kind||'/'||p_id,v_result::text);
 return v_result;
end; $$;
create function public.eco_request_decide(p_id uuid,p_accept boolean) returns void language plpgsql security definer set search_path='' as $$
declare v_request public.space_join_requests; begin
 select * into v_request from public.space_join_requests where id=p_id for update;
 if not public.eco_manager(v_request.kind,v_request.entity_id) or v_request.status<>'pending' then raise exception 'Manager required' using errcode='42501'; end if;
 if p_accept then
  if v_request.kind='projects' then insert into public.project_members(project_id,user_id) values(v_request.entity_id,v_request.user_id) on conflict(project_id,user_id) do update set status='active',role='member';
  else insert into public.community_members(community_id,user_id) values(v_request.entity_id,v_request.user_id) on conflict(community_id,user_id) do update set status='active',role='member'; end if;
 end if;
 update public.space_join_requests set status=case when p_accept then 'approved' else 'declined' end,decided_at=now() where id=p_id;
 perform public.eco_activity(v_request.kind,v_request.entity_id,case when p_accept then 'Join request approved; member joined' else 'Join request declined' end);
 perform public.workspace_notify(v_request.user_id,'join_request_decided',case when p_accept then 'Your join request was approved.' else 'Your join request was declined.' end,v_request.kind,v_request.entity_id,'/dashboard/'||v_request.kind||'/'||v_request.entity_id,p_id||':decision');
end; $$;

do $$ declare v_table text; begin foreach v_table in array array['space_join_requests','project_invite_codes','project_code_redemptions','ecosystem_activity'] loop execute format('alter table public.%I enable row level security',v_table); execute format('grant select on public.%I to authenticated',v_table); end loop; end $$;
create policy requests_read on public.space_join_requests for select to authenticated using(user_id=auth.uid() or public.eco_manager(kind,entity_id));
create policy codes_read on public.project_invite_codes for select to authenticated using(public.eco_manager('projects',project_id));
create policy redemptions_read on public.project_code_redemptions for select to authenticated using(user_id=auth.uid());
create policy activity_read on public.ecosystem_activity for select to authenticated using(public.workspace_ready() and (owner_user_id=auth.uid() or (source_module in ('projects','communities') and public.workspace_member(source_module,source_entity_id))));
create policy invitations_manager_read on public.workspace_invitations for select to authenticated using(public.eco_manager(kind,entity_id));

-- Internal helpers stay inaccessible. Only checked operations are callable.
revoke all on function public.eco_activity(text,uuid,text),public.eco_space_owner(text,uuid) from public;
revoke all on function public.eco_manager(text,uuid),public.eco_context(uuid),public.eco_space_visible(text,uuid),public.eco_invite(text,uuid,text,text),public.eco_invitation_decide(uuid,boolean),public.eco_join_request(text,uuid),public.eco_request_decide(uuid,boolean) from public;
grant execute on function public.eco_manager(text,uuid),public.eco_context(uuid),public.eco_space_visible(text,uuid),public.eco_invite(text,uuid,text,text),public.eco_invitation_decide(uuid,boolean),public.eco_join_request(text,uuid),public.eco_request_decide(uuid,boolean) to authenticated;
