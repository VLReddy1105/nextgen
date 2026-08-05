-- Automatically create a public.profiles row whenever a user signs up.
--
-- The role is read from signup metadata, i.e. the `data` object passed to
-- supabase.auth.signUp({ email, password, options: { data: { role, full_name } } }).
--
-- SECURITY NOTE: raw_user_meta_data is entirely client-controlled. Anyone can
-- post arbitrary JSON to /auth/v1/signup. Two consequences are handled below:
--
--   1. The role string is validated against the enum instead of being cast
--      blindly -- a bad value would otherwise raise and break signup outright.
--   2. 'platform_admin' is never accepted from metadata. Self-service admin
--      signup would defeat every admin policy in this schema. Admins must be
--      promoted deliberately (service_role, or by an existing admin).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text := new.raw_user_meta_data ->> 'role';
  resolved_role  public.user_role := 'student';
begin
  if requested_role is not null
     and requested_role <> 'platform_admin'
     and requested_role = any (enum_range(null::public.user_role)::text[])
  then
    resolved_role := requested_role::public.user_role;
  end if;

  insert into public.profiles (id, role, full_name, avatar_url)
  values (
    new.id,
    resolved_role,
    -- SignupForm posts a `name` field; `full_name` is what OAuth providers send.
    nullif(trim(coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      ''
    )), ''),
    nullif(trim(coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture',
      ''
    )), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
