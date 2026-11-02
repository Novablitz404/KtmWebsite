-- GSS ranking v3: fix cross-discipline medal bonus
-- ---------------------------------------------------------------
-- v2 added the Kyorugi medal bonus to EVERY discipline's row for a user
-- (the bonus subqueries filtered on cat.type = 'KYORUGI' regardless of the
-- row's own type), so Poomsae totalPoints included Kyorugi medals. Kyorugi and
-- Poomsae are separate rankings: each row's bonus now counts only medals from
-- categories of the same type as the row.
-- Only the view body changes; columns, indexes and grants are identical to v2.
-- Run once in the Supabase SQL editor.

DROP MATERIALIZED VIEW IF EXISTS "GlobalAthleteRanking";

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
        -- Division/weight-class are read directly from the most recent
        -- category's own structured columns (Category.division/weightClass,
        -- set once at generation time from the template's Division/
        -- WeightCategory names — see app/actions.ts categoriesToCreate).
        -- Categories created before this field existed, or created manually
        -- without a template, will simply have NULL here.
        mrc."division" AS "division",
        mrc."weightClass" AS "weightCategory",
        u.belt AS "belt",
        u.gender AS "gender",
        e."type",
        e."scope",
        e."eloRating",
        e."matchCount",
        COALESCE(a."activityCount", 0)::integer AS "activityCount",
        COALESCE(a."activityCount", 0) >= 1 AS "isActive",
        -- Field bonus: sum of decayed medal bonuses from tournaments of the same discipline
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
                  AND cat3.type = e."type"
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
                  AND cat4.type = e."type"
            ),
            0
        )::double precision AS "totalPoints"
    FROM EloData e
    JOIN "User" u ON e."userId" = u.id
    LEFT JOIN "Club" c ON u."clubName" = c.name
    LEFT JOIN "Organization" org ON c."organizationId" = org.id
    LEFT JOIN ActivityData a ON a."userId" = e."userId"
    LEFT JOIN LATERAL (
        SELECT cat."division", cat."weightClass"
        FROM "Player" p2
        JOIN "Category" cat ON cat.id = p2."categoryId"
        WHERE p2."userId" = e."userId"
        ORDER BY p2."createdAt" DESC
        LIMIT 1
    ) mrc ON true
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
    "weightCategory",
    "belt",
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

-- Materialized views can't have Row Level Security — Postgres doesn't support
-- it for this relation kind. This view is only ever queried server-side via
-- Prisma (which connects as the postgres role and bypasses grants entirely),
-- never through Supabase's client-facing REST API — but CREATE MATERIALIZED
-- VIEW grants anon/authenticated SELECT by default, which would let anyone
-- with the public anon key pull every organization's ranking data directly
-- via /rest/v1/GlobalAthleteRanking, bypassing fetchRankings()'s tenant
-- scoping entirely. Revoking closes that off without affecting the app.
REVOKE ALL ON "GlobalAthleteRanking" FROM anon, authenticated;
