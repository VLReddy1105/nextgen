-- Additive Student Data Core extension. Existing skills/interests remain authoritative.
alter table public.student_details add column workspace_profile jsonb not null default '{}'::jsonb;
alter table public.student_details add column resume_path text;

create function public.workspace_ready(p_role text default null)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p join auth.users u on u.id=p.id
 where p.id=auth.uid() and p.account_status='active' and p.onboarding_completed
 and u.email_confirmed_at is not null and (p_role is null or p.primary_role::text=p_role));
$$;
revoke all on function public.workspace_ready(text) from public;
grant execute on function public.workspace_ready(text) to authenticated;

create function public.update_student_workspace_profile(p_data jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if not public.workspace_ready('student') then raise exception 'Student access required' using errcode='42501'; end if;
  if coalesce(length(trim(p_data->>'full_name')),0) not between 2 and 160 or length(p_data::text)>40000 then
    raise exception 'Invalid profile';
  end if;
  if jsonb_array_length(coalesce(p_data->'skills','[]'))>20 or jsonb_array_length(coalesce(p_data->'interests','[]'))>20 then
    raise exception 'Too many tags';
  end if;
  update public.profiles set full_name=trim(p_data->>'full_name'), headline=nullif(p_data->>'headline','') where id=actor;
  insert into public.student_details(profile_id,field_of_study,degree_level,graduation_year,skills,interests,bio,portfolio_url,linkedin_url,github_url,workspace_profile)
  values(actor,p_data->>'field_of_study',p_data->>'degree_level',(p_data->>'graduation_year')::smallint,
    array(select distinct lower(trim(value)) from jsonb_array_elements_text(p_data->'skills')),
    array(select distinct lower(trim(value)) from jsonb_array_elements_text(p_data->'interests')),
    p_data->>'bio',p_data->>'portfolio_url',p_data->>'linkedin_url',p_data->>'github_url',
    p_data - array['full_name','headline','field_of_study','degree_level','graduation_year','skills','interests','bio','portfolio_url','linkedin_url','github_url','resume_path','primary_role','account_status','university_ids'])
  on conflict(profile_id) do update set field_of_study=excluded.field_of_study,degree_level=excluded.degree_level,
    graduation_year=excluded.graduation_year,skills=excluded.skills,interests=excluded.interests,bio=excluded.bio,
    portfolio_url=excluded.portfolio_url,linkedin_url=excluded.linkedin_url,github_url=excluded.github_url,workspace_profile=excluded.workspace_profile;
end;
$$;
revoke all on function public.update_student_workspace_profile(jsonb) from public;
grant execute on function public.update_student_workspace_profile(jsonb) to authenticated;
