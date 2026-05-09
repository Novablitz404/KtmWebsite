-- ============================================================
-- GSS (Global Skill Score) — Ranking Migration v2
-- ============================================================
-- Run this in the Supabase SQL Editor.
--
-- This migration:
--   1. Creates AthleteEloRating table (multi-scope Elo storage)
--   2. Creates EloMatchLog table (audit trail)
--   3. Replaces the GlobalAthleteRanking materialized view (GSS-based)
--   4. Drops the old calculate_j_score function
--   5. Renames tournament tiers from J-Score to GSS
-- ============================================================

-- ─── 1. AthleteEloRating Table ───────────────────────────────
CREATE TABLE IF NOT EXISTS "AthleteEloRating" (
    "id"             TEXT PRIMARY KEY,                -- "{userId}-{type}-{scope}"
    "userId"         TEXT NOT NULL,
    "type"           TEXT NOT NULL,                   -- "KYORUGI" or "POOMSAE"
    "scope"          TEXT NOT NULL,                   -- "GLOBAL" or an organizationId
    "organizationId" TEXT,                            -- NULL for global, org ID for scoped
    "rating"         DOUBLE PRECISION DEFAULT 1200,
    "matchCount"     INTEGER DEFAULT 0,
    "lastMatchAt"    TIMESTAMP WITH TIME ZONE,
    "updatedAt"      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_elo_user_type ON "AthleteEloRating"("userId", "type");
CREATE INDEX IF NOT EXISTS idx_elo_scope ON "AthleteEloRating"("scope");
CREATE INDEX IF NOT EXISTS idx_elo_org ON "AthleteEloRating"("organizationId");

-- ─── 2. EloMatchLog Table ────────────────────────────────────
CREATE TABLE IF NOT EXISTS "EloMatchLog" (
    "id"               SERIAL PRIMARY KEY,
    "matchId"          INTEGER NOT NULL,
    "tournamentId"     TEXT NOT NULL,
    "categoryId"       TEXT NOT NULL,
    "winnerId"         TEXT NOT NULL,
    "loserId"          TEXT NOT NULL,
    "winnerEloBefore"  DOUBLE PRECISION,
    "winnerEloAfter"   DOUBLE PRECISION,
    "loserEloBefore"   DOUBLE PRECISION,
    "loserEloAfter"    DOUBLE PRECISION,
    "scoreDifference"  INTEGER DEFAULT 0,
    "kFactor"          DOUBLE PRECISION,
    "marginMultiplier" DOUBLE PRECISION,
    "createdAt"        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_elo_log_tournament ON "EloMatchLog"("tournamentId");
CREATE INDEX IF NOT EXISTS idx_elo_log_match ON "EloMatchLog"("matchId");

-- ─── 3. Replace GlobalAthleteRanking Materialized View ───────
-- Drop the old view and function
DROP MATERIALIZED VIEW IF EXISTS "GlobalAthleteRanking";
DROP FUNCTION IF EXISTS calculate_j_score(text, text, timestamp with time zone);

-- New GSS-based materialized view
-- Combines Elo ratings (Kyorugi) with activity tracking
CREATE MATERIALIZED VIEW "GlobalAthleteRanking" AS
WITH
-- Get Elo ratings from the new table
EloData AS (
    SELECT
        e."userId",
        e."type",
        e."scope",
        e."organizationId",
        e."rating" AS "eloRating",
        e."matchCount"
    FROM "AthleteEloRating" e
),
-- Count recent events for activity check (≥3 in last 12 months = ACTIVE)
ActivityData AS (
    SELECT
        p."userId",
        COUNT(DISTINCT cat."tournamentId") AS "activityCount"
    FROM "Player" p
    JOIN "Category" cat ON p."categoryId" = cat.id
    JOIN "Tournament" t ON cat."tournamentId" = t.id
    WHERE t."startDate" >= NOW() - INTERVAL '12 months'
      AND p."registrationStatus" = 'APPROVED'
      AND p."userId" IS NOT NULL
    GROUP BY p."userId"
),
-- Merge with user profile data
RankedAthletes AS (
    SELECT
        e."userId" || '-' || e."type" || '-' || e."scope" AS "id",
        e."userId",
        u.name AS "playerName",
        c.name AS "clubName",
        e."organizationId",
        org."parentOrganizationId",
        -- Get the most recent division from player records
        (
            SELECT p2."division"
            FROM "Player" p2
            WHERE p2."userId" = e."userId"
            ORDER BY p2."createdAt" DESC
            LIMIT 1
        ) AS "division",
        u.gender AS "gender",
        e."type",
        e."scope",
        e."eloRating",
        e."matchCount",
        COALESCE(a."activityCount", 0)::integer AS "activityCount",
        COALESCE(a."activityCount", 0) >= 3 AS "isActive",
        -- Field bonus: sum of decayed medal bonuses from Kyorugi tournaments
        COALESCE(
            (
                SELECT SUM(
                    CASE p3.medal
                        WHEN 'Gold' THEN 1.0
                        WHEN 'Silver' THEN 0.6
                        WHEN 'Bronze' THEN 0.36
                        WHEN 'QF' THEN 0.22
                        WHEN 'R16' THEN 0.15
                        ELSE 0
                    END
                    * CASE t2.tier
                        WHEN 'GSS-1' THEN 2.0
                        WHEN 'GSS-2' THEN 1.5
                        WHEN 'GSS-3' THEN 1.0
                        WHEN 'GSS-4' THEN 0.75
                        WHEN 'J-4' THEN 2.0
                        WHEN 'J-3' THEN 1.5
                        WHEN 'J-2' THEN 1.0
                        WHEN 'J-1' THEN 0.75
                        ELSE 1.0
                    END
                    * EXP(-0.0578 * GREATEST(
                        (EXTRACT(YEAR FROM AGE(NOW(), t2."startDate")) * 12 +
                         EXTRACT(MONTH FROM AGE(NOW(), t2."startDate"))),
                        0
                    ))
                )
                FROM "Player" p3
                JOIN "Category" cat3 ON p3."categoryId" = cat3.id
                JOIN "Tournament" t2 ON cat3."tournamentId" = t2.id
                WHERE p3."userId" = e."userId"
                  AND p3.medal IS NOT NULL
                  AND p3.medal != ''
                  AND cat3.type = 'KYORUGI'
            ),
            0
        )::double precision AS "fieldBonus",
        -- Total points = Elo Rating + Field Bonus (for ranking sort)
        e."eloRating" + COALESCE(
            (
                SELECT SUM(
                    CASE p4.medal
                        WHEN 'Gold' THEN 1.0
                        WHEN 'Silver' THEN 0.6
                        WHEN 'Bronze' THEN 0.36
                        WHEN 'QF' THEN 0.22
                        WHEN 'R16' THEN 0.15
                        ELSE 0
                    END
                    * CASE t3.tier
                        WHEN 'GSS-1' THEN 2.0
                        WHEN 'GSS-2' THEN 1.5
                        WHEN 'GSS-3' THEN 1.0
                        WHEN 'GSS-4' THEN 0.75
                        WHEN 'J-4' THEN 2.0
                        WHEN 'J-3' THEN 1.5
                        WHEN 'J-2' THEN 1.0
                        WHEN 'J-1' THEN 0.75
                        ELSE 1.0
                    END
                    * EXP(-0.0578 * GREATEST(
                        (EXTRACT(YEAR FROM AGE(NOW(), t3."startDate")) * 12 +
                         EXTRACT(MONTH FROM AGE(NOW(), t3."startDate"))),
                        0
                    ))
                )
                FROM "Player" p4
                JOIN "Category" cat4 ON p4."categoryId" = cat4.id
                JOIN "Tournament" t3 ON cat4."tournamentId" = t3.id
                WHERE p4."userId" = e."userId"
                  AND p4.medal IS NOT NULL
                  AND p4.medal != ''
                  AND cat4.type = 'KYORUGI'
            ),
            0
        )::double precision AS "totalPoints"
    FROM EloData e
    JOIN "User" u ON e."userId" = u.id
    LEFT JOIN "Club" c ON u."clubName" = c.name
    LEFT JOIN "Organization" org ON c."organizationId" = org.id
    LEFT JOIN ActivityData a ON a."userId" = e."userId"
    WHERE u."isVerified" = true AND u.role = 'ATHLETE'
)
SELECT
    "id",
    "userId",
    "playerName",
    "clubName",
    "organizationId",
    "parentOrganizationId",
    "division",
    "gender",
    "type",
    "scope",
    "eloRating",
    "matchCount",
    "activityCount",
    "isActive",
    "fieldBonus",
    "totalPoints",
    -- Rank partitioned by scope + type, active athletes first
    ROW_NUMBER() OVER (
        PARTITION BY "scope", "type"
        ORDER BY "isActive" DESC, "totalPoints" DESC
    )::integer AS "globalRank"
FROM RankedAthletes
WHERE "totalPoints" > 0 OR "matchCount" > 0;

-- Unique index for CONCURRENTLY refresh support
CREATE UNIQUE INDEX idx_global_athlete_ranking_id ON "GlobalAthleteRanking"("id");
CREATE INDEX idx_global_athlete_ranking_scope ON "GlobalAthleteRanking"("scope");
CREATE INDEX idx_global_athlete_ranking_type ON "GlobalAthleteRanking"("type");

-- ─── 4. Rename Tournament Tiers ──────────────────────────────
-- Update existing J-Score tiers to GSS Tiers
UPDATE "Tournament" SET tier = 'GSS-4' WHERE tier = 'J-4';
UPDATE "Tournament" SET tier = 'GSS-3' WHERE tier = 'J-3';
UPDATE "Tournament" SET tier = 'GSS-2' WHERE tier = 'J-2';
UPDATE "Tournament" SET tier = 'GSS-1' WHERE tier = 'J-1';

-- Update default value
ALTER TABLE "Tournament" ALTER COLUMN "tier" SET DEFAULT 'GSS-3';

-- ─── 5. Re-schedule pg_cron refresh ──────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
    PERFORM cron.unschedule('refresh-global-athlete-ranking');
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Refresh every 6 hours instead of daily for more up-to-date rankings
SELECT cron.schedule(
    'refresh-global-athlete-ranking',
    '0 */6 * * *',
    'REFRESH MATERIALIZED VIEW CONCURRENTLY "GlobalAthleteRanking"'
);
