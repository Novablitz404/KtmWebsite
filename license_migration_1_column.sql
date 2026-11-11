-- Athlete license expiry — step 1 of 3: add the end-date column
-- ----------------------------------------------------------------
-- ADDITIVE ONLY. Adds one empty (NULL) column to "User". Nothing is deleted,
-- changed or rewritten, and every existing row keeps all of its data.
--
-- RUN THIS FIRST, before the new website code is deployed: the code reads this
-- column, so deploying it before the column exists would break user queries.
-- Safe to run more than once.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "licenseExpiresAt" TIMESTAMP(3);

-- Check: should return 1 row
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'User' AND column_name = 'licenseExpiresAt';
