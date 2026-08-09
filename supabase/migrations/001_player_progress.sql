-- Live player progress + public ladder (run in Supabase SQL editor once).
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS.

create table if not exists public.player_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Player',
  avatar_url text,
  chips integer not null default 8000 check (chips >= 0),
  xp integer not null default 0 check (xp >= 0),
  vip_tier text not null default 'Bronze',
  equipped_card_back text not null default 'classic',
  equipped_table_felt text not null default 'green',
  owned_card_backs jsonb not null default '["classic"]'::jsonb,
  owned_table_felts jsonb not null default '["green"]'::jsonb,
  last_daily_bonus_time bigint,
  reward_track_day integer not null default 1,
  stats jsonb not null default '{}'::jsonb,
  match_history jsonb not null default '[]'::jsonb,
  sound_enabled boolean not null default true,
  music_enabled boolean not null default true,
  profile jsonb not null default '{}'::jsonb,
  megapot_credits integer not null default 0,
  tickets_minted integer not null default 0,
  mission_progress jsonb not null default '{}'::jsonb,
  missions_claimed jsonb not null default '[]'::jsonb,
  economy_version integer not null default 3,
  wins integer not null default 0,
  total_earnings integer not null default 0,
  score integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists player_progress_score_idx
  on public.player_progress (score desc, wins desc);

alter table public.player_progress enable row level security;

drop policy if exists "player_progress_select_own" on public.player_progress;
create policy "player_progress_select_own"
  on public.player_progress for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "player_progress_select_ladder" on public.player_progress;
create policy "player_progress_select_ladder"
  on public.player_progress for select
  to authenticated
  using (true);

drop policy if exists "player_progress_insert_own" on public.player_progress;
create policy "player_progress_insert_own"
  on public.player_progress for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "player_progress_update_own" on public.player_progress;
create policy "player_progress_update_own"
  on public.player_progress for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
