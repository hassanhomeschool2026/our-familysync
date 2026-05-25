-- Enable RLS on notifications and feed_items tables.
-- notifications: users can only see/edit their own rows.
-- feed_items: users can only see/insert rows belonging to their family.

-- NOTIFICATIONS
alter table public.notifications enable row level security;

drop policy if exists "Users can view own notifications" on public.notifications;
drop policy if exists "Users can insert notifications" on public.notifications;
drop policy if exists "Users can update own notifications" on public.notifications;
drop policy if exists "Users can delete own notifications" on public.notifications;

create policy "Users can view own notifications"
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert notifications"
  on public.notifications for insert
  to authenticated
  with check (true);

create policy "Users can update own notifications"
  on public.notifications for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can delete own notifications"
  on public.notifications for delete
  to authenticated
  using (auth.uid() = user_id);

-- FEED ITEMS
alter table public.feed_items enable row level security;

drop policy if exists "Family members can view feed items" on public.feed_items;
drop policy if exists "Family members can insert feed items" on public.feed_items;

create policy "Family members can view feed items"
  on public.feed_items for select
  to authenticated
  using (family_id = public.my_family_id());

create policy "Family members can insert feed items"
  on public.feed_items for insert
  to authenticated
  with check (family_id = public.my_family_id());
