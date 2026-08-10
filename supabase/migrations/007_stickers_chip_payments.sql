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
