-- Direct PATCH on profiles can still fail if multiple RLS policies combine badly.
-- This RPC validates the caller is a family admin and the target shares that family,
-- then updates as definer (bypasses RLS on profiles for this controlled path).

create or replace function public.remove_profile_from_family(target_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_family uuid;
begin
  if target_profile_id is null then
    raise exception 'Invalid member';
  end if;

  select p.family_id into admin_family
  from public.profiles p
  where p.id = auth.uid()
    and p.role = 'admin'
    and p.family_id is not null;

  if admin_family is null then
    raise exception 'Only family admins can remove members';
  end if;

  if not exists (
    select 1
    from public.profiles t
    where t.id = target_profile_id
      and t.family_id = admin_family
  ) then
    raise exception 'That user is not in your family';
  end if;

  update public.profiles
  set family_id = null,
      role = 'member'
  where id = target_profile_id;
end;
$$;

revoke all on function public.remove_profile_from_family(uuid) from public;
grant execute on function public.remove_profile_from_family(uuid) to authenticated;
