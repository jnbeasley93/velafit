-- In-app feedback. Insert-only for clients: anyone (including logged-out
-- visitors on the landing page) can send feedback; nobody can read it back
-- through the Data API. Feedback is read via the dashboard/service role.
--
-- Run via supabase db push (or the SQL editor). The app degrades gracefully
-- until it runs: the feedback modal shows its retry message on insert failure.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete set null,
  email text check (email is null or char_length(email) <= 320),
  message text not null check (char_length(btrim(message)) between 1 and 5000),
  page text check (page is null or char_length(page) <= 200)
);

comment on table public.feedback is
  'In-app feedback. Insert-only from clients (anon + authenticated); no public read.';

alter table public.feedback enable row level security;

-- Logged-out visitors may insert, but can never attribute a row to a user.
create policy "Anonymous visitors can send feedback"
  on public.feedback for insert
  to anon
  with check (user_id is null);

-- Logged-in users may insert rows attributed to themselves only.
create policy "Users can send their own feedback"
  on public.feedback for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- Deliberately no select/update/delete policies for anon/authenticated:
-- with RLS enabled, those operations return nothing for client roles.
