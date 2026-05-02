-- Removing a member sets family_id to null. The previous WITH CHECK required
-- admin_profile.family_id = profiles.family_id on the *new* row, which is
-- always false when family_id becomes null, so PostgREST returned 403.

drop policy if exists "Family admins can update profiles in their family" on public.profiles;

create policy "Family admins can update profiles in their family"
on public.profiles
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles as admin_profile
    where admin_profile.id = auth.uid()
      and admin_profile.role = 'admin'
      and admin_profile.family_id is not null
      and admin_profile.family_id = profiles.family_id
  )
)
with check (
  exists (
    select 1
    from public.profiles as admin_profile
    where admin_profile.id = auth.uid()
      and admin_profile.role = 'admin'
      and admin_profile.family_id is not null
      and (
        admin_profile.family_id = profiles.family_id
        or profiles.family_id is null
      )
  )
);
