-- Durable equipped frame + chat cosmetics + hands_played for win-rate.
-- Safe to re-run.

-- 1) Equipped frame as a real column (mirrors owned_frames durability)
alter table public.player_progress
  add column if not exists equipped_frame text not null default 'none';

update public.player_progress
set equipped_frame = coalesce(nullif(profile->>'equippedFrame', ''), 'none')
where equipped_frame = 'none'
  and coalesce(nullif(profile->>'equippedFrame', ''), 'none') <> 'none';

update public.player_progress
set profile = jsonb_set(
  coalesce(profile, '{}'::jsonb),
  '{equippedFrame}',
  to_jsonb(equipped_frame),
  true
);

-- 2) Hands played column for win-rate durability across devices
alter table public.player_progress
  add column if not exists hands_played integer not null default 0;

update public.player_progress
set hands_played = greatest(
  coalesce(hands_played, 0),
  coalesce((stats->>'handsPlayed')::int, 0),
  coalesce(wins, 0)
);

update public.player_progress
set stats = jsonb_set(
  coalesce(stats, '{}'::jsonb),
  '{handsPlayed}',
  to_jsonb(hands_played),
  true
);

-- 3) Club chat: enough identity for PublicPlayerAvatar (frame + preset)
alter table public.club_chat_messages
  add column if not exists avatar_id text;

alter table public.club_chat_messages
  add column if not exists use_preset_avatar boolean not null default false;

alter table public.club_chat_messages
  add column if not exists equipped_frame text not null default 'none';

-- 4) Re-score after reconcile
update public.player_progress
set score = (wins * 120)
  + (coalesce(tickets_minted, 0) * 90)
  + (greatest(total_earnings, 0) / 50);
