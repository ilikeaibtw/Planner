-- Planner cloud sync: one table, one row per signed-in user.
-- Run this once in the Supabase project's SQL editor.

create table if not exists planner_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table planner_state enable row level security;

-- Each user may only see, insert, and update their own row.
create policy "planner_state_select_own"
  on planner_state for select
  using (auth.uid() = user_id);

create policy "planner_state_insert_own"
  on planner_state for insert
  with check (auth.uid() = user_id);

create policy "planner_state_update_own"
  on planner_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- No delete policy: users cannot delete their sync row via the client
-- (deleting the auth user cascades and removes it automatically).
