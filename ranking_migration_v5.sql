-- GSS ranking v5: expired licenses are excluded even before the daily job runs
-- ----------------------------------------------------------------------------
-- Identical to v4 except the license filter now also requires the license to be
-- unexpired:   isVerified = true AND (licenseExpiresAt IS NULL OR licenseExpiresAt > NOW())
-- So every 6-hour refresh (and the daily expiry job's refresh) drops expired
-- athletes, even if the daily job were late. Only the derived ranking view is
-- rebuilt; no table data (users, ratings, matches) is touched.
--
-- Run AFTER license_migration_1_column.sql. There is a brief moment while the
-- view is rebuilt when the public rankings page has no data.

DROP MATERIALIZED VIEW IF EXISTS "GlobalAthleteRanking";

CREATE MATERIALIZED VIEW "GlobalAthleteRanking" AS
WITH
-- Elo ratings (the placement bonus is already inside the rating)
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
-- Count recent events for activity check (>=1 approved event in last 12 months = ACTIVE)
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
        -- Division / weight class: latest registration in the SAME discipline.
        -- Categories created before these columns existed, or created manually
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
        -- Legacy column kept for compatibility; no longer used (see header).
        0::double precision AS "fieldBonus",
        -- Total points = Elo rating (bonus already included)
        e."eloRating"::double precision AS "totalPoints"
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
          AND cat.type = e."type"
        ORDER BY p2."createdAt" DESC
        LIMIT 1
    ) mrc ON true
    WHERE u."isVerified" = true AND (u."licenseExpiresAt" IS NULL OR u."licenseExpiresAt" > NOW()) AND u.role = 'ATHLETE'
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

-- Materialized views can't have Row Level Security. This view is only queried
-- server-side via Prisma (which bypasses grants), never through Supabase's
-- client-facing REST API. CREATE MATERIALIZED VIEW grants anon/authenticated
-- SELECT by default, which would expose every organization's ranking data via
-- /rest/v1/GlobalAthleteRanking, so revoke it.
REVOKE ALL ON "GlobalAthleteRanking" FROM anon, authenticated;
