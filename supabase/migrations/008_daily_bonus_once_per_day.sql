-- 008_daily_bonus_once_per_day.sql
-- Hardens once-per-UTC-day daily bonus + ensures claim columns exist.
-- Safe to re-run in Supabase SQL Editor.

-- Core progress columns (no-op if already present from FULL_SETUP)
alter table public.player_progress
  add column if not exists last_daily_bonus_time bigint;

alter table public.player_progress
  add column if not exists reward_track_day integer not null default 1;

alter table public.player_progress
  add column if not exists missions_claimed jsonb not null default '[]'::jsonb;

alter table public.player_progress
  add column if not exists mission_progress jsonb not null default '{}'::jsonb;

alter table public.player_progress
  add column if not exists megapot_credits integer not null default 0;

alter table public.player_progress
  add column if not exists tickets_minted integer not null default 0;

-- Optional audit log: one row per user per UTC day (blocks double claim even if client lies)
create table if not exists public.daily_bonus_claims (
  user_id uuid not null references auth.users (id) on delete cascade,
  day_key text not null, -- YYYY-MM-DD UTC
  reward_day integer not null,
  chips_granted integer not null,
  xp_granted integer not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day_key)
);

create index if not exists daily_bonus_claims_created_idx
  on public.daily_bonus_claims (created_at desc);

alter table public.daily_bonus_claims enable row level security;

drop policy if exists "daily_bonus_select_own" on public.daily_bonus_claims;
create policy "daily_bonus_select_own"
  on public.daily_bonus_claims for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "daily_bonus_insert_own" on public.daily_bonus_claims;
create policy "daily_bonus_insert_own"
  on public.daily_bonus_claims for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "daily_bonus_update_own" on public.daily_bonus_claims;
create policy "daily_bonus_update_own"
  on public.daily_bonus_claims for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Mirror achievements into profile JSON if missing
update public.player_progress
set profile = coalesce(profile, '{}'::jsonb)
where profile is null;
