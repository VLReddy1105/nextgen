-- Refresh only the authenticated student's due reminders. Called on workspace
-- refresh; dedupe keys make repeat visits/polling safe. No background worker.
create function public.workspace_refresh_reminders()
returns void language plpgsql security definer set search_path='' as $$
declare r record; begin
 if not public.workspace_ready('student') then raise exception 'Student required' using errcode='42501'; end if;
 for r in select e.* from public.events e join public.event_registrations x on x.event_id=e.id
 where x.user_id=auth.uid() and e.status='published' and e.starts_at between now() and now()+interval '24 hours'
 and public.workspace_audience(e.university_id,e.community_id) loop
  perform public.workspace_notify(auth.uid(),'event_reminder','Coming up: '||r.title,'events',r.id,'/dashboard/events/'||r.id,r.id||':reminder:'||r.starts_at);
 end loop;
 for r in select t.* from public.project_tasks t where t.assignee_id=auth.uid() and t.status<>'done'
 and public.workspace_member('projects',t.project_id) and t.deadline between now() and now()+interval '24 hours' loop
  perform public.workspace_notify(auth.uid(),'deadline_reminder','Task due soon: '||r.title,'projects',r.project_id,'/dashboard/projects/'||r.project_id||'?tab=tasks',r.id||':deadline:'||r.deadline);
 end loop;
 for r in select o.* from public.opportunities o join public.saved_opportunities s on s.opportunity_id=o.id
 where s.user_id=auth.uid() and o.status='published' and o.deadline between now() and now()+interval '24 hours'
 and public.workspace_audience(o.university_id,null) and not public.workspace_applied(o.id) loop
  perform public.workspace_notify(auth.uid(),'deadline_reminder','Application closes soon: '||r.title,'opportunities',r.id,'/dashboard/opportunities/'||r.id,r.id||':deadline:'||r.deadline);
 end loop;
 for r in select * from public.mentor_sessions where student_id=auth.uid() and status='confirmed' and starts_at between now() and now()+interval '24 hours' loop
  perform public.workspace_notify(auth.uid(),'mentor_session','Upcoming mentoring session: '||r.title,'mentorship',r.id,'/dashboard/mentorship?view=sessions',r.id||':session:'||r.starts_at);
 end loop;
end; $$;
revoke all on function public.workspace_refresh_reminders() from public;
grant execute on function public.workspace_refresh_reminders() to authenticated;

create function public.workspace_university_update()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' then if new.status=old.status then return new; end if; end if;
 perform public.workspace_notify(new.student_user_id,'university_update','Your university membership was updated.','my-university',new.university_id,'/dashboard/my-university',new.university_id||':membership:'||gen_random_uuid());
 return new;
end; $$;
revoke all on function public.workspace_university_update() from public;
create trigger workspace_university_notification after insert or update on public.university_student_memberships
 for each row execute function public.workspace_university_update();

create index applications_student_updated on public.applications(student_id,updated_at desc);
create index application_history_application on public.application_history(application_id,created_at);
create index tasks_project on public.project_tasks(project_id);
create index tasks_assignee_deadline on public.project_tasks(assignee_id,deadline);
create index community_posts_community on public.community_posts(community_id,created_at desc);
create index community_comments_post on public.community_comments(post_id,created_at);
create index invitations_recipient on public.workspace_invitations(recipient_user_id,status);
create index event_registrations_user on public.event_registrations(user_id);
