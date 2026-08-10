-- ============================================================================
-- pi River — FULL Supabase setup (safe to re-run)
-- Paste entire file into Supabase → SQL Editor → Run
-- Covers: player_progress, shop owns, stats/wins, club chat, chip longevity
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Player progress + ladder (durable Google cloud save)
-- ---------------------------------------------------------------------------
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
  owned_frames jsonb not null default '["none"]'::jsonb,
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

-- Columns for older tables created before shop/frames
alter table public.player_progress
  add column if not exists owned_card_backs jsonb not null default '["classic"]'::jsonb;
alter table public.player_progress
  add column if not exists owned_table_felts jsonb not null default '["green"]'::jsonb;
alter table public.player_progress
  add column if not exists owned_frames jsonb not null default '["none"]'::jsonb;
alter table public.player_progress
  add column if not exists equipped_card_back text not null default 'classic';
alter table public.player_progress
  add column if not exists equipped_table_felt text not null default 'green';
alter table public.player_progress
  add column if not exists wins integer not null default 0;
alter table public.player_progress
  add column if not exists total_earnings integer not null default 0;
alter table public.player_progress
  add column if not exists score integer not null default 0;
alter table public.player_progress
  add column if not exists economy_version integer not null default 3;
alter table public.player_progress
  add column if not exists megapot_credits integer not null default 0;
alter table public.player_progress
  add column if not exists tickets_minted integer not null default 0;

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

-- ---------------------------------------------------------------------------
-- 2) Backfill shop frames from profile JSON
-- ---------------------------------------------------------------------------
update public.player_progress
set owned_frames = coalesce(profile->'ownedFrames', '["none"]'::jsonb)
where
  (owned_frames is null
    or owned_frames = '[]'::jsonb
    or owned_frames = '["none"]'::jsonb)
  and jsonb_typeof(profile->'ownedFrames') = 'array'
  and jsonb_array_length(profile->'ownedFrames') > 0;

update public.player_progress
set profile = jsonb_set(
  coalesce(profile, '{}'::jsonb),
  '{ownedFrames}',
  owned_frames,
  true
)
where owned_frames is not null;

-- ---------------------------------------------------------------------------
-- 3) Reconcile ladder wins / earnings with stats JSON (Profile ↔ Rewards)
-- ---------------------------------------------------------------------------
update public.player_progress
set
  wins = greatest(
    coalesce(wins, 0),
    coalesce((stats->>'gamesWon')::int, 0)
  ),
  total_earnings = greatest(
    coalesce(total_earnings, 0),
    coalesce((stats->>'totalEarnings')::int, 0)
  );

update public.player_progress
set stats = jsonb_set(
  jsonb_set(
    jsonb_set(
      coalesce(stats, '{}'::jsonb),
      '{gamesWon}',
      to_jsonb(wins),
      true
    ),
    '{totalEarnings}',
    to_jsonb(total_earnings),
    true
  ),
  '{handsPlayed}',
  to_jsonb(
    greatest(
      coalesce((stats->>'handsPlayed')::int, 0),
      wins
    )
  ),
  true
);

update public.player_progress
set score = (wins * 120) + (coalesce(tickets_minted, 0) * 90) + (greatest(total_earnings, 0) / 50);

-- Mark economy v3 so the 45k soft-cap does not re-apply every login
update public.player_progress
set economy_version = greatest(coalesce(economy_version, 0), 3);

-- ---------------------------------------------------------------------------
-- 4) Club live chat
-- ---------------------------------------------------------------------------
create table if not exists public.club_chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null default 'Player',
  avatar_url text,
  body text not null check (char_length(trim(body)) between 1 and 280),
  created_at timestamptz not null default now()
);

create index if not exists club_chat_messages_created_at_idx
  on public.club_chat_messages (created_at desc);

alter table public.club_chat_messages enable row level security;

drop policy if exists "club_chat_select_auth" on public.club_chat_messages;
create policy "club_chat_select_auth"
  on public.club_chat_messages for select
  to authenticated
  using (true);

drop policy if exists "club_chat_insert_own" on public.club_chat_messages;
create policy "club_chat_insert_own"
  on public.club_chat_messages for insert
  to authenticated
  with check (auth.uid() = user_id);

do $$
begin
  begin
    alter publication supabase_realtime add table public.club_chat_messages;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;


-- ===========================================================================
-- 5) Stickers + Base Sepolia chip payments
-- ===========================================================================

-- Chip pack payments + owned stickers (safe to re-run).
-- Run in Supabase SQL Editor after FULL_SETUP / player_progress exists.

alter table public.player_progress
  add column if not exists owned_stickers jsonb not null default '[]'::jsonb;

-- Idempotent ETH→chips payment receipts (Base Sepolia tx hash)
create table if not exists public.chip_payments (
  tx_hash text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  pack_id text not null,
  chips_granted integer not null check (chips_granted > 0),
  eth_wei numeric not null,
  from_address text,
  created_at timestamptz not null default now()
);

create index if not exists chip_payments_user_id_idx
  on public.chip_payments (user_id, created_at desc);

alter table public.chip_payments enable row level security;

drop policy if exists "chip_payments_select_own" on public.chip_payments;
create policy "chip_payments_select_own"
  on public.chip_payments for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "chip_payments_insert_own" on public.chip_payments;
create policy "chip_payments_insert_own"
  on public.chip_payments for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Mirror owned stickers into profile JSON for auth-meta fallback
update public.player_progress
set profile = jsonb_set(
  coalesce(profile, '{}'::jsonb),
  '{ownedStickers}',
  coalesce(owned_stickers, '[]'::jsonb),
  true
)
where owned_stickers is not null;

-- ===========================================================================
-- 6) Daily bonus once per UTC day (logout-safe)
-- ===========================================================================

create table if not exists public.daily_bonus_claims (
  user_id uuid not null references auth.users (id) on delete cascade,
  day_key text not null,
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
