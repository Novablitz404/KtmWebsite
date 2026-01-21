// Run with: npx ts-node scripts/clean-database.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ADMIN_EMAIL = 'ericjann21@gmail.com'

async function cleanDatabase() {
    console.log('🧹 Starting database cleanup...')
    console.log(`📌 Keeping admin user: ${ADMIN_EMAIL}`)

    // Find admin user to preserve
    const adminUser = await prisma.user.findUnique({
        where: { email: ADMIN_EMAIL }
    })

    if (!adminUser) {
        console.log('⚠️  Admin user not found in database. Proceeding with full cleanup...')
    } else {
        console.log(`✅ Found admin user: ${adminUser.id} (${adminUser.name})`)
    }

    // Delete in correct order to avoid foreign key issues
    console.log('\n🗑️  Deleting records...')

    // 1. Delete match/bracket data
    const matchCount = await prisma.match.deleteMany({})
    console.log(`   - Matches: ${matchCount.count}`)

    // 2. Delete players
    const playerCount = await prisma.player.deleteMany({})
    console.log(`   - Players: ${playerCount.count}`)

    // 3. Delete categories
    const categoryCount = await prisma.category.deleteMany({})
    console.log(`   - Categories: ${categoryCount.count}`)

    // 4. Delete tournament manager invites
    const tmInviteCount = await prisma.tournamentManagerInvite.deleteMany({})
    console.log(`   - Tournament Manager Invites: ${tmInviteCount.count}`)

    // 5. Delete club event participations
    const participationCount = await prisma.clubEventParticipation.deleteMany({})
    console.log(`   - Club Event Participations: ${participationCount.count}`)

    // 6. Delete tournaments
    const tournamentCount = await prisma.tournament.deleteMany({})
    console.log(`   - Tournaments: ${tournamentCount.count}`)

    // 7. Delete promotion test registrations
    const promoRegCount = await prisma.promotionTestRegistration.deleteMany({})
    console.log(`   - Promotion Test Registrations: ${promoRegCount.count}`)

    // 8. Delete promotion tests
    const promoTestCount = await prisma.promotionTest.deleteMany({})
    console.log(`   - Promotion Tests: ${promoTestCount.count}`)

    // 9. Delete announcements
    const announcementCount = await prisma.announcement.deleteMany({})
    console.log(`   - Announcements: ${announcementCount.count}`)

    // 10. Delete clubs
    const clubCount = await prisma.club.deleteMany({})
    console.log(`   - Clubs: ${clubCount.count}`)

    // 11. Delete organizations
    const orgCount = await prisma.organization.deleteMany({})
    console.log(`   - Organizations: ${orgCount.count}`)

    // 12. Delete invites
    const orgInviteCount = await prisma.organizationInvite.deleteMany({})
    console.log(`   - Organization Invites: ${orgInviteCount.count}`)

    const clubAssistantInviteCount = await prisma.clubAssistantInvite.deleteMany({})
    console.log(`   - Club Assistant Invites: ${clubAssistantInviteCount.count}`)

    // 13. Delete push subscriptions & notifications
    const pushSubCount = await prisma.pushSubscription.deleteMany({})
    console.log(`   - Push Subscriptions: ${pushSubCount.count}`)

    const notificationCount = await prisma.notification.deleteMany({})
    console.log(`   - Notifications: ${notificationCount.count}`)

    // 14. Delete API keys
    const apiKeyCount = await prisma.apiKey.deleteMany({})
    console.log(`   - API Keys: ${apiKeyCount.count}`)

    // 15. Delete guideline templates (weight categories and divisions cascade)
    const templateCount = await prisma.guidelineTemplate.deleteMany({})
    console.log(`   - Guideline Templates: ${templateCount.count}`)

    // 16. Delete users EXCEPT admin
    const userCount = await prisma.user.deleteMany({
        where: {
            email: { not: ADMIN_EMAIL }
        }
    })
    console.log(`   - Users (except admin): ${userCount.count}`)

    console.log('\n✅ Database cleanup complete!')

    // Show remaining data
    const remainingUsers = await prisma.user.count()
    console.log(`\n📊 Remaining records:`)
    console.log(`   - Users: ${remainingUsers}`)
}

cleanDatabase()
    .catch((e) => {
        console.error('❌ Error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
