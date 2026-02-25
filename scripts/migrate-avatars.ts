/**
 * One-time migration script: Download Clerk avatars and upload to Supabase Storage.
 * 
 * Usage: npx tsx scripts/migrate-avatars.ts
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { createClerkClient } from '@clerk/backend'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()

const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY!,
})

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET = 'avatars'

async function migrateAvatars() {
    console.log('🔄 Starting avatar migration from Clerk to Supabase Storage...\n')

    // 1. Get all users with a clerkId
    const users = await prisma.user.findMany({
        where: { clerkId: { not: null } },
        select: { id: true, clerkId: true, name: true, imageUrl: true }
    })

    console.log(`Found ${users.length} users with Clerk IDs\n`)

    let migrated = 0
    let skipped = 0
    let failed = 0

    // 2. Batch fetch Clerk users (max 100 per call)
    const clerkIds = users.map(u => u.clerkId).filter(Boolean) as string[]
    const clerkUserMap = new Map<string, string>()

    for (let i = 0; i < clerkIds.length; i += 100) {
        const batch = clerkIds.slice(i, i + 100)
        try {
            const clerkUsers = await clerk.users.getUserList({
                userId: batch,
                limit: 100
            })
            clerkUsers.data.forEach(u => {
                if (u.imageUrl) {
                    clerkUserMap.set(u.id, u.imageUrl)
                }
            })
        } catch (error) {
            console.error(`Failed to fetch Clerk batch ${i}-${i + 100}:`, error)
        }
    }

    console.log(`Fetched ${clerkUserMap.size} Clerk avatars\n`)

    // 3. Download each image and upload to Supabase Storage
    for (const user of users) {
        const clerkImageUrl = user.clerkId ? clerkUserMap.get(user.clerkId) : null

        if (!clerkImageUrl) {
            console.log(`⏭  ${user.name || user.id} — no Clerk avatar, skipping`)
            skipped++
            continue
        }

        // Skip default Clerk avatars (they contain "gravatar" or are generic)
        if (clerkImageUrl.includes('gravatar') || clerkImageUrl.includes('ui-avatars')) {
            console.log(`⏭  ${user.name || user.id} — default avatar, skipping`)
            skipped++
            continue
        }

        try {
            // Download the image
            const response = await fetch(clerkImageUrl)
            if (!response.ok) {
                console.log(`❌ ${user.name || user.id} — failed to download (${response.status})`)
                failed++
                continue
            }

            const blob = await response.blob()
            const buffer = Buffer.from(await blob.arrayBuffer())

            // Upload to Supabase Storage
            const filePath = `${user.id}`
            const { error: uploadError } = await supabase.storage
                .from(BUCKET)
                .upload(filePath, buffer, {
                    contentType: blob.type || 'image/jpeg',
                    upsert: true
                })

            if (uploadError) {
                console.log(`❌ ${user.name || user.id} — upload failed: ${uploadError.message}`)
                failed++
                continue
            }

            // Get the public URL
            const { data: { publicUrl } } = supabase.storage
                .from(BUCKET)
                .getPublicUrl(filePath)

            // Update the database
            await prisma.user.update({
                where: { id: user.id },
                data: { imageUrl: publicUrl }
            })

            console.log(`✅ ${user.name || user.id} — migrated successfully`)
            migrated++
        } catch (error) {
            console.log(`❌ ${user.name || user.id} — error: ${error}`)
            failed++
        }
    }

    console.log(`\n${'='.repeat(50)}`)
    console.log(`Migration complete!`)
    console.log(`  ✅ Migrated: ${migrated}`)
    console.log(`  ⏭  Skipped:  ${skipped}`)
    console.log(`  ❌ Failed:   ${failed}`)
    console.log(`  📊 Total:    ${users.length}`)

    await prisma.$disconnect()
}

migrateAvatars().catch(console.error)
