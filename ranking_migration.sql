-- Run this exactly as is in your Supabase SQL Editor

-- 1. Create the J-Score SQL Function
CREATE OR REPLACE FUNCTION calculate_j_score(
    medal text,
    tier text,
    start_date timestamp with time zone
) RETURNS numeric AS $$
DECLARE
    base_points numeric := 0;
    tier_multiplier numeric := 1;
    months_diff integer;
    decay_factor numeric := 1.0;
    final_score numeric;
BEGIN
    -- Base Points
    IF upper(medal) = 'GOLD' THEN
        base_points := 10.0;
    ELSIF upper(medal) = 'SILVER' THEN
        base_points := 6.0;
    ELSIF upper(medal) = 'BRONZE' THEN
        base_points := 3.6;
    ELSIF upper(medal) = 'QF' THEN
        base_points := 2.16;
    ELSIF upper(medal) = 'R16' THEN
        base_points := 1.51;
    ELSE
        base_points := 0;
    END IF;

    -- Tier Multiplier
    IF upper(tier) = 'J-1' THEN
        tier_multiplier := 1;
    ELSIF upper(tier) = 'J-2' THEN
        tier_multiplier := 2;
    ELSIF upper(tier) = 'J-3' THEN
        tier_multiplier := 3;
    ELSIF upper(tier) = 'J-4' THEN
        tier_multiplier := 4;
    ELSE
        tier_multiplier := 1;
    END IF;

    -- Decay Protocol
    months_diff := (DATE_PART('year', CURRENT_DATE) - DATE_PART('year', start_date)) * 12 +
                   (DATE_PART('month', CURRENT_DATE) - DATE_PART('month', start_date));

    IF DATE_PART('day', CURRENT_DATE) < DATE_PART('day', start_date) THEN
        months_diff := months_diff - 1;
    END IF;

    IF months_diff <= 12 THEN
        decay_factor := 1.0;
    ELSIF months_diff <= 24 THEN
        decay_factor := 0.75;
    ELSIF months_diff <= 36 THEN
        decay_factor := 0.50;
    ELSIF months_diff <= 48 THEN
        decay_factor := 0.25;
    ELSE
        decay_factor := 0.0;
    END IF;

    final_score := (base_points * tier_multiplier) * decay_factor;
    RETURN round(final_score, 2);
END;
$$ LANGUAGE plpgsql;

-- 2. Create the Materialized View
DROP MATERIALIZED VIEW IF EXISTS "GlobalAthleteRanking";
CREATE MATERIALIZED VIEW "GlobalAthleteRanking" AS
WITH PlayerPoints AS (
    SELECT 
        u.id AS "userId",
        u.name AS "playerName",
        c.name AS "clubName",
        p."division" AS "division",
        p.gender AS "gender",
        cat.type AS "type",
        calculate_j_score(p.medal, t.tier, t."startDate") AS points
    FROM "Player" p
    JOIN "User" u ON p."userId" = u.id
    JOIN "Category" cat ON p."categoryId" = cat.id
    JOIN "Tournament" t ON cat."tournamentId" = t.id
    LEFT JOIN "Club" c ON p."clubId" = c.id
    WHERE u."isVerified" = true
      AND p.medal IS NOT NULL
      AND p.medal != ''
),
AggregatedPoints AS (
    SELECT 
        "userId",
        "playerName",
        "clubName",
        "type",
        MAX("division") as "division",
        MAX("gender") as "gender",
        SUM(points) AS "totalPoints"
    FROM PlayerPoints
    GROUP BY "userId", "playerName", "clubName", "type"
)
SELECT 
    "userId" || '-' || "type" AS "id",
    "userId",
    "playerName",
    "clubName",
    "division",
    "gender",
    "type",
    "totalPoints" :: double precision,
    RANK() OVER (PARTITION BY "type" ORDER BY "totalPoints" DESC) :: integer AS "globalRank"
FROM AggregatedPoints
WHERE "totalPoints" > 0;

-- Create an index to query by userId quickly
CREATE UNIQUE INDEX idx_global_athlete_ranking_id ON "GlobalAthleteRanking"("id");

-- 3. Schedule the Refresh with pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove any existing schedule for this specific job to avoid duplicates
DO $$
BEGIN
    PERFORM cron.unschedule('refresh-global-athlete-ranking');
EXCEPTION WHEN OTHERS THEN
    -- Ignore error if job does not exist
END $$;

-- Schedule the refresh at midnight (00:00) every day
SELECT cron.schedule('refresh-global-athlete-ranking', '0 0 * * *', 'REFRESH MATERIALIZED VIEW "GlobalAthleteRanking"');
