import { PrismaClient } from '@prisma/client'
import { createClerkClient } from '@clerk/backend'

const prisma = new PrismaClient()
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

async function syncTenantMetadata() {
    console.log('🔄 Starting Clerk Tenant Metadata Sync...')
    console.log('   Setting tenant: "wotf-global" for all users\n')

    try {
        const users = await prisma.user.findMany({
            select: { clerkId: true, email: true }
        })

        console.log(`Found ${users.length} users in database.\n`)

        let updatedCount = 0
        let skippedCount = 0
        let errorCount = 0

        for (const user of users) {
            if (!user.clerkId) {
                console.warn(`⚠️ Skipping ${user.email}: No Clerk ID`)
                skippedCount++
                continue
            }

            try {
                // Fetch existing metadata to merge (not overwrite)
                const clerkUser = await clerk.users.getUser(user.clerkId)
                const existingMeta = (clerkUser.publicMetadata as Record<string, any>) || {}

                // Skip only if already set to wotf (overwrites ktm or anything else)
                if (existingMeta.tenant === 'wotf-global') {
                    process.stdout.write('s') // already set
                    skippedCount++
                    continue
                }

                if (existingMeta.tenant && existingMeta.tenant !== 'wotf-global') {
                    process.stdout.write('o') // overwriting
                }

                await clerk.users.updateUser(user.clerkId, {
                    publicMetadata: {
                        ...existingMeta,
                        tenant: 'wotf-global',
                    }
                })
                process.stdout.write('.')
                updatedCount++
            } catch (error: any) {
                process.stdout.write('x')
                console.error(`\n❌ Failed: ${user.email} (${user.clerkId}):`, error.message || error)
                errorCount++
            }
        }

        console.log('\n\n✅ Tenant Metadata Sync Complete!')
        console.log(`   Updated: ${updatedCount}`)
        console.log(`   Skipped (already set): ${skippedCount}`)
        console.log(`   Errors: ${errorCount}`)

    } catch (error) {
        console.error('Fatal Error:', error)
    } finally {
        await prisma.$disconnect()
    }
}

syncTenantMetadata()
