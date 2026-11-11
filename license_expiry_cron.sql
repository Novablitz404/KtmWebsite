-- Athlete license expiry — step 3 of 3: the nightly Supabase job
-- ----------------------------------------------------------------
-- Every day at 16:00 UTC (= 00:00 Manila) this:
--   1. switches off the license of every athlete whose end date has passed
--      (only the isVerified flag changes — athlete number, Elo ratings, match
--      history and everything else are kept, so renewing restores them), then
--   2. refreshes the ranking view so they drop off the public page right away.
-- The free 2026 licenses end 2026-12-31 15:59:59 UTC, so this job's first
-- effective run is the one at 16:00 UTC on Dec 31 = 00:00 on Jan 1 in Manila.
--
-- Run AFTER license_migration_1_column.sql and ranking_migration_v5.sql.
-- Safe to run again: it replaces its own job and leaves your existing
-- "refresh-global-athlete-ranking" job untouched.

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
    PERFORM cron.unschedule('expire-athlete-licenses');
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

SELECT cron.schedule(
    'expire-athlete-licenses',
    '0 16 * * *',
    $job$
    UPDATE "User"
       SET "isVerified" = false
     WHERE role = 'ATHLETE'
       AND "isVerified" = true
       AND "licenseExpiresAt" IS NOT NULL
       AND "licenseExpiresAt" <= NOW();
    REFRESH MATERIALIZED VIEW CONCURRENTLY "GlobalAthleteRanking";
    $job$
);

-- Check: should list both jobs, active
SELECT jobname, schedule, active FROM cron.job ORDER BY jobname;
