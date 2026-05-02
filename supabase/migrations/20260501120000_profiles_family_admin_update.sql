-- Allow family admins to UPDATE other members' profile rows (e.g. role promotion/demotion).
-- Typical Supabase setups only allow users to update auth.uid() rows; promoting another member fails RLS.

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
      and admin_profile.family_id = profiles.family_id
  )
);
