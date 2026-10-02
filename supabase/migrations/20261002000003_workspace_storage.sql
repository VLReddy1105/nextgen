insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('student-resumes','student-resumes',false,5242880,array['application/pdf']) on conflict(id) do nothing;
create policy student_resume_insert on storage.objects for insert to authenticated
with check(bucket_id='student-resumes' and (storage.foldername(name))[1]=auth.uid()::text and public.workspace_ready('student'));
create policy student_resume_read on storage.objects for select to authenticated
using(bucket_id='student-resumes' and (storage.foldername(name))[1]=auth.uid()::text and public.workspace_ready('student'));
create policy student_resume_delete on storage.objects for delete to authenticated
using(bucket_id='student-resumes' and (storage.foldername(name))[1]=auth.uid()::text and public.workspace_ready('student'));
