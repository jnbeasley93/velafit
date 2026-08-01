-- Onboarding funnel tracking.
-- onboarding_step = highest survey step the user has reached (1-based);
-- set to (total steps + 1) on completion. NULL = never opened onboarding
-- (includes users who signed up before this column existed).
--
-- Run this in the Supabase SQL editor (or via supabase db push). The app
-- degrades gracefully until it runs: step-tracking updates fail silently and
-- onboarding still completes.
alter table public.profiles
  add column if not exists onboarding_step integer;

comment on column public.profiles.onboarding_step is
  'Highest onboarding survey step reached (1-based); steps+1 = finished. NULL = never started.';
