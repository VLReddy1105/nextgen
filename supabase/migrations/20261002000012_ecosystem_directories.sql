-- Narrow projections for human-readable management lists. No broad profile SELECT.
create function public.eco_applicants() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('application_id',x.id,'full_name',x.full_name)),'[]') from (select a.id,p.full_name from public.applications a join public.opportunities o on o.id=a.opportunity_id join public.profiles p on p.id=a.student_id where public.workspace_ready() and o.created_by=auth.uid() order by a.created_at desc limit 500) x;
$$;
create function public.eco_relationship_directory(p_kind text,p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.workspace_ready() then raise exception 'Active account required' using errcode='42501';end if;
 return jsonb_build_object('invitations',(select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'recipient_user_id',i.recipient_user_id,'recipient_name',p.full_name,'inviter_name',v.full_name,'requested_role',i.requested_role,'status',i.status,'expires_at',i.expires_at)),'[]') from public.workspace_invitations i join public.profiles p on p.id=i.recipient_user_id join public.profiles v on v.id=i.created_by where i.kind=p_kind and i.entity_id=p_id and (i.recipient_user_id=auth.uid() or public.eco_manager(p_kind,p_id))),
 'requests',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'user_id',r.user_id,'full_name',p.full_name,'status',r.status)),'[]') from public.space_join_requests r join public.profiles p on p.id=r.user_id where r.kind=p_kind and r.entity_id=p_id and (r.user_id=auth.uid() or public.eco_manager(p_kind,p_id))));
end; $$;
create function public.eco_campus_requests() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'student_id',r.student_id,'full_name',p.full_name,'status',r.status)),'[]') from public.university_connection_requests r join public.profiles p on p.id=r.student_id where public.workspace_ready() and (r.student_id=auth.uid() or public.can_manage_university(r.university_id));
$$;
revoke all on function public.eco_applicants(),public.eco_relationship_directory(text,uuid),public.eco_campus_requests() from public;
grant execute on function public.eco_applicants(),public.eco_relationship_directory(text,uuid),public.eco_campus_requests() to authenticated;
create function public.eco_portfolio_projects(p_student uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'title',p.title,'description',p.short_description,'tags',p.tags,'project_url',p.project_url)),'[]') from public.projects p join public.project_members m on m.project_id=p.id where public.workspace_ready() and m.user_id=p_student and m.status='active' and m.show_on_profile and p.visibility='public' and public.eco_scope_allowed('projects',p.id,p_student) and (p_student=auth.uid() or exists(select 1 from public.student_preferences where user_id=p_student and profile_visibility='members'));
$$;
revoke all on function public.eco_portfolio_projects(uuid) from public;
grant execute on function public.eco_portfolio_projects(uuid) to authenticated;
