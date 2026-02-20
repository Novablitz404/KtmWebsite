/**
 * Migration Script: Sync profileComplete to Clerk publicMetadata for existing users
 * 
 * This script:
 * 1. Reads all users from the database
 * 2. Checks if they have a complete profile (name + weight/height for athletes, or just name for others)
 * 3. Sets profileComplete: true in their Clerk publicMetadata
 * 
 * Run with: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/migrate-clerk-metadata.ts
 * Or: npx tsx scripts/migrate-clerk-metadata.ts
 */

import { PrismaClient } from '@prisma/client'
import { createClerkClient } from '@clerk/backend'

const prisma = new PrismaClient()

const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY!,
})

async function migrateClerkMetadata() {
    console.log('🔄 Starting Clerk metadata migration...\n')

    const users = await prisma.user.findMany({
        where: { clerkId: { not: null } },
        select: {
            id: true,
            clerkId: true,
            name: true,
            role: true,
            weight: true,
            height: true,
        }
    })

    console.log(`Found ${users.length} users with Clerk IDs\n`)

    let successCount = 0
    let skipCount = 0
    let errorCount = 0

    for (const user of users) {
        if (!user.clerkId) {
            skipCount++
            continue
        }

        // Determine if profile is complete
        const isAthlete = user.role === 'ATHLETE'
        const profileComplete = isAthlete
            ? !!(user.name && user.weight && user.height)
            : !!user.name

        try {
            await clerk.users.updateUser(user.clerkId, {
                publicMetadata: {
                    role: user.role,
                    profileComplete
                }
            })
            console.log(`✅ ${user.id} (${user.role}) → profileComplete: ${profileComplete}`)
            successCount++
        } catch (error: any) {
            console.error(`❌ ${user.id}: ${error.message}`)
            errorCount++
        }

        // Rate limiting — Clerk has a limit of ~20 req/s
        await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log(`\n🏁 Migration complete!`)
    console.log(`   ✅ Success: ${successCount}`)
    console.log(`   ⏭️  Skipped: ${skipCount}`)
    console.log(`   ❌ Errors:  ${errorCount}`)

    await prisma.$disconnect()
}

migrateClerkMetadata().catch(console.error)
