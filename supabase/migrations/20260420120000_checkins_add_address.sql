-- Full formatted address for check-ins (place search + reverse geocode)
alter table public.checkins add column if not exists address text;
