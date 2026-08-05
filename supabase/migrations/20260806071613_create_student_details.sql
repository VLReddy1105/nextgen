-- Role-specific extension of profiles for users with role = 'student'.
--
-- Modelled as a separate 1:1 table rather than nullable columns on profiles so
-- that the other roles (founder, mentor, company_representative, ...) can get
-- their own detail tables later without widening profiles each time.

create table public.student_details (
  profile_id      uuid primary key references public.profiles (id) on delete cascade,
  university      text,
  field_of_study  text,
  degree_level    text,
  graduation_year smallint check (graduation_year between 1950 and 2100),
  skills          text[] not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.student_details is
  'Academic detail for student profiles. profile_id is both PK and FK, enforcing at most one row per profile.';

create index student_details_university_idx on public.student_details (university);

create trigger student_details_set_updated_at
  before update on public.student_details
  for each row execute function public.set_updated_at();

alter table public.student_details enable row level security;
