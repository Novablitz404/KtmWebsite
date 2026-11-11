/**
 * One-time: give every athlete the free 2026 license (valid until the end of
 * Dec 31, 2026, Manila time). After that they renew or drop out of the rankings.
 *
 * NON-DESTRUCTIVE by design:
 *   - Elo ratings, matches, registrations, medals — nothing outside the license
 *     fields is touched. Unlicensed athletes keep every rating they already have.
 *   - An existing athlete number and createdAt are kept; only missing numbers are
 *     generated.
 *   - Before changing anything, the current license columns of every user are
 *     copied into a NEW table "User_license_backup_20261110" (never overwritten
 *     if it already exists), so everything can be restored.
 *   - Pending license requests are left exactly as they are.
 *   - Safe to re-run: athletes who already have an active dated license are skipped.
 *
 * Run order: license_migration_1_column.sql FIRST (adds the column), then:
 *   npx tsx scripts/activate-free-licenses-2026.ts            (dry run — counts only, no writes)
 *   npx tsx scripts/activate-free-licenses-2026.ts --apply    (backup, then activate)
 * Afterwards run ranking_migration_v5.sql and license_expiry_cron.sql.
 */

import { PrismaClient } from '@prisma/client'
import { grantFreeLicense, isFreeLicensePromoActive, FREE_LICENSE_PROMO_END } from '../lib/athlete-license'
import { refreshGlobalRanking } from '../lib/gss-ranking'

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')
const BACKUP_TABLE = 'User_license_backup_20261110'

async function main() {
    console.log(apply ? '🔴 LIVE MODE — backing up, then activating\n' : '🟢 DRY RUN — no writes will happen\n')

    if (!isFreeLicensePromoActive()) {
        console.log('The free-license period has ended (after 2026-12-31). Nothing to do.')
        return
    }

    const now = new Date()
    const athletes = await prisma.user.findMany({
        where: { role: 'ATHLETE' },
        select: { id: true, isVerified: true, licenseExpiresAt: true, athleteNumber: true, licensePaymentStatus: true },
    })

    const alreadyActive = athletes.filter(a => a.isVerified && a.licenseExpiresAt && a.licenseExpiresAt > now)
    const verifiedNoDate = athletes.filter(a => a.isVerified && !a.licenseExpiresAt)
    const unlicensed = athletes.filter(a => !a.isVerified)
    const needNumber = unlicensed.filter(a => !a.athleteNumber)
    const pending = athletes.filter(a => a.licensePaymentStatus === 'PENDING_ACTIVATION')

    console.log(`Athletes total:                         ${athletes.length}`)
    console.log(`  already active, with an end date:     ${alreadyActive.length}  (skipped)`)
    console.log(`  licensed but no end date yet:         ${verifiedNoDate.length}  (will get ${FREE_LICENSE_PROMO_END.toISOString()})`)
    console.log(`  unlicensed:                           ${unlicensed.length}  (will be activated, Elo kept)`)
    console.log(`    of which need a new athlete number: ${needNumber.length}`)
    console.log(`  pending license requests:             ${pending.length}  (left untouched)`)

    if (!apply) {
        console.log('\nNothing was changed. Re-run with --apply to proceed.')
        return
    }

    // 1) Backup — a brand-new table, only created if it doesn't exist yet.
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "${BACKUP_TABLE}" AS
        SELECT id, role, "isVerified", "athleteNumber", "createdAt",
               "licensePaymentStatus", "licenseRequestedVia", "licenseExpiresAt"
        FROM "User"
    `)
    // Supabase exposes public tables over its REST API — keep the backup private.
    await prisma.$executeRawUnsafe(`ALTER TABLE "${BACKUP_TABLE}" ENABLE ROW LEVEL SECURITY`)
    const [{ count }] = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT COUNT(*) AS count FROM "${BACKUP_TABLE}"`)
    console.log(`\nBackup table "${BACKUP_TABLE}" holds ${count} user row(s).`)

    // 2) Activate
    const targets = [...verifiedNoDate, ...unlicensed]
    let granted = 0
    let failed = 0
    for (const a of targets) {
        try {
            if (await grantFreeLicense(a.id, { force: true })) granted++
        } catch (err) {
            failed++
            console.error(`  failed for ${a.id}:`, err)
        }
    }
    console.log(`Activated ${granted} athlete(s)${failed ? `, ${failed} failed (re-run to retry)` : ''}.`)

    // 3) Make the public ranking show them right away
    await refreshGlobalRanking()
    console.log('Ranking view refreshed.')
}

main()
    .catch(e => { console.error(e); process.exit(1) })
    .finally(() => prisma.$disconnect())
