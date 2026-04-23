-- Cumulative chore points on profile (incremented on complete, decremented on admin undo).
alter table public.profiles
  add column if not exists chore_points integer not null default 0;
