-- Optional: after app deploy, chips persist via spend-aware merge (code).
-- No forced chip deduction in SQL — inventory already paid; next buys will stick.
-- This file only records that chips must not be Math.max-merged in app code.
select 1;
