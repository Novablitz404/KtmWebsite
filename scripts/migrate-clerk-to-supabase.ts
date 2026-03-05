/**
 * Migrate users from Clerk to Supabase Auth.
 * 
 * This script:
 * 1. Reads all users from the DB (who have clerkId set)
 * 2. Creates Supabase Auth accounts WITHOUT passwords (email confirmed)
 * 3. Updates the DB clerkId to store the new Supabase Auth UUID
 * 
 * Users will set their password on first login via the smart reset flow.
 * 
 * Usage: npx tsx scripts/migrate-clerk-to-supabase.ts
 */

import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
)

async function main() {
    console.log('🔄 Starting Clerk → Supabase Auth migration...\n')

    // Fetch all users with a clerkId (i.e., existing Clerk users)
    const users = await prisma.user.findMany({
        select: { id: true, clerkId: true, email: true, name: true, role: true },
    })

    console.log(`Found ${users.length} users to migrate.\n`)

    let success = 0
    let failed = 0
    let skipped = 0

    for (const user of users) {
        // Skip users without a clerkId — don't create Supabase accounts for them
        if (!user.clerkId) {
            console.log(`⏭️  ${user.email} — no clerkId, skipping`)
            skipped++
            continue
        }

        try {
            // Check if a Supabase Auth account already exists for this email
            const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({
                page: 1,
                perPage: 1,
            })

            // Try to find existing user by email in Supabase Auth
            const { data: { users: matchedUsers } } = await supabaseAdmin.auth.admin.listUsers()
            const existingSupaUser = matchedUsers?.find(u => u.email === user.email)

            if (existingSupaUser) {
                // User already exists in Supabase Auth — update clerkId to match
                if (user.clerkId !== existingSupaUser.id) {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { clerkId: existingSupaUser.id },
                    })
                    console.log(`⏩ ${user.email} — already in Supabase, updated clerkId`)
                } else {
                    console.log(`⏩ ${user.email} — already migrated`)
                }
                skipped++
                continue
            }

            // Create Supabase Auth account (no password — user will set via reset flow)
            const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
                email: user.email,
                email_confirm: true, // Skip email verification — they're existing users
                user_metadata: {
                    name: user.name,
                    role: user.role,
                    db_user_id: user.id,
                },
            })

            if (error) {
                console.error(`❌ ${user.email} — ${error.message}`)
                failed++
                continue
            }

            // Update DB clerkId to the new Supabase Auth UUID
            await prisma.user.update({
                where: { id: user.id },
                data: { clerkId: newUser.user.id },
            })

            console.log(`✅ ${user.email} → ${newUser.user.id}`)
            success++

        } catch (err: any) {
            console.error(`❌ ${user.email} — ${err.message}`)
            failed++
        }
    }

    console.log('\n' + '='.repeat(50))
    console.log(`Migration complete!`)
    console.log(`  ✅ Success: ${success}`)
    console.log(`  ⏩ Skipped: ${skipped}`)
    console.log(`  ❌ Failed:  ${failed}`)
    console.log(`  📊 Total:   ${users.length}`)
    console.log('='.repeat(50))

    await prisma.$disconnect()
}

main().catch((err) => {
    console.error('Migration failed:', err)
    process.exit(1)
})
