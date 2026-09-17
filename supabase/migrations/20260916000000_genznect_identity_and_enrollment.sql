-- Extend the existing Auth -> profiles and organizations model in place.
create type public.primary_account_role as enum ('student', 'founder', 'university', 'company', 'mentor');

alter table public.profiles
  add column primary_role public.primary_account_role,
  add column onboarding_completed boolean not null default false,
  add column account_status text not null default 'active'
    check (account_status in ('active', 'pending', 'suspended', 'disabled'));

-- The old Auth trigger did not recognize "university" and "company" metadata:
-- it created a legacy Student profile for those signups. Recover that selected
-- identity only for those two values; official organization verification remains
-- a separate, privileged decision.
update public.profiles p set
  primary_role = case
    when p.role = 'student' and u.raw_user_meta_data ->> 'role' in ('university', 'company')
      then (u.raw_user_meta_data ->> 'role')::public.primary_account_role
    when p.role = 'student' then 'student'::public.primary_account_role
    when p.role = 'founder' then 'founder'::public.primary_account_role
    when p.role = 'mentor' then 'mentor'::public.primary_account_role
    when p.role = 'university_representative' then 'university'::public.primary_account_role
    when p.role = 'company_representative' then 'company'::public.primary_account_role
    else null end,
  role = case
    when p.role = 'student' and u.raw_user_meta_data ->> 'role' = 'university'
      then 'university_representative'::public.user_role
    when p.role = 'student' and u.raw_user_meta_data ->> 'role' = 'company'
      then 'company_representative'::public.user_role
    else p.role end
from auth.users u where u.id = p.id;

-- Repair older Auth accounts that predate the profile trigger without touching identities.
insert into public.profiles(id, role, primary_role, full_name)
select u.id, 'student'::public.user_role, null,
  nullif(trim(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')), '')
from auth.users u left join public.profiles p on p.id = u.id where p.id is null;

create index profiles_primary_role_idx on public.profiles (primary_role);
-- Profiles are created by the Auth trigger and repaired by the backfill, never by clients.
drop policy profiles_insert_own on public.profiles;

create or replace function public.enforce_profile_identity()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null and not public.is_platform_admin() then
    if new.primary_role is distinct from old.primary_role
      and current_setting('app.genznect_finish_onboarding', true) is distinct from 'true' then
      raise exception 'Primary role cannot be changed';
    end if;
    if new.onboarding_completed is distinct from old.onboarding_completed
      and current_setting('app.genznect_finish_onboarding', true) is distinct from 'true' then
      raise exception 'Onboarding must be completed through the server workflow';
    end if;
    if new.account_status is distinct from old.account_status then
      raise exception 'Account status cannot be changed';
    end if;
  end if;
  return new;
end;
$$;
create trigger profiles_enforce_identity before update on public.profiles
  for each row execute function public.enforce_profile_identity();

-- Signup metadata is untrusted: accept exactly the five public roles.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare requested text := new.raw_user_meta_data ->> 'role';
  primary_value public.primary_account_role;
  legacy_value public.user_role := 'student';
begin
  if requested in ('student', 'founder', 'university', 'company', 'mentor') then
    primary_value := requested::public.primary_account_role;
  end if;
  legacy_value := case primary_value
    when 'founder' then 'founder'::public.user_role
    when 'mentor' then 'mentor'::public.user_role
    when 'university' then 'university_representative'::public.user_role
    when 'company' then 'company_representative'::public.user_role
    else 'student'::public.user_role end;
  insert into public.profiles (id, role, primary_role, full_name, avatar_url)
  values (new.id, legacy_value, primary_value,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture', '')), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

alter table public.student_details
  add column if not exists bio text,
  add column if not exists country text,
  add column if not exists city text,
  add column if not exists interests text[] not null default '{}',
  add column if not exists portfolio_url text,
  add column if not exists linkedin_url text,
  add column if not exists github_url text;
comment on column public.student_details.university is 'Legacy free-text field; university affiliation is determined only by university_student_memberships.';
create or replace function public.protect_legacy_student_university()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is not null then
    if tg_op = 'INSERT' then
      if new.university is not null then raise exception 'University affiliation is managed by the University'; end if;
    elsif new.university is distinct from old.university then
      raise exception 'University affiliation is managed by the University';
    end if;
  end if;
  return new;
end;
$$;
create trigger student_details_protect_legacy_university before insert or update on public.student_details
  for each row execute function public.protect_legacy_student_university();
drop policy student_details_insert_own on public.student_details;
create policy student_details_insert_own on public.student_details for insert to authenticated
  with check (profile_id = (select auth.uid()) and exists (select 1 from public.profiles p
    where p.id = profile_id and p.primary_role = 'student'));

create table public.founder_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  headline text, bio text, location text, linkedin_url text, website_url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create trigger founder_profiles_set_updated_at before update on public.founder_profiles
  for each row execute function public.set_updated_at();
alter table public.founder_profiles enable row level security;
create policy founder_profiles_read on public.founder_profiles for select to authenticated using (true);
create policy founder_profiles_insert on public.founder_profiles for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.id = user_id and p.primary_role = 'founder'));
create policy founder_profiles_update on public.founder_profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table public.mentor_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  headline text, bio text, current_position text, company text, expertise text[] not null default '{}',
  availability_status text not null default 'unavailable',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create trigger mentor_profiles_set_updated_at before update on public.mentor_profiles
  for each row execute function public.set_updated_at();
alter table public.mentor_profiles enable row level security;
create policy mentor_profiles_read on public.mentor_profiles for select to authenticated using (true);
create policy mentor_profiles_insert on public.mentor_profiles for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.id = user_id and p.primary_role = 'mentor'));
create policy mentor_profiles_update on public.mentor_profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Reuse organizations instead of creating a competing universities/companies table.
alter table public.organizations
  add column slug text,
  add column official_account boolean not null default false,
  add column country text,
  add column city text,
  add column email_domain text;
create unique index organizations_slug_unique on public.organizations (lower(slug)) where slug is not null;
create unique index organizations_official_owner_unique on public.organizations (created_by)
  where official_account and type in ('university', 'company');
create or replace function public.protect_official_organization()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null and not public.is_platform_admin() then
    if new.type is distinct from old.type or new.created_by is distinct from old.created_by
      or (new.official_account is distinct from old.official_account
        and current_setting('app.genznect_onboarding_org', true) is distinct from 'true') then
      raise exception 'Organization ownership and type cannot be changed';
    end if;
    if old.verified and old.official_account and
      (new.name is distinct from old.name or new.website is distinct from old.website
        or new.email_domain is distinct from old.email_domain) then
      raise exception 'Verified organization identity changes require platform review';
    end if;
  end if;
  return new;
end;
$$;
create trigger organizations_protect_official before update on public.organizations
  for each row execute function public.protect_official_organization();
drop policy organizations_insert_own on public.organizations;
create policy organizations_insert_own on public.organizations for insert to authenticated
  with check (created_by = (select auth.uid()) and not official_account and not verified);
drop policy organizations_delete_own on public.organizations;
create policy organizations_delete_own on public.organizations for delete to authenticated
  using (created_by = (select auth.uid()) and not official_account);

-- Atomic onboarding; never trust a client-side "complete" flag or organization ownership.
create or replace function public.finish_onboarding(
  p_role public.primary_account_role, p_name text, p_headline text default null,
  p_organization_name text default null, p_website text default null,
  p_field_of_study text default null, p_degree text default null,
  p_skills text[] default '{}', p_interests text[] default '{}',
  p_portfolio_url text default null, p_linkedin_url text default null, p_github_url text default null,
  p_expertise text[] default '{}'
) returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid := (select auth.uid());
  existing_primary_role public.primary_account_role;
  existing_account_status text;
  org_type public.organization_type;
  existing_org uuid;
begin
  if actor is null then raise exception 'Authentication required'; end if;
  if p_role is null then raise exception 'Choose a primary role'; end if;
  select primary_role, account_status into existing_primary_role, existing_account_status
    from public.profiles where id = actor for update;
  if not found then raise exception 'Profile unavailable'; end if;
  if existing_account_status <> 'active' then raise exception 'Active account required'; end if;
  if existing_primary_role is not null and existing_primary_role <> p_role then raise exception 'Primary role is already set'; end if;
  if nullif(trim(p_name), '') is null or length(trim(p_name)) > 160 then raise exception 'Enter a valid name'; end if;
  if p_role in ('university', 'company') and (nullif(trim(p_organization_name), '') is null or length(trim(p_organization_name)) > 160) then
    raise exception 'Organization name is required';
  end if;
  if coalesce(array_length(p_skills, 1), 0) > 20 or coalesce(array_length(p_interests, 1), 0) > 20
    or coalesce(array_length(p_expertise, 1), 0) > 20 then raise exception 'Too many topics'; end if;
  if (select coalesce(bool_or(length(item) > 80), false) from unnest(coalesce(p_skills, '{}') || coalesce(p_interests, '{}') || coalesce(p_expertise, '{}')) item) then
    raise exception 'Topic is too long';
  end if;
  if (p_portfolio_url is not null and (p_portfolio_url !~ '^https?://' or length(p_portfolio_url) > 2048))
    or (p_linkedin_url is not null and (p_linkedin_url !~ '^https?://' or length(p_linkedin_url) > 2048))
    or (p_github_url is not null and (p_github_url !~ '^https?://' or length(p_github_url) > 2048)) then
    raise exception 'Invalid profile URL';
  end if;
  perform set_config('app.genznect_finish_onboarding', 'true', true);
  update public.profiles set primary_role = p_role, full_name = trim(p_name), headline = nullif(trim(p_headline), ''),
    onboarding_completed = true where id = actor;
  if p_role = 'student' then
    insert into public.student_details(profile_id, field_of_study, degree_level, skills, interests, portfolio_url, linkedin_url, github_url)
    values (actor, nullif(trim(p_field_of_study), ''), nullif(trim(p_degree), ''), coalesce(p_skills, '{}'), coalesce(p_interests, '{}'),
      nullif(trim(p_portfolio_url), ''), nullif(trim(p_linkedin_url), ''), nullif(trim(p_github_url), ''))
    on conflict (profile_id) do update set field_of_study = excluded.field_of_study, degree_level = excluded.degree_level,
      skills = excluded.skills, interests = excluded.interests, portfolio_url = excluded.portfolio_url,
      linkedin_url = excluded.linkedin_url, github_url = excluded.github_url;
  elsif p_role = 'founder' then
    insert into public.founder_profiles(user_id, headline) values (actor, nullif(trim(p_headline), ''))
    on conflict (user_id) do update set headline = excluded.headline;
  elsif p_role = 'mentor' then
    insert into public.mentor_profiles(user_id, headline, expertise)
    values (actor, nullif(trim(p_headline), ''), coalesce(p_expertise, '{}'))
    on conflict (user_id) do update set headline = excluded.headline, expertise = excluded.expertise;
  else
    org_type := case p_role when 'university' then 'university'::public.organization_type else 'company'::public.organization_type end;
    select id into existing_org from public.organizations where created_by = actor and type = org_type
      order by official_account desc, created_at asc limit 1;
    if existing_org is not null then
      perform set_config('app.genznect_onboarding_org', 'true', true);
      update public.organizations set official_account = true, name = trim(p_organization_name),
        website = coalesce(nullif(trim(p_website), ''), website) where id = existing_org;
    else
      insert into public.organizations(name, type, website, created_by, official_account)
      values (trim(p_organization_name), org_type, nullif(trim(p_website), ''), actor, true);
    end if;
  end if;
end;
$$;
revoke all on function public.finish_onboarding(public.primary_account_role,text,text,text,text,text,text,text[],text[],text,text,text,text[]) from public;
grant execute on function public.finish_onboarding(public.primary_account_role,text,text,text,text,text,text,text[],text[],text,text,text,text[]) to authenticated;

create type public.university_membership_status as enum ('active', 'revoked', 'graduated');
create type public.university_invitation_status as enum ('pending', 'accepted', 'cancelled');

create table public.university_student_invitations (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.organizations(id) on delete cascade,
  email text not null check (email = lower(trim(email)) and email ~ '^[^@ ]+@[^@ ]+\.[^@ ]+$'),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  status public.university_invitation_status not null default 'pending',
  student_name text, student_identifier text, program text, department text,
  expires_at timestamptz not null,
  created_by uuid not null references public.profiles(id),
  accepted_by_user_id uuid references public.profiles(id), accepted_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index university_pending_invitation_unique on public.university_student_invitations(university_id, email) where status = 'pending';
create index university_invitations_email_idx on public.university_student_invitations(email, status);
create trigger university_invitations_updated_at before update on public.university_student_invitations
  for each row execute function public.set_updated_at();
alter table public.university_student_invitations enable row level security;

create table public.university_student_memberships (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.organizations(id) on delete cascade,
  student_user_id uuid not null references public.profiles(id) on delete cascade,
  status public.university_membership_status not null default 'active',
  student_identifier text, program text, department text,
  enrolled_by uuid references public.profiles(id),
  invitation_id uuid references public.university_student_invitations(id),
  joined_at timestamptz not null default now(), verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(university_id, student_user_id)
);
create index university_memberships_student_idx on public.university_student_memberships(student_user_id, status);
create index university_memberships_university_idx on public.university_student_memberships(university_id, status);
create trigger university_memberships_updated_at before update on public.university_student_memberships
  for each row execute function public.set_updated_at();
alter table public.university_student_memberships enable row level security;

create or replace function public.can_manage_university(p_university_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.organizations o join public.profiles p on p.id = o.created_by
    where o.id = p_university_id and o.type = 'university' and o.official_account
      and o.verified and o.created_by = (select auth.uid())
      and p.primary_role = 'university' and p.account_status = 'active');
$$;
revoke all on function public.can_manage_university(uuid) from public;
grant execute on function public.can_manage_university(uuid) to authenticated;

create policy university_memberships_read on public.university_student_memberships for select to authenticated
  using (student_user_id = (select auth.uid()) or public.can_manage_university(university_id));
create policy university_invitations_read on public.university_student_invitations for select to authenticated
  using (public.can_manage_university(university_id));
-- No client INSERT/UPDATE/DELETE policy on either relationship table.

create or replace function public.enroll_university_student(
  p_university_id uuid, p_email text, p_token_hash text,
  p_student_name text default null, p_student_identifier text default null,
  p_program text default null, p_department text default null
) returns text language plpgsql security definer set search_path = '' as $$
declare actor uuid := (select auth.uid());
  normalized_email text := lower(trim(p_email));
  student_id uuid;
  student_role public.primary_account_role;
  current_status public.university_membership_status;
begin
  if not public.can_manage_university(p_university_id) then raise exception 'University access denied'; end if;
  if normalized_email !~ '^[^@ ]+@[^@ ]+\.[^@ ]+$' or length(normalized_email) > 320 then raise exception 'Invalid email address'; end if;
  if p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'Invalid invitation token hash'; end if;
  select u.id, p.primary_role into student_id, student_role
    from auth.users u left join public.profiles p on p.id = u.id
    where lower(u.email) = normalized_email and u.email_confirmed_at is not null limit 1;
  if student_id is not null then
    if student_role is distinct from 'student' or not exists
      (select 1 from public.profiles where id = student_id and account_status = 'active') then
      return 'not_student';
    end if;
    select status into current_status from public.university_student_memberships
      where university_id = p_university_id and student_user_id = student_id for update;
    if current_status = 'active' then return 'already_enrolled'; end if;
    insert into public.university_student_memberships
      (university_id, student_user_id, student_identifier, program, department, enrolled_by)
    values (p_university_id, student_id, nullif(trim(p_student_identifier), ''), nullif(trim(p_program), ''), nullif(trim(p_department), ''), actor)
    on conflict (university_id, student_user_id) do update set status = 'active',
      student_identifier = excluded.student_identifier, program = excluded.program,
      department = excluded.department, enrolled_by = actor, joined_at = now(), verified_at = now();
    update public.university_student_invitations set status = 'cancelled'
      where university_id = p_university_id and email = normalized_email and status = 'pending';
    return 'enrolled';
  end if;
  insert into public.university_student_invitations
    (university_id, email, token_hash, student_name, student_identifier, program, department, expires_at, created_by)
  values (p_university_id, normalized_email, p_token_hash, nullif(trim(p_student_name), ''),
    nullif(trim(p_student_identifier), ''), nullif(trim(p_program), ''), nullif(trim(p_department), ''),
    now() + interval '7 days', actor)
  on conflict (university_id, email) where status = 'pending' do update
    set token_hash = excluded.token_hash, expires_at = excluded.expires_at,
      student_name = excluded.student_name, student_identifier = excluded.student_identifier,
      program = excluded.program, department = excluded.department, created_by = actor;
  return 'invited';
end;
$$;
revoke all on function public.enroll_university_student(uuid,text,text,text,text,text,text) from public;
grant execute on function public.enroll_university_student(uuid,text,text,text,text,text,text) to authenticated;

create or replace function public.accept_university_invitation(p_token_hash text)
returns text language plpgsql security definer set search_path = '' as $$
declare actor uuid := (select auth.uid());
  verified_email text;
  inv public.university_student_invitations%rowtype;
begin
  if actor is null then raise exception 'Authentication required'; end if;
  select lower(email) into verified_email from auth.users where id = actor and email_confirmed_at is not null;
  if verified_email is null or not exists (select 1 from public.profiles
      where id = actor and primary_role = 'student' and account_status = 'active') then
    raise exception 'A confirmed Student account is required';
  end if;
  select * into inv from public.university_student_invitations
    where token_hash = p_token_hash for update;
  if not found or inv.email <> verified_email then raise exception 'Invitation is invalid or expired'; end if;
  if inv.status = 'accepted' and inv.accepted_by_user_id = actor then return 'accepted'; end if;
  if inv.status <> 'pending' or inv.expires_at <= now() then raise exception 'Invitation is invalid or expired'; end if;
  if not exists (select 1 from public.organizations o join public.profiles p on p.id = o.created_by
      where o.id = inv.university_id and o.type = 'university' and o.official_account
        and o.verified and p.primary_role = 'university' and p.account_status = 'active') then
    raise exception 'Inviting University is no longer active';
  end if;
  insert into public.university_student_memberships
    (university_id, student_user_id, student_identifier, program, department, enrolled_by, invitation_id)
  values (inv.university_id, actor, inv.student_identifier, inv.program, inv.department, inv.created_by, inv.id)
  on conflict (university_id, student_user_id) do update set status = 'active',
    student_identifier = excluded.student_identifier, program = excluded.program,
    department = excluded.department, invitation_id = excluded.invitation_id,
    joined_at = now(), verified_at = now();
  update public.university_student_invitations set status = 'accepted', accepted_by_user_id = actor,
    accepted_at = now() where id = inv.id;
  return 'accepted';
end;
$$;
revoke all on function public.accept_university_invitation(text) from public;
grant execute on function public.accept_university_invitation(text) to authenticated;

create or replace function public.revoke_university_student(p_university_id uuid, p_student_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_manage_university(p_university_id) then raise exception 'University access denied'; end if;
  update public.university_student_memberships set status = 'revoked'
    where university_id = p_university_id and student_user_id = p_student_user_id;
end;
$$;
revoke all on function public.revoke_university_student(uuid,uuid) from public;
grant execute on function public.revoke_university_student(uuid,uuid) to authenticated;

create or replace function public.cancel_university_invitation(p_university_id uuid, p_invitation_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_manage_university(p_university_id) then raise exception 'University access denied'; end if;
  update public.university_student_invitations set status = 'cancelled'
    where id = p_invitation_id and university_id = p_university_id and status = 'pending';
end;
$$;
revoke all on function public.cancel_university_invitation(uuid,uuid) from public;
grant execute on function public.cancel_university_invitation(uuid,uuid) to authenticated;

create or replace function public.list_university_students(p_university_id uuid)
returns table (student_user_id uuid, full_name text, email text, program text, department text,
  student_identifier text, status public.university_membership_status, joined_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.can_manage_university(p_university_id) then raise exception 'University access denied'; end if;
  return query select m.student_user_id, p.full_name, u.email::text, m.program, m.department,
    m.student_identifier, m.status, m.joined_at
    from public.university_student_memberships m
    join public.profiles p on p.id = m.student_user_id
    join auth.users u on u.id = m.student_user_id
    where m.university_id = p_university_id order by m.joined_at desc;
end;
$$;
revoke all on function public.list_university_students(uuid) from public;
grant execute on function public.list_university_students(uuid) to authenticated;
