-- The original policy exposed every profile column to every signed-in user.
-- Session reads and profile edits only need the account owner's row.
drop policy profiles_select_authenticated on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated
  using (id = (select auth.uid()));

-- Captains and project heads need member display names in their management UI.
-- Return just those names after checking the contextual permission; never
-- expose the member's account status, role, or other profile columns.
create function public.list_space_member_names(p_kind text, p_space_id uuid)
returns table(user_id uuid, full_name text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_kind = 'communities' then
    if not public.is_community_captain(p_space_id) then
      raise exception 'Captain access required';
    end if;
    return query select p.id, p.full_name
      from public.community_members m join public.profiles p on p.id = m.user_id
      where m.community_id = p_space_id and m.status = 'active';
  elsif p_kind = 'projects' then
    if not public.is_project_head(p_space_id) then
      raise exception 'Project Head access required';
    end if;
    return query select p.id, p.full_name
      from public.project_members m join public.profiles p on p.id = m.user_id
      where m.project_id = p_space_id and m.status = 'active';
  else
    raise exception 'Invalid space type';
  end if;
end;
$$;
revoke all on function public.list_space_member_names(text,uuid) from public;
grant execute on function public.list_space_member_names(text,uuid) to authenticated;
