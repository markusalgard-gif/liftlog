-- LiftLog cloud schema (Phase 3).
-- Mirrors the Dexie tables in src/db/types.ts, plus a snapshot table for
-- Milestone A whole-file backup. Every table is per-user via RLS.
--
-- Run this in the Supabase SQL editor, or via `supabase db push`, AFTER
-- creating the project. Do not run it against a shared/prod project until
-- the human has confirmed the project URL.

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.gyms (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  created_at bigint not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table public.exercises (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  category text not null check (category in ('lower', 'pull', 'push', 'core', 'neck')),
  form_cue text not null default '',
  failure_rule text not null check (failure_rule in ('never', 'lastSetOnly', 'allSets')),
  set_structure text not null check (set_structure in ('straight', 'superset')),
  superset_partner_id text,
  rep_target integer not null,
  weight_increment numeric not null,
  bodyweight boolean not null default false,
  archived boolean not null default false,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table public.gym_exercises (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  gym_id text not null,
  exercise_id text not null,
  enabled boolean not null default true,
  weight_override numeric,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table public.sessions (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  date text not null,
  gym_id text not null,
  template_id text,
  exercise_ids jsonb not null default '[]'::jsonb,
  note text,
  started_at bigint not null,
  finished_at bigint,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table public.set_logs (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  session_id text not null,
  exercise_id text not null,
  gym_id text not null,
  set_number integer not null,
  weight numeric,
  reps integer not null,
  logged_at bigint not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table public.templates (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  exercise_ids jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table public.bodyweight_entries (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  date text not null,
  kg numeric not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table public.football_sessions (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  date text not null,
  type text not null check (type in ('training', 'match')),
  note text,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

-- One row per user. Local Dexie still uses id = 'singleton'.
create table public.app_state (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null default 'singleton',
  current_gym_id text not null,
  active_session_id text,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id)
);

-- Milestone A: whole-file JSON snapshot (same shape as src/lib/backup.ts).
create table public.user_snapshots (
  user_id uuid not null references auth.users (id) on delete cascade,
  exported_at timestamptz not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id)
);

create table public.sync_cursors (
  user_id uuid not null references auth.users (id) on delete cascade,
  last_pulled_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id)
);

-- ---------------------------------------------------------------------------
-- Pull indexes (user + recency)
-- ---------------------------------------------------------------------------

create index gyms_user_updated_idx on public.gyms (user_id, updated_at);
create index exercises_user_updated_idx on public.exercises (user_id, updated_at);
create index gym_exercises_user_updated_idx on public.gym_exercises (user_id, updated_at);
create index sessions_user_updated_idx on public.sessions (user_id, updated_at);
create index set_logs_user_updated_idx on public.set_logs (user_id, updated_at);
create index templates_user_updated_idx on public.templates (user_id, updated_at);
create index bodyweight_entries_user_updated_idx on public.bodyweight_entries (user_id, updated_at);
create index football_sessions_user_updated_idx on public.football_sessions (user_id, updated_at);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create trigger gyms_set_updated_at before update on public.gyms
  for each row execute function public.set_updated_at();
create trigger exercises_set_updated_at before update on public.exercises
  for each row execute function public.set_updated_at();
create trigger gym_exercises_set_updated_at before update on public.gym_exercises
  for each row execute function public.set_updated_at();
create trigger sessions_set_updated_at before update on public.sessions
  for each row execute function public.set_updated_at();
create trigger set_logs_set_updated_at before update on public.set_logs
  for each row execute function public.set_updated_at();
create trigger templates_set_updated_at before update on public.templates
  for each row execute function public.set_updated_at();
create trigger bodyweight_entries_set_updated_at before update on public.bodyweight_entries
  for each row execute function public.set_updated_at();
create trigger football_sessions_set_updated_at before update on public.football_sessions
  for each row execute function public.set_updated_at();
create trigger app_state_set_updated_at before update on public.app_state
  for each row execute function public.set_updated_at();
create trigger user_snapshots_set_updated_at before update on public.user_snapshots
  for each row execute function public.set_updated_at();
create trigger sync_cursors_set_updated_at before update on public.sync_cursors
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security — a user can only read/write their own rows
-- ---------------------------------------------------------------------------

alter table public.gyms enable row level security;
alter table public.exercises enable row level security;
alter table public.gym_exercises enable row level security;
alter table public.sessions enable row level security;
alter table public.set_logs enable row level security;
alter table public.templates enable row level security;
alter table public.bodyweight_entries enable row level security;
alter table public.football_sessions enable row level security;
alter table public.app_state enable row level security;
alter table public.user_snapshots enable row level security;
alter table public.sync_cursors enable row level security;

create policy gyms_own on public.gyms
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy exercises_own on public.exercises
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy gym_exercises_own on public.gym_exercises
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy sessions_own on public.sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy set_logs_own on public.set_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy templates_own on public.templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy bodyweight_entries_own on public.bodyweight_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy football_sessions_own on public.football_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy app_state_own on public.app_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy user_snapshots_own on public.user_snapshots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy sync_cursors_own on public.sync_cursors
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
