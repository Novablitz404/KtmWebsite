-- GSS: count ONLY the Lake Sebu tournament in the rankings
-- ---------------------------------------------------------
-- Tournaments (see prod check, 2026-11-11):
--   Lake Sebu  "1st MAYOR ANTONIO FUNGAN JR. 2026 ELITE TAEKWONDO CHAMPIONSHIPS"  cmu693h7c0001y9knn63nfcqj  (stays APPROVED)
--   Kadayawan  "2nd Elite Taekwondo Festival of Kicks: Kadayawan Edition"           cmr1wyuht000111l1m5d2lw17  (-> REJECTED)
--   WOTF Mindanao is already REJECTED and has no ratings.
--
-- Run PART A first and check the counts. Then PART B. Then the recompute script
-- (scripts/backfill-gss-elo.ts) — see the steps at the bottom. Run B and the
-- script back to back: after B, Lake Sebu's medal bonus is "not yet given" until
-- the script re-applies it, and nothing else should trigger it in between.
--
-- Nothing is lost: PART A copies the rating tables into new backup tables.
-- Setting the approval via SQL does NOT email the organizer (only the admin
-- panel button does).


-- ───────────── PART A — BACKUPS (new tables only; changes nothing) ─────────────

CREATE TABLE IF NOT EXISTS "AthleteEloRating_backup_20261111" AS SELECT * FROM "AthleteEloRating";
CREATE TABLE IF NOT EXISTS "EloMatchLog_backup_20261111"      AS SELECT * FROM "EloMatchLog";
CREATE TABLE IF NOT EXISTS "Tournament_gss_backup_20261111"   AS
    SELECT id, name, "gssApprovalStatus", "gssBonusProcessedAt" FROM "Tournament";

-- Supabase exposes public tables over its REST API — keep the backups private.
ALTER TABLE "AthleteEloRating_backup_20261111" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EloMatchLog_backup_20261111"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tournament_gss_backup_20261111"   ENABLE ROW LEVEL SECURITY;

-- CHECK: the backup counts must equal the live counts (expect 233 ratings, 155 logs)
SELECT
    (SELECT count(*) FROM "AthleteEloRating")                  AS live_ratings,
    (SELECT count(*) FROM "AthleteEloRating_backup_20261111")  AS backup_ratings,
    (SELECT count(*) FROM "EloMatchLog")                       AS live_logs,
    (SELECT count(*) FROM "EloMatchLog_backup_20261111")       AS backup_logs;


-- ───────────── PART B — THE TWO TOURNAMENT CHANGES ─────────────

-- 1. Kadayawan stops counting toward GSS (REJECTED, set directly: no email)
UPDATE "Tournament"
   SET "gssApprovalStatus" = 'REJECTED'
 WHERE id = 'cmr1wyuht000111l1m5d2lw17';

-- 2. Lake Sebu: clear "medal bonus already given" so the recompute pays it again
--    (the replay skips tournaments that are flagged as already paid).
UPDATE "Tournament"
   SET "gssBonusProcessedAt" = NULL
 WHERE id = 'cmu693h7c0001y9knn63nfcqj';

-- CHECK: Lake Sebu APPROVED + bonus NULL, Kadayawan REJECTED
SELECT name, "gssApprovalStatus", "gssBonusProcessedAt"
  FROM "Tournament" ORDER BY "startDate";


-- ───────────── AFTER B: recompute (run in the terminal, prod .env) ─────────────
--   npx tsx scripts/backfill-gss-elo.ts            (dry run — should list ONLY Lake Sebu:
--                                                   129 Kyorugi results, 9 Poomsae pairings)
--   npx tsx scripts/backfill-gss-elo.ts --apply    (wipes + recomputes the rating tables)


-- ───────────── ROLLBACK (only if needed; not part of the run) ─────────────
-- DELETE FROM "EloMatchLog"; DELETE FROM "AthleteEloRating";
-- INSERT INTO "AthleteEloRating" SELECT * FROM "AthleteEloRating_backup_20261111";
-- INSERT INTO "EloMatchLog"      SELECT * FROM "EloMatchLog_backup_20261111";
-- UPDATE "Tournament" t SET "gssApprovalStatus" = b."gssApprovalStatus", "gssBonusProcessedAt" = b."gssBonusProcessedAt"
--   FROM "Tournament_gss_backup_20261111" b WHERE b.id = t.id;
-- REFRESH MATERIALIZED VIEW "GlobalAthleteRanking";
