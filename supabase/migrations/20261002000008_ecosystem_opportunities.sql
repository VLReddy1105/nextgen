alter table public.opportunities add column nice_to_have text[] not null default '{}';
alter table public.opportunities add column openings integer not null default 1 check(openings between 1 and 10000);
alter table public.opportunities add column eligibility jsonb not null default '{}';
alter table public.opportunities add column updated_at timestamptz not null default now();
alter table public.opportunities drop constraint opportunities_status_check;
alter table public.opportunities add constraint opportunities_status_check check(status in ('published','disabled','draft','closed'));
create trigger opportunities_updated before update on public.opportunities for each row execute function public.set_updated_at();

create function public.eco_eligible(p_university uuid,p_rules jsonb,p_user uuid default auth.uid()) returns boolean language plpgsql stable security definer set search_path='' as $$
declare v_student public.student_details; v_member public.university_student_memberships; begin
 if not exists(select 1 from public.profiles p join auth.users u on u.id=p.id where p.id=p_user and p.primary_role='student' and p.account_status='active' and p.onboarding_completed and u.email_confirmed_at is not null) then return false; end if;
 select * into v_student from public.student_details where profile_id=p_user;
 if p_university is not null then select * into v_member from public.university_student_memberships where university_id=p_university and student_user_id=p_user and status='active'; if v_member.id is null then return false; end if; end if;
 if jsonb_array_length(coalesce(p_rules->'programs','[]'))>0 and not exists(select 1 from jsonb_array_elements_text(p_rules->'programs') x where lower(x)=lower(coalesce(v_member.program,v_student.field_of_study,''))) then return false; end if;
 if jsonb_array_length(coalesce(p_rules->'years','[]'))>0 and not exists(select 1 from jsonb_array_elements_text(p_rules->'years') x where x=coalesce(v_student.workspace_profile->>'current_year','')) then return false; end if;
 if jsonb_array_length(coalesce(p_rules->'graduation_years','[]'))>0 and not exists(select 1 from jsonb_array_elements_text(p_rules->'graduation_years') x where x=v_student.graduation_year::text) then return false; end if;
 if jsonb_array_length(coalesce(p_rules->'skills','[]'))>0 and exists(select 1 from jsonb_array_elements_text(p_rules->'skills') x where not exists(select 1 from unnest(v_student.skills) s where lower(s)=lower(x))) then return false; end if;
 return true;
end; $$;
drop policy opportunities_read on public.opportunities;
create policy opportunities_read on public.opportunities for select to authenticated using(public.workspace_ready() and (created_by=auth.uid() or (status='published' and public.eco_eligible(university_id,eligibility))));

create function public.eco_opportunity_save(p_data jsonb,p_id uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid:=p_id; v_org uuid:=(p_data->>'organization_id')::uuid; v_uni uuid:=(p_data->>'university_id')::uuid; v_old public.opportunities; v_status text:=coalesce(p_data->>'status','draft'); v_user uuid; v_tags text[]; begin
 if not public.workspace_ready() or not exists(select 1 from public.profiles where id=auth.uid() and primary_role in ('company','university','founder')) or not exists(select 1 from public.organizations where id=v_org and created_by=auth.uid()) then raise exception 'Organization ownership required' using errcode='42501'; end if;
 if v_uni is not null and (v_uni<>v_org or not public.can_manage_university(v_uni)) then raise exception 'Verified university required' using errcode='42501'; end if;
 if exists(select 1 from public.organizations where id=v_org and type='university') and (v_uni is distinct from v_org or not public.can_manage_university(v_org)) then raise exception 'Verified campus context required' using errcode='42501'; end if;
 select array_agg(distinct lower(trim(value))) into v_tags from jsonb_array_elements_text(p_data->'tags');
 if v_status='published' and ((p_data->>'deadline')::timestamptz<=now() or coalesce(cardinality(v_tags),0)=0 or coalesce(length(trim(p_data->>'description')),0)<10 or (p_data->>'work_mode'<>'remote' and coalesce(length(trim(p_data->>'location')),0)=0)) then raise exception 'Complete required publishing fields'; end if;
 if p_id is not null then
  select * into v_old from public.opportunities where id=p_id for update;
  if v_old.created_by is distinct from auth.uid() or v_old.organization_id<>v_org or v_old.university_id is distinct from v_uni then raise exception 'Posting ownership required' using errcode='42501'; end if;
 end if;
 if v_id is null then
  insert into public.opportunities(title,description,organization_id,created_by,type,location,work_mode,experience,duration,tags,interests,roles,deadline,university_id,status,nice_to_have,openings,eligibility)
  values(p_data->>'title',p_data->>'description',v_org,auth.uid(),p_data->>'type',coalesce(p_data->>'location',''),p_data->>'work_mode',p_data->>'experience',p_data->>'duration',coalesce(v_tags,'{}'),array(select jsonb_array_elements_text(p_data->'interests')),array(select jsonb_array_elements_text(p_data->'roles')),(p_data->>'deadline')::timestamptz,v_uni,v_status,array(select jsonb_array_elements_text(p_data->'nice_to_have')),coalesce((p_data->>'openings')::integer,1),coalesce(p_data->'eligibility','{}')) returning id into v_id;
 else
  update public.opportunities set title=p_data->>'title',description=p_data->>'description',type=p_data->>'type',location=coalesce(p_data->>'location',''),work_mode=p_data->>'work_mode',experience=p_data->>'experience',duration=p_data->>'duration',tags=coalesce(v_tags,'{}'),interests=array(select jsonb_array_elements_text(p_data->'interests')),roles=array(select jsonb_array_elements_text(p_data->'roles')),deadline=(p_data->>'deadline')::timestamptz,status=v_status,nice_to_have=array(select jsonb_array_elements_text(p_data->'nice_to_have')),openings=coalesce((p_data->>'openings')::integer,1),eligibility=coalesce(p_data->'eligibility','{}') where id=v_id;
 end if;
 if v_status='published' and coalesce(v_old.status,'draft')<>'published' then
  for v_user in select s.profile_id from public.student_details s where public.eco_eligible(v_uni,coalesce(p_data->'eligibility','{}'),s.profile_id) and exists(select 1 from unnest(s.skills) x where lower(x)=any(v_tags)) loop
   perform public.workspace_notify(v_user,'opportunity_match','New opportunity: '||(p_data->>'title'),'opportunities',v_id,'/dashboard/opportunities/'||v_id,v_id||':published');
  end loop;
 end if;
 insert into public.ecosystem_activity(actor_id,source_module,source_entity_id,owner_user_id,message) values(auth.uid(),'opportunities',v_id,auth.uid(),'Opportunity '||v_status);
 return v_id;
end; $$;
create or replace function public.workspace_apply(p_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare v_result uuid; begin
 if not public.workspace_ready('student') then raise exception 'Student required' using errcode='42501'; end if;
 perform 1 from public.opportunities where id=p_id and status='published' and deadline>now() and public.eco_eligible(university_id,eligibility) for share;
 if not found then raise exception 'Opportunity unavailable or ineligible'; end if;
 insert into public.applications(student_id,opportunity_id) values(auth.uid(),p_id) returning id into v_result;
 insert into public.application_history(application_id,status,actor_id) values(v_result,'applied',auth.uid());return v_result;
end; $$;
create function public.eco_application_activity() returns trigger language plpgsql security definer set search_path='' as $$
declare v_owner uuid; v_title text; begin
 select created_by,title into v_owner,v_title from public.opportunities where id=new.opportunity_id;
 if tg_op='INSERT' then
  perform public.workspace_notify(v_owner,'application_submitted','New application for '||v_title,'applications',new.id,'/dashboard/applications/'||new.id,new.id||':submitted');
 elsif new.status='withdrawn' and old.status<>'withdrawn' then
  perform public.workspace_notify(v_owner,'application_withdrawn','An application was withdrawn for '||v_title,'applications',new.id,'/dashboard/applications/'||new.id,new.id||':withdrawn');
 end if;
 insert into public.ecosystem_activity(actor_id,source_module,source_entity_id,owner_user_id,message) values(coalesce(auth.uid(),new.student_id),'applications',new.id,v_owner,'Application '||new.status);return new;
end; $$;
create trigger application_ecosystem_activity after insert or update on public.applications for each row execute function public.eco_application_activity();
create function public.eco_applicant_summary(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_student uuid; begin
 select a.student_id into v_student from public.applications a join public.opportunities o on o.id=a.opportunity_id where a.id=p_id and (a.student_id=auth.uid() or o.created_by=auth.uid());
 if not public.workspace_ready() or v_student is null then raise exception 'Application access required' using errcode='42501'; end if;
 return (select jsonb_build_object('full_name',p.full_name,'headline',p.headline,'skills',s.skills,'degree_level',s.degree_level,'field_of_study',s.field_of_study,'graduation_year',s.graduation_year) from public.profiles p left join public.student_details s on s.profile_id=p.id where p.id=v_student);
end; $$;
drop policy preferences_insert on public.student_preferences;
drop policy preferences_update on public.student_preferences;
create policy preferences_insert on public.student_preferences for insert to authenticated with check(user_id=auth.uid() and public.workspace_ready());
create policy preferences_update on public.student_preferences for update to authenticated using(user_id=auth.uid() and public.workspace_ready()) with check(user_id=auth.uid());
revoke all on function public.eco_eligible(uuid,jsonb,uuid),public.eco_opportunity_save(jsonb,uuid),public.eco_applicant_summary(uuid) from public;
grant execute on function public.eco_eligible(uuid,jsonb,uuid),public.eco_opportunity_save(jsonb,uuid),public.eco_applicant_summary(uuid) to authenticated;
revoke all on function public.eco_application_activity() from public;
