-- Sync premium plan to all family members when the billing admin already upgraded.
update public.profiles as member
set
  plan = 'premium',
  subscription_interval = admin.subscription_interval
from public.profiles as admin
where admin.plan = 'premium'
  and admin.family_id is not null
  and admin.family_id = member.family_id
  and member.id <> admin.id
  and member.plan is distinct from 'premium';
