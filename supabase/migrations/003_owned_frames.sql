-- Durable owned shop frames (run once in Supabase SQL editor).
-- Safe to re-run.

alter table public.player_progress
  add column if not exists owned_frames jsonb not null default '["none"]'::jsonb;

-- Backfill from profile.ownedFrames when the dedicated column is still default-only
update public.player_progress
set owned_frames = coalesce(profile->'ownedFrames', '["none"]'::jsonb)
where
  (owned_frames is null
    or owned_frames = '[]'::jsonb
    or owned_frames = '["none"]'::jsonb)
  and jsonb_typeof(profile->'ownedFrames') = 'array'
  and jsonb_array_length(profile->'ownedFrames') > 0;

-- Also keep equipped frame in profile if present on the column path already (no-op safe)
update public.player_progress
set profile = jsonb_set(
  coalesce(profile, '{}'::jsonb),
  '{ownedFrames}',
  owned_frames,
  true
)
where owned_frames is not null;
