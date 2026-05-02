-- Allow signed-in users to create a new family (Welcome "Create a Family" flow).
-- Error without this: "new row violates row-level security policy for table \"families\"" (403 on POST /rest/v1/families)

alter table public.families enable row level security;

drop policy if exists "Authenticated users can insert families" on public.families;

create policy "Authenticated users can insert families"
  on public.families
  for insert
  to authenticated
  with check (true);
