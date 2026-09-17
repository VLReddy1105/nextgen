-- Community Captain and Project Head live in resource memberships, not profiles.
create table public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text, visibility text not null default 'public' check (visibility in ('public', 'private', 'unlisted')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create trigger communities_updated_at before update on public.communities
  for each row execute function public.set_updated_at();
alter table public.communities enable row level security;

create table public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('captain', 'moderator', 'member')),
  status text not null default 'active' check (status in ('active', 'removed')),
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);
create index community_members_user_idx on public.community_members(user_id);
alter table public.community_members enable row level security;

create or replace function public.is_community_captain(p_community_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.community_members m join public.profiles p on p.id = m.user_id
    where m.community_id = p_community_id and m.user_id = (select auth.uid())
      and m.role = 'captain' and m.status = 'active' and p.account_status = 'active');
$$;
revoke all on function public.is_community_captain(uuid) from public;
grant execute on function public.is_community_captain(uuid) to authenticated;

create policy communities_read on public.communities for select to authenticated
  using (visibility <> 'private' or exists (select 1 from public.community_members m
    where m.community_id = id and m.user_id = (select auth.uid()) and m.status = 'active'));
create policy communities_update_captain on public.communities for update to authenticated
  using (public.is_community_captain(id)) with check (public.is_community_captain(id));
create policy community_members_read on public.community_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_community_captain(community_id));

create or replace function public.create_community(p_name text, p_slug text, p_description text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := (select auth.uid());
  new_id uuid;
begin
  if actor is null or not exists (select 1 from public.profiles where id = actor and account_status = 'active' and onboarding_completed) then
    raise exception 'Active account required';
  end if;
  insert into public.communities(name, slug, description, created_by)
  values (trim(p_name), lower(trim(p_slug)), nullif(trim(p_description), ''), actor) returning id into new_id;
  insert into public.community_members(community_id, user_id, role) values (new_id, actor, 'captain');
  return new_id;
end;
$$;
revoke all on function public.create_community(text,text,text) from public;
grant execute on function public.create_community(text,text,text) to authenticated;

create or replace function public.assign_community_member(p_community_id uuid, p_user_id uuid, p_role text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_community_captain(p_community_id) then raise exception 'Captain access required'; end if;
  if p_role not in ('captain', 'moderator', 'member') then raise exception 'Invalid community role'; end if;
  if not exists (select 1 from public.profiles where id = p_user_id and account_status = 'active') then raise exception 'User unavailable'; end if;
  insert into public.community_members(community_id, user_id, role) values (p_community_id, p_user_id, p_role)
    on conflict (community_id, user_id) do update set role = excluded.role, status = 'active';
end;
$$;
revoke all on function public.assign_community_member(uuid,uuid,text) from public;
grant execute on function public.assign_community_member(uuid,uuid,text) to authenticated;

create or replace function public.assign_community_member_by_email(p_community_id uuid, p_email text, p_role text)
returns text language plpgsql security definer set search_path = '' as $$
declare target_user uuid;
begin
  if not public.is_community_captain(p_community_id) then raise exception 'Captain access required'; end if;
  select id into target_user from auth.users where lower(email) = lower(trim(p_email)) and email_confirmed_at is not null limit 1;
  if target_user is null then return 'not_found'; end if;
  perform public.assign_community_member(p_community_id, target_user, p_role);
  return 'assigned';
end;
$$;
revoke all on function public.assign_community_member_by_email(uuid,text,text) from public;
grant execute on function public.assign_community_member_by_email(uuid,text,text) to authenticated;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text, status text not null default 'planning' check (status in ('planning', 'active', 'completed', 'archived')),
  visibility text not null default 'public' check (visibility in ('public', 'private', 'unlisted')),
  created_by_user_id uuid not null references public.profiles(id),
  community_id uuid references public.communities(id),
  university_id uuid references public.organizations(id),
  company_id uuid references public.organizations(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (num_nonnulls(community_id, university_id, company_id) <= 1)
);
create index projects_community_idx on public.projects(community_id);
create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
alter table public.projects enable row level security;

create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('project_head', 'team_lead', 'member', 'mentor')),
  status text not null default 'active' check (status in ('active', 'removed')),
  joined_at timestamptz not null default now(),
  primary key(project_id, user_id)
);
create index project_members_user_idx on public.project_members(user_id);
alter table public.project_members enable row level security;

create or replace function public.is_project_head(p_project_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.project_members m join public.profiles p on p.id = m.user_id
    where m.project_id = p_project_id and m.user_id = (select auth.uid())
      and m.role = 'project_head' and m.status = 'active' and p.account_status = 'active');
$$;
revoke all on function public.is_project_head(uuid) from public;
grant execute on function public.is_project_head(uuid) to authenticated;

create policy projects_read on public.projects for select to authenticated
  using (visibility <> 'private' or exists (select 1 from public.project_members m
    where m.project_id = id and m.user_id = (select auth.uid()) and m.status = 'active'));
create policy projects_update_head on public.projects for update to authenticated
  using (public.is_project_head(id)) with check (public.is_project_head(id));
create policy project_members_read on public.project_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_project_head(project_id));

create or replace function public.create_project(p_title text, p_slug text, p_description text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := (select auth.uid());
  new_id uuid;
begin
  if actor is null or not exists (select 1 from public.profiles where id = actor and account_status = 'active' and onboarding_completed) then
    raise exception 'Active account required';
  end if;
  insert into public.projects(title, slug, description, created_by_user_id)
  values (trim(p_title), lower(trim(p_slug)), nullif(trim(p_description), ''), actor) returning id into new_id;
  insert into public.project_members(project_id, user_id, role) values (new_id, actor, 'project_head');
  return new_id;
end;
$$;
revoke all on function public.create_project(text,text,text) from public;
grant execute on function public.create_project(text,text,text) to authenticated;

create or replace function public.assign_project_member(p_project_id uuid, p_user_id uuid, p_role text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_project_head(p_project_id) then raise exception 'Project Head access required'; end if;
  if p_role not in ('project_head', 'team_lead', 'member', 'mentor') then raise exception 'Invalid project role'; end if;
  if not exists (select 1 from public.profiles where id = p_user_id and account_status = 'active') then raise exception 'User unavailable'; end if;
  insert into public.project_members(project_id, user_id, role) values (p_project_id, p_user_id, p_role)
    on conflict (project_id, user_id) do update set role = excluded.role, status = 'active';
end;
$$;
revoke all on function public.assign_project_member(uuid,uuid,text) from public;
grant execute on function public.assign_project_member(uuid,uuid,text) to authenticated;

create or replace function public.assign_project_member_by_email(p_project_id uuid, p_email text, p_role text)
returns text language plpgsql security definer set search_path = '' as $$
declare target_user uuid;
begin
  if not public.is_project_head(p_project_id) then raise exception 'Project Head access required'; end if;
  select id into target_user from auth.users where lower(email) = lower(trim(p_email)) and email_confirmed_at is not null limit 1;
  if target_user is null then return 'not_found'; end if;
  perform public.assign_project_member(p_project_id, target_user, p_role);
  return 'assigned';
end;
$$;
revoke all on function public.assign_project_member_by_email(uuid,text,text) from public;
grant execute on function public.assign_project_member_by_email(uuid,text,text) to authenticated;

-- Owners cannot change immutable ownership columns through ordinary UPDATE policies.
create or replace function public.protect_context_owner()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'communities' and new.created_by is distinct from old.created_by then
    raise exception 'Community owner cannot be changed';
  end if;
  if tg_table_name = 'projects' and (new.created_by_user_id is distinct from old.created_by_user_id
      or new.community_id is distinct from old.community_id or new.university_id is distinct from old.university_id
      or new.company_id is distinct from old.company_id) then
    raise exception 'Project ownership cannot be changed';
  end if;
  return new;
end;
$$;
create trigger communities_protect_owner before update on public.communities
  for each row execute function public.protect_context_owner();
create trigger projects_protect_owner before update on public.projects
  for each row execute function public.protect_context_owner();
