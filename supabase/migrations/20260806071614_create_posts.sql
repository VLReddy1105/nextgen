-- Community posts with an admin approval flow.
--
-- Lifecycle: author inserts (status = 'pending') -> platform admin sets
-- 'approved' or 'rejected'. Only 'approved' posts are world-readable; see the
-- policies migration.

create table public.posts (
  id               uuid primary key default gen_random_uuid(),
  author_id        uuid not null references public.profiles (id) on delete cascade,
  organization_id  uuid references public.organizations (id) on delete set null,
  title            text not null check (length(trim(title)) > 0),
  body             text not null check (length(trim(body)) > 0),
  status           public.post_status not null default 'pending',
  reviewed_by      uuid references public.profiles (id) on delete set null,
  reviewed_at      timestamptz,
  rejection_reason text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on column public.posts.organization_id is
  'Optional. Set when the post is published on behalf of an organization rather than the author personally.';

-- Main read path: approved posts, newest first.
create index posts_status_created_at_idx on public.posts (status, created_at desc);
create index posts_author_id_idx on public.posts (author_id);
create index posts_organization_id_idx on public.posts (organization_id);

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- Review-field guard
-- ---------------------------------------------------------------------------
-- The author needs UPDATE on their own row to fix a typo or rewrite a rejected
-- post. Without this trigger that same UPDATE would let them set
-- status = 'approved' and publish themselves. Non-admins therefore get every
-- review-controlled column reverted to its previous value.
--
-- When an admin does change the status, reviewed_by / reviewed_at are stamped
-- from the server rather than trusted from the request body.

create or replace function public.enforce_post_review_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- null uid means service_role / server-side; treated as trusted.
  acting_admin boolean := (select auth.uid()) is null or public.is_platform_admin();
begin
  if not acting_admin then
    new.status           := old.status;
    new.reviewed_by      := old.reviewed_by;
    new.reviewed_at      := old.reviewed_at;
    new.rejection_reason := old.rejection_reason;
  elsif new.status is distinct from old.status then
    new.reviewed_by := (select auth.uid());
    new.reviewed_at := now();
  end if;
  return new;
end;
$$;

create trigger posts_enforce_review_fields
  before update on public.posts
  for each row execute function public.enforce_post_review_fields();

alter table public.posts enable row level security;
