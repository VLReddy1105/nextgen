-- Workspace records. No seeds, demo identities, or changes to historical migrations.
create table public.opportunities (
 id uuid primary key default gen_random_uuid(), title text not null check(length(trim(title)) between 2 and 160),
 description text not null default '', organization_id uuid not null references public.organizations(id),
 created_by uuid not null references public.profiles(id), type text not null check(type in ('job','internship','project','competition','hiring_drive')),
 location text not null default '', work_mode text not null check(work_mode in ('remote','hybrid','on-site')),
 experience text not null default 'fresher', duration text, tags text[] not null default '{}', interests text[] not null default '{}',
 roles text[] not null default '{}', university_id uuid references public.organizations(id), deadline timestamptz not null,
 status text not null default 'published' check(status in ('published','disabled','draft')), created_at timestamptz not null default now()
);
create table public.saved_opportunities (
 user_id uuid not null references public.profiles(id), opportunity_id uuid not null references public.opportunities(id),
 created_at timestamptz not null default now(), primary key(user_id,opportunity_id)
);
create table public.applications (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.profiles(id),
 opportunity_id uuid not null references public.opportunities(id),
 status text not null default 'applied' check(status in ('applied','reviewed','shortlisted','interview','selected','rejected','withdrawn')),
 next_step text, interview_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(student_id,opportunity_id)
);
create table public.application_history (
 id uuid primary key default gen_random_uuid(), application_id uuid not null references public.applications(id),
 status text not null, note text, actor_id uuid not null references public.profiles(id), created_at timestamptz not null default now()
);
create table public.notifications (
 id uuid primary key default gen_random_uuid(), recipient_user_id uuid not null references public.profiles(id),
 type text not null, title text not null, message text not null, source_module text not null, source_entity_id uuid not null,
 action_url text not null check(action_url like '/dashboard/%' and action_url not like '%\%'),
 read_at timestamptz, created_at timestamptz not null default now(), metadata jsonb not null default '{}',
 event_key text not null, unique(recipient_user_id,event_key)
);
create index notifications_recipient_created on public.notifications(recipient_user_id,created_at desc);
alter table public.projects add column tags text[] not null default '{}';
alter table public.communities add column tags text[] not null default '{}';
create table public.workspace_invitations (
 id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('projects','communities')),
 entity_id uuid not null, recipient_user_id uuid not null references public.profiles(id), created_by uuid not null references public.profiles(id),
 status text not null default 'pending' check(status in ('pending','accepted','cancelled')), created_at timestamptz not null default now(),
 unique(kind,entity_id,recipient_user_id)
);
create table public.project_tasks (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id), title text not null,
 assignee_id uuid references public.profiles(id), status text not null default 'todo' check(status in ('todo','in_progress','review','done')),
 deadline timestamptz, created_at timestamptz not null default now()
);
create table public.project_activity (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id), actor_id uuid not null references public.profiles(id),
 message text not null, created_at timestamptz not null default now()
);
create table public.project_files (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id), name text not null,
 url text not null check(url ~ '^https://'), created_by uuid not null references public.profiles(id), created_at timestamptz not null default now()
);
create table public.community_posts (
 id uuid primary key default gen_random_uuid(), community_id uuid not null references public.communities(id), author_id uuid not null references public.profiles(id),
 content text not null check(length(trim(content)) between 1 and 5000), created_at timestamptz not null default now()
);
create table public.community_comments (
 id uuid primary key default gen_random_uuid(), post_id uuid not null references public.community_posts(id),
 parent_id uuid references public.community_comments(id), author_id uuid not null references public.profiles(id),
 content text not null check(length(trim(content)) between 1 and 2000), created_at timestamptz not null default now()
);
create table public.community_reactions (
 post_id uuid not null references public.community_posts(id), user_id uuid not null references public.profiles(id), primary key(post_id,user_id)
);
create table public.community_resources (
 id uuid primary key default gen_random_uuid(), community_id uuid not null references public.communities(id), title text not null,
 url text not null check(url ~ '^https://'), created_at timestamptz not null default now()
);
create table public.events (
 id uuid primary key default gen_random_uuid(), title text not null, description text not null default '', organizer_id uuid not null references public.profiles(id),
 community_id uuid references public.communities(id), university_id uuid references public.organizations(id),
 category text not null check(category in ('webinar','workshop','hackathon','hiring_drive','career_session','networking','startup_event')),
 mode text not null check(mode in ('online','in-person','hybrid')), location text not null default '',
 starts_at timestamptz not null, ends_at timestamptz not null, deadline timestamptz not null, tags text[] not null default '{}',
 status text not null default 'published' check(status in ('published','cancelled')), created_at timestamptz not null default now(),
 check(ends_at>starts_at), check(deadline<=starts_at), check(num_nonnulls(community_id,university_id)<=1)
);
create table public.event_registrations (
 event_id uuid not null references public.events(id), user_id uuid not null references public.profiles(id), created_at timestamptz not null default now(),
 primary key(event_id,user_id)
);
create table public.mentor_connections (
 student_id uuid not null references public.profiles(id), mentor_id uuid not null references public.mentor_profiles(user_id),
 status text not null default 'requested' check(status in ('requested','accepted','declined')), created_at timestamptz not null default now(), primary key(student_id,mentor_id)
);
create table public.mentor_sessions (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.profiles(id), mentor_id uuid not null references public.mentor_profiles(user_id),
 title text not null, starts_at timestamptz not null, status text not null default 'confirmed', created_at timestamptz not null default now()
);
create table public.student_preferences (
 user_id uuid primary key references public.profiles(id), in_app_notifications boolean not null default true,
 profile_visibility text not null default 'private' check(profile_visibility in ('private','members'))
);
create table public.support_reports (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id),
 category text not null check(category in ('problem','opportunity','support')), subject text not null check(length(subject) between 2 and 160),
 message text not null check(length(message) between 10 and 4000), status text not null default 'received', created_at timestamptz not null default now()
);

-- Shared relationship predicates avoid recursive RLS checks.
create function public.workspace_member(p_kind text,p_id uuid,p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path='' as $$
 select case when p_kind='projects' then exists(select 1 from public.project_members where project_id=p_id and user_id=p_user and status='active')
 when p_kind='communities' then exists(select 1 from public.community_members where community_id=p_id and user_id=p_user and status='active') else false end;
$$;
create function public.workspace_audience(p_university uuid,p_community uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select public.workspace_ready() and ((p_university is null and p_community is null)
 or exists(select 1 from public.university_student_memberships where university_id=p_university and student_user_id=auth.uid() and status='active')
 or public.workspace_member('communities',p_community));
$$;
revoke all on function public.workspace_member(text,uuid,uuid),public.workspace_audience(uuid,uuid) from public;
grant execute on function public.workspace_member(text,uuid,uuid),public.workspace_audience(uuid,uuid) to authenticated;

-- A single internal notification writer. Clients cannot call it directly.
create function public.workspace_notify(p_user uuid,p_type text,p_title text,p_module text,p_entity uuid,p_url text,p_key text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.student_preferences where user_id=p_user and not in_app_notifications) then return; end if;
 insert into public.notifications(recipient_user_id,type,title,message,source_module,source_entity_id,action_url,event_key)
 values(p_user,p_type,p_title,p_title,p_module,p_entity,p_url,p_key) on conflict(recipient_user_id,event_key) do nothing;
end; $$;
revoke all on function public.workspace_notify(uuid,text,text,text,uuid,text,text) from public;

do $$ declare t text; begin
 foreach t in array array['opportunities','saved_opportunities','applications','application_history','notifications','workspace_invitations',
 'project_tasks','project_activity','project_files','community_posts','community_comments','community_reactions','community_resources',
 'events','event_registrations','mentor_connections','mentor_sessions','student_preferences','support_reports'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('grant select on public.%I to authenticated',t);
 end loop;
end $$;
create policy opportunities_read on public.opportunities for select to authenticated using(public.workspace_ready() and
 ((status='published' and public.workspace_audience(university_id,null)) or created_by=auth.uid()));
create policy saved_read on public.saved_opportunities for select to authenticated using(user_id=auth.uid());
create policy applications_read on public.applications for select to authenticated using(public.workspace_ready() and (student_id=auth.uid()
 or exists(select 1 from public.opportunities o where o.id=opportunity_id and o.created_by=auth.uid())));
create policy application_history_read on public.application_history for select to authenticated using(exists(select 1 from public.applications a where a.id=application_id));
create policy notifications_read on public.notifications for select to authenticated using(recipient_user_id=auth.uid() and public.workspace_ready());
grant update(read_at) on public.notifications to authenticated;
create policy notifications_mark on public.notifications for update to authenticated using(recipient_user_id=auth.uid() and public.workspace_ready()) with check(recipient_user_id=auth.uid());
create policy invitations_read on public.workspace_invitations for select to authenticated using(recipient_user_id=auth.uid() or created_by=auth.uid());
create policy invited_community_read on public.communities for select to authenticated using(exists(select 1 from public.workspace_invitations i where i.kind='communities' and i.entity_id=communities.id and i.recipient_user_id=auth.uid() and i.status='pending'));
create policy invited_project_read on public.projects for select to authenticated using(exists(select 1 from public.workspace_invitations i where i.kind='projects' and i.entity_id=projects.id and i.recipient_user_id=auth.uid() and i.status='pending'));
create policy tasks_read on public.project_tasks for select to authenticated using(public.workspace_member('projects',project_id));
create policy activity_read on public.project_activity for select to authenticated using(public.workspace_member('projects',project_id));
create policy files_read on public.project_files for select to authenticated using(public.workspace_member('projects',project_id));
create policy feed_read on public.community_posts for select to authenticated using(public.workspace_member('communities',community_id));
create policy comments_read on public.community_comments for select to authenticated using(exists(select 1 from public.community_posts p where p.id=post_id));
create policy reactions_read on public.community_reactions for select to authenticated using(exists(select 1 from public.community_posts p where p.id=post_id));
create policy resources_read on public.community_resources for select to authenticated using(public.workspace_member('communities',community_id));
create policy events_read on public.events for select to authenticated using(public.workspace_audience(university_id,community_id) or organizer_id=auth.uid());
create policy registrations_read on public.event_registrations for select to authenticated using(user_id=auth.uid());
create policy mentor_connections_read on public.mentor_connections for select to authenticated using(student_id=auth.uid() or mentor_id=auth.uid());
create policy mentor_sessions_read on public.mentor_sessions for select to authenticated using(student_id=auth.uid() or mentor_id=auth.uid());
create policy preferences_read on public.student_preferences for select to authenticated using(user_id=auth.uid());
create policy reports_read on public.support_reports for select to authenticated using(user_id=auth.uid());

create function public.workspace_directory(p_kind text,p_id uuid default null)
returns table(user_id uuid,full_name text,avatar_url text,role text) language plpgsql stable security definer set search_path='' as $$
begin
 if not public.workspace_ready() then raise exception 'Active account required' using errcode='42501'; end if;
 if p_kind='mentors' then
 return query select p.id,p.full_name,p.avatar_url,'mentor'::text from public.profiles p join public.mentor_profiles m on m.user_id=p.id where p.primary_role='mentor' and p.account_status='active' and p.onboarding_completed;
 elsif p_kind='projects' and public.workspace_member(p_kind,p_id) then
 return query select p.id,p.full_name,p.avatar_url,m.role from public.project_members m join public.profiles p on p.id=m.user_id where m.project_id=p_id and m.status='active';
 elsif p_kind='communities' and public.workspace_member(p_kind,p_id) then
 return query select p.id,p.full_name,p.avatar_url,m.role from public.community_members m join public.profiles p on p.id=m.user_id where m.community_id=p_id and m.status='active';
 else raise exception 'Membership required' using errcode='42501'; end if;
end; $$;
revoke all on function public.workspace_directory(text,uuid) from public;
grant execute on function public.workspace_directory(text,uuid) to authenticated;
