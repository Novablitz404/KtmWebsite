# Pending – things that still need to be applied

Claude: keep this file updated whenever we change something that still needs applying (commit/push, DB migrations, `prisma db push`/`generate`, env vars, deploys, app updates). Add items when they come up, tick them off when the user confirms they are done, and remind the user of open items every time.

Last checked against the repo: 2026-10-26 (`main` = `origin/main` at aa98826; everything below is uncommitted).

## Open

### Ranking v3 (per-discipline ranking)
- [ ] Nothing left for ranking v3 itself.

### Club-subscription gating (pushed 2026-11-02)
- [x] Commit and push: `lib/athlete-club-access.ts`, `app/api/v1/athlete/{attendance,payments,schedule,dashboard}/route.ts`
- [x] Heads-up (athlete app confirmed to handle the errors and `clubAccess`, 2026-11-02): this enforces on live. Athletes whose club has no active/grace Club Management subscription get an error from attendance, payments and schedule, and the dashboard returns `clubAccess`.

### Athlete app profile / onboarding photo (pushed 2026-11-02)
- [x] Commit and push: `app/api/v1/athlete/profile/route.ts`, `app/api/v1/onboarding/complete/route.ts` (accept a base64 photo, single cache-tag on the image URL)

### Athlete app advertising (new)
- [x] ~~Commit and push~~ (done 2026-11-02): `prisma/schema.prisma` (model `Advertisement`), `prisma/migrations/20261025000000_add_advertisements/`, `app/api/v1/advertisements/`, `app/admin/actions/advertisements.ts`, `components/admin/AdminAdvertisingView.tsx`, `components/admin/AdminSidebar.tsx`, `app/admin/AdminDashboard.tsx`
- [x] Restart the dev server (`npm run dev`); it was stopped for `prisma generate`
- [x] After deploy: add the ads in Admin → Advertising. With no live ads the app hides its carousel (it falls back to its built-in promos only when the API errors). The `advertisements` storage bucket is created automatically on the first image upload.

### Athlete tournament details API (pushed 2026-11-02)
- [x] Commit and push `app/api/v1/athlete/tournaments/` (guidelines, participants with profile photos, the signed-in athlete's own matches). Participant names, clubs and photos are visible to any signed-in athlete (confirmed acceptable by the user 2026-11-02).

### Manual dashboard steps from the email / OTP work (confirmed done by the user 2026-11-02)
- [x] Supabase Auth: generic confirm-signup template and per-tenant reset template pasted; SMTP sender `noreply@ktmsports.com`; Confirm email ON; OTP length 6
- [x] Vercel env vars: `RESEND_WEBHOOK_SECRET`, `SUPPORT_INBOUND_DOMAIN`; Resend Receiving set up

### Housekeeping (decide, then clean up)
- [x] `public/email-banners/` and `supabase/snippets/` added to `.gitignore` (2026-11-02)

## Suggested commit order
1. ~~Ranking v3 + rankings API~~ (pushed, 90d84e7)
2. Club-subscription gating (live enforcement; push when ready)
3. Onboarding photo / profile fix
4. Advertising (after the production table exists)
5. Tournament details API

## Done
- [x] Uncontested divisions PDF per club (three-dot menu in the event overview) committed and pushed (2026-11-02). No DB changes or env vars needed. `scripts/seed-uncontested-report-scenario.ts` is local test data and was NOT committed.
- [x] RLS enabled on production `"Advertisement"` by the user (2026-11-02)
- [x] `prisma db push` to production: created `"Advertisement"` table + index only, no other changes (2026-11-02); `prisma generate` run locally
- [x] `ranking_migration_v3.sql` applied to local Supabase (2026-10-25)
- [x] `ranking_migration_v3.sql` applied to production Supabase (2026-10-25)
- [x] Mobile athlete app reads `globalRanking.disciplines` and no longer uses `totalPoints` / `bestRank` (checked in the app code, 2026-10-26)
- [x] Ranking v3 code (dashboard, migration file) and rankings API committed and pushed (90fa875, 90d84e7; 2026-11-02)
- [x] Email / OTP / invite changes committed and pushed (up to aa98826)
