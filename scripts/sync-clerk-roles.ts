import { PrismaClient } from '@prisma/client'
import { createClerkClient } from '@clerk/backend'

const prisma = new PrismaClient()
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

async function syncClerkRoles() {
    console.log('🔄 Starting Clerk Role Sync...')

    try {
        const users = await prisma.user.findMany({
            select: { clerkId: true, role: true, email: true }
        })

        console.log(`Found ${users.length} users in database.`)

        let updatedCount = 0
        let errorCount = 0

        for (const user of users) {
            if (!user.clerkId || !user.role) {
                console.warn(`⚠️ Skipping user ${user.email}: Missing Clerk ID or Role`)
                continue
            }

            try {
                await clerk.users.updateUser(user.clerkId, {
                    publicMetadata: {
                        role: user.role
                    }
                })
                process.stdout.write('.') // Progress dot
                updatedCount++
            } catch (error) {
                process.stdout.write('x')
                console.error(`\n❌ Failed to update ${user.email} (${user.clerkId}):`, error)
                errorCount++
            }
        }

        console.log('\n\n✅ Sync Complete!')
        console.log(`Updated: ${updatedCount}`)
        console.log(`Errors: ${errorCount}`)

    } catch (error) {
        console.error('Fatal Error:', error)
    } finally {
        await prisma.$disconnect()
    }
}

syncClerkRoles()
