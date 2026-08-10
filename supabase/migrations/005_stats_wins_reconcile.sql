-- Reconcile ladder wins / earnings columns with stats JSONB.
-- Fixes Profile win-rate vs Rewards ladder disagreeing after stale syncs.
-- Safe to re-run.

-- Lift gamesWon / totalEarnings into the dedicated columns when JSON is ahead
update public.player_progress
set
  wins = greatest(
    coalesce(wins, 0),
    coalesce((stats->>'gamesWon')::int, 0)
  ),
  total_earnings = greatest(
    coalesce(total_earnings, 0),
    coalesce((stats->>'totalEarnings')::int, 0)
  )
where true;

-- Mirror columns back into stats JSON so Profile reads the same numbers
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
)
where true;

-- Keep score in sync with reconciled wins / earnings
update public.player_progress
set score = (wins * 120) + (coalesce(tickets_minted, 0) * 90) + (greatest(total_earnings, 0) / 50)
where true;
