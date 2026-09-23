/**
 * Seeds a PromotionTest whose testDate is 5 days in the past, so its
 * examiner link (default: testDate + 3 days) is already expired. Use this to
 * verify the "Link Expired" screen and the organizer's Extend Link control:
 *
 *   1. Sign in as the local test organizer (tapelite@gmail.com).
 *   2. Visit /promotions/<printed id>/examiner — should show "Link Expired".
 *   3. Open /promotions/<printed id>?tab=participants and click "Extend Link".
 *   4. Re-visit the examiner link — should now load normally.
 *
 * Safe to re-run — creates a fresh promotion test each time.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const organizer = await prisma.user.findUnique({ where: { email: 'tapelite@gmail.com' }, include: { organization: true } })
    if (!organizer?.organization) throw new Error('Expected local test organizer (tapelite@gmail.com) with an organization not found — run the earlier local test-account setup first.')

    const testDate = new Date()
    testDate.setDate(testDate.getDate() - 5)

    const promotionTest = await prisma.promotionTest.create({
        data: {
            organizationId: organizer.organization.id,
            name: `Expired Examiner Link Test ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
            testDate,
            status: 'COMPLETED',
            visibility: 'PRIVATE',
        }
    })

    console.log(`Created PromotionTest ${promotionTest.id}`)
    console.log(`  testDate: ${testDate.toISOString()} (5 days ago — examiner link expired 2 days ago)`)
    console.log(`  Examiner link: /promotions/${promotionTest.id}/examiner`)
    console.log(`  Manage page:   /promotions/${promotionTest.id}?tab=participants`)
}

main().finally(() => prisma.$disconnect())
