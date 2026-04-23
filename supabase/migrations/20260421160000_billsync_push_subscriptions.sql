-- BillSync-style: separate key columns, no RLS (anon can write with REST + JWT for auth role).
-- Run in production SQL editor as needed; destructive: drops previous push_subscriptions.
DROP TABLE IF EXISTS public.push_subscriptions CASCADE;

CREATE TABLE public.push_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  family_id uuid,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

ALTER TABLE public.push_subscriptions DISABLE ROW LEVEL SECURITY;
