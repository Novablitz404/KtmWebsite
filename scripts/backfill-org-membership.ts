/**
 * backfill-org-membership.ts
 *
 * Backfills `organizationMemberId` and `country` for ATHLETE users who
 * don't have organizationMemberId set yet.
 *
 * Targets:
 *   1. Athletes in WOTF-affiliated clubs (any status)
 *   2. Athletes with no club — sets org + Philippines as default
 *
 * Dry run (preview only, no DB writes):
 *   npx tsx scripts/backfill-org-membership.ts
 *
 * Execute for real:
 *   npx tsx scripts/backfill-org-membership.ts --run
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DRY_RUN = !process.argv.includes('--run')
const ORG_ID = 'cmlzymyf70001ggqne6h11why'
const DEFAULT_COUNTRY = 'Philippines'

async function backfillOrgMembership() {
    console.log(DRY_RUN ? '🔍 DRY RUN — no changes will be written\n' : '🚀 LIVE RUN — writing to DB\n')
    console.log(`   Organization ID : ${ORG_ID}`)
    console.log(`   Default country : ${DEFAULT_COUNTRY}\n`)

    try {
        // Find ALL athlete users without organizationMemberId
        const athletes = await prisma.user.findMany({
            where: {
                role: 'ATHLETE',
                organizationMemberId: null,
            },
            select: {
                id: true,
                email: true,
                country: true,
                clubName: true,
            },
        })

        console.log(`Found ${athletes.length} athletes missing organizationMemberId.\n`)

        let updatedCount = 0
        let errorCount = 0

        for (const athlete of athletes) {
            const clubInfo = athlete.clubName ? `club: ${athlete.clubName}` : 'no club'
            const countryNote = !athlete.country
                ? ` + country → ${DEFAULT_COUNTRY}`
                : ` (country: ${athlete.country})`

            if (!DRY_RUN) {
                try {
                    await prisma.user.update({
                        where: { id: athlete.id },
                        data: {
                            organizationMemberId: ORG_ID,
                            ...(!athlete.country && { country: DEFAULT_COUNTRY }),
                        },
                    })
                } catch (err: any) {
                    console.error(`  ❌ Failed for ${athlete.email}:`, err.message || err)
                    errorCount++
                    continue
                }
            }

            console.log(`  ${DRY_RUN ? '📋' : '✅'} ${athlete.email} (${clubInfo})${countryNote}`)
            updatedCount++
        }

        console.log('\n─────────────────────────────')
        if (DRY_RUN) {
            console.log(`📋 Dry run complete — ${updatedCount} would be updated.`)
            console.log(`   To apply: npx tsx scripts/backfill-org-membership.ts --run`)
        } else {
            console.log(`✅ Done! Updated: ${updatedCount} | Errors: ${errorCount}`)
        }

    } catch (error) {
        console.error('Fatal error:', error)
    } finally {
        await prisma.$disconnect()
    }
}

backfillOrgMembership()
