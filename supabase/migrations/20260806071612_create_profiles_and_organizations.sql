-- Core identity tables: profiles (1:1 with auth.users) and organizations.
--
-- RLS is enabled here but no policies are added until the final migration.
-- An RLS-enabled table with no policies denies everything, so there is never a
-- point in the migration sequence where these tables are readable unguarded.

-- Shared helper: keeps updated_at honest without trusting the client.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        public.user_role not null default 'student',
  full_name   text,
  headline    text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Public profile for each auth.users row. Created automatically by the on_auth_user_created trigger.';

create index profiles_role_idx on public.profiles (role);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;


-- ---------------------------------------------------------------------------
-- is_platform_admin()
-- ---------------------------------------------------------------------------
-- Used by policies on every table. SECURITY DEFINER is required, not optional:
-- a policy on public.profiles that reads public.profiles would recurse
-- infinitely. A definer function bypasses RLS on the tables it touches, which
-- breaks the cycle. search_path is pinned to '' so the body cannot be hijacked
-- by a caller-supplied search_path.

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'platform_admin'
  );
$$;

revoke execute on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated, service_role;


-- ---------------------------------------------------------------------------
-- Privilege-escalation guard on profiles.role
-- ---------------------------------------------------------------------------
-- "Writable only by the owner" would otherwise let any user PATCH their own
-- row and set role = 'platform_admin', which would hand them the admin post
-- policies below. This trigger silently reverts role changes made by anyone
-- who is not already a platform admin.
--
-- auth.uid() is null for service_role / server-side connections; those are
-- trusted and allowed through so back-office code can still promote users.

create or replace function public.enforce_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and (select auth.uid()) is not null
     and not public.is_platform_admin()
  then
    new.role := old.role;
  end if;
  return new;
end;
$$;

create trigger profiles_enforce_role_change
  before update on public.profiles
  for each row execute function public.enforce_profile_role_change();


-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------

create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  type        public.organization_type not null,
  description text,
  website     text,
  logo_url    text,
  verified    boolean not null default false,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on column public.organizations.verified is
  'Set by platform admins only. Members cannot self-verify.';

create index organizations_created_by_idx on public.organizations (created_by);
create index organizations_type_idx on public.organizations (type);

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- Same shape as the profiles.role guard: the owner may edit their organization
-- but may not flip its verified badge on.
create or replace function public.enforce_organization_verified_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.verified is distinct from old.verified
     and (select auth.uid()) is not null
     and not public.is_platform_admin()
  then
    new.verified := old.verified;
  end if;
  return new;
end;
$$;

create trigger organizations_enforce_verified_change
  before update on public.organizations
  for each row execute function public.enforce_organization_verified_change();

alter table public.organizations enable row level security;
