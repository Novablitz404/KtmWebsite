# Pending – things that still need to be applied

Claude: keep this file updated whenever we change something that still needs applying (commit/push, DB migrations, `prisma db push`/`generate`, env vars, deploys, app updates). Add items when they come up, tick them off when the user confirms they are done, and remind the user of open items every time.

Last checked against the repo: 2026-10-26 (`main` = `origin/main` at aa98826; everything below is uncommitted).

## Open

### Ranking v3 (per-discipline ranking)
- [ ] Commit and push: `app/actions.ts`, `components/athlete/AthleteDashboardView.tsx`, `ranking_migration_v3.sql`, `PENDING.md`
- [ ] `prisma db push` (first check `GlobalAthleteRanking` is still a `view` in `prisma/schema.prisma`; it should report nothing for the view. If it offers to drop/recreate the view or any data, answer no). Needed now for the Advertisement table too, see below.
- [ ] `prisma generate`

### Rankings API for the athlete app (new)
- [ ] Commit and push `app/api/v1/rankings/` (top-10 per discipline). Reads the `GlobalAthleteRanking` view, so ranking v3 must be applied on the target database first (production: done).

### Club-subscription gating (new)
- [ ] Commit and push: `lib/athlete-club-access.ts`, `app/api/v1/athlete/{attendance,payments,schedule,dashboard}/route.ts`
- [ ] Heads-up before pushing: this enforces on live. Athletes whose club has no active/grace Club Management subscription get an error from attendance, payments and schedule, and the dashboard returns `clubAccess`.

### Athlete app profile / onboarding photo (new)
- [ ] Commit and push: `app/api/v1/athlete/profile/route.ts`, `app/api/v1/onboarding/complete/route.ts` (accept a base64 photo, single cache-tag on the image URL)

### Athlete app advertising (new)
- [ ] Commit and push: `prisma/schema.prisma` (model `Advertisement`), `prisma/migrations/20261025000000_add_advertisements/`, `app/api/v1/advertisements/`, `app/admin/actions/advertisements.ts`, `components/admin/AdminAdvertisingView.tsx`, `components/admin/AdminSidebar.tsx`, `app/admin/AdminDashboard.tsx`
- [ ] Create the `"Advertisement"` table in production. Either `prisma db push` (see the safety note above) or run the migration SQL. `db push` does not enable row level security, so also run `ALTER TABLE "Advertisement" ENABLE ROW LEVEL SECURITY;`
- [ ] `prisma generate`, and restart any running dev server afterwards (the engine file is locked while it runs)
- [ ] After deploy: add the ads in Admin → Advertising. With no live ads the app hides its carousel (it falls back to its built-in promos only when the API errors). The `advertisements` storage bucket is created automatically on the first image upload.

### Athlete tournament details API (new)
- [ ] Commit and push `app/api/v1/athlete/tournaments/` (guidelines, participants with profile photos, the signed-in athlete's own matches). Participant names, clubs and photos are visible to any signed-in athlete; confirm that is acceptable.

### Manual dashboard steps from the email / OTP work (code is already pushed; confirm each is done)
- [ ] Supabase Auth: generic confirm-signup template and per-tenant reset template pasted; SMTP sender `noreply@ktmsports.com`; Confirm email ON; OTP length 6
- [ ] Vercel env vars: `RESEND_WEBHOOK_SECRET`, `SUPPORT_INBOUND_DOMAIN`; Resend Receiving set up

### Housekeeping (decide, then clean up)
- [ ] `public/email-banners/` is untracked: commit it if the email templates use it, otherwise leave it out
- [ ] `supabase/snippets/Untitled query *.sql` are local scratch files: do not commit (add to `.gitignore` or delete)

## Suggested commit order
1. Ranking v3 + rankings API (production DB already has the migration)
2. Club-subscription gating (live enforcement; push when ready)
3. Onboarding photo / profile fix
4. Advertising (after the production table exists)
5. Tournament details API

## Done
- [x] `ranking_migration_v3.sql` applied to local Supabase (2026-10-25)
- [x] `ranking_migration_v3.sql` applied to production Supabase (2026-10-25)
- [x] Mobile athlete app reads `globalRanking.disciplines` and no longer uses `totalPoints` / `bestRank` (checked in the app code, 2026-10-26)
- [x] Email / OTP / invite changes committed and pushed (up to aa98826)
