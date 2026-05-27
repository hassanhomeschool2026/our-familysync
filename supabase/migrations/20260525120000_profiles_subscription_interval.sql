-- Store Stripe billing interval (month/year) for premium plan display.
alter table public.profiles
  add column if not exists subscription_interval text;

alter table public.profiles
  drop constraint if exists profiles_subscription_interval_check;

alter table public.profiles
  add constraint profiles_subscription_interval_check
  check (subscription_interval is null or subscription_interval in ('month', 'year'));
