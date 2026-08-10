-- Shop cosmetics durable columns (run once in Supabase SQL editor).
-- Fixes Deck / Felt / Frame purchases disappearing after logout.
-- Safe to re-run.

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

-- Backfill frames from profile JSON when column is still empty/default
update public.player_progress
set owned_frames = coalesce(profile->'ownedFrames', '["none"]'::jsonb)
where
  (owned_frames is null
    or owned_frames = '[]'::jsonb
    or owned_frames = '["none"]'::jsonb)
  and jsonb_typeof(profile->'ownedFrames') = 'array'
  and jsonb_array_length(profile->'ownedFrames') > 0;

-- Keep profile.ownedFrames mirrored from the durable column
update public.player_progress
set profile = jsonb_set(
  coalesce(profile, '{}'::jsonb),
  '{ownedFrames}',
  owned_frames,
  true
)
where owned_frames is not null;

-- Optional: ensure RLS update policy still allows own row writes
drop policy if exists "player_progress_update_own" on public.player_progress;
create policy "player_progress_update_own"
  on public.player_progress for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "player_progress_insert_own" on public.player_progress;
create policy "player_progress_insert_own"
  on public.player_progress for insert
  to authenticated
  with check (auth.uid() = user_id);
