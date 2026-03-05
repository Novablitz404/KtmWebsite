import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/auth/set-password
 * Allows a migrated user (exists in DB but has no Supabase password) to set
 * their password directly — no email verification needed.
 *
 * Handles two scenarios:
 * 1. User already has a Supabase Auth account (UUID in clerkId) → update password
 * 2. User still has old Clerk ID → create Supabase Auth account with password, update clerkId
 */
export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json()

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
        }

        if (typeof password !== 'string' || password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 })
        }

        // 1. Verify user exists in our DB (case-insensitive email match)
        const dbUser = await prisma.user.findFirst({
            where: {
                email: {
                    equals: email.trim(),
                    mode: 'insensitive',
                }
            },
            select: { id: true, clerkId: true, email: true }
        })

        if (!dbUser) {
            return NextResponse.json({ error: 'No account found with this email.' }, { status: 404 })
        }

        // 2. Use Supabase Admin client
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        const isSupabaseUUID = dbUser.clerkId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dbUser.clerkId)

        if (isSupabaseUUID) {
            // User already has a Supabase Auth account — just update the password
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                dbUser.clerkId!,
                { password }
            )

            if (updateError) {
                console.error('[set-password] Update error:', updateError.message)
                return NextResponse.json({ error: 'Failed to set password. Please try again.' }, { status: 500 })
            }
        } else {
            // User still has old Clerk ID — create a new Supabase Auth account
            const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: dbUser.email,
                password,
                email_confirm: true, // Skip email verification
            })

            if (createError) {
                // If user already exists in Supabase Auth (email match), try to get them and update
                if (createError.message.includes('already been registered') || createError.message.includes('already exists')) {
                    // Look up existing Supabase auth user by email
                    const { data: listData } = await supabaseAdmin.auth.admin.listUsers()
                    const existingAuthUser = listData?.users?.find(
                        u => u.email?.toLowerCase() === dbUser.email.toLowerCase()
                    )

                    if (existingAuthUser) {
                        // Update their password and link the DB record
                        await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, { password })
                        await prisma.user.update({
                            where: { id: dbUser.id },
                            data: { clerkId: existingAuthUser.id }
                        })
                        console.log(`[set-password] Linked existing Supabase user ${existingAuthUser.id} to DB user ${dbUser.id}`)
                        return NextResponse.json({ success: true })
                    }
                }

                console.error('[set-password] Create error:', createError.message)
                return NextResponse.json({ error: 'Failed to create account. Please try again.' }, { status: 500 })
            }

            // Update DB with new Supabase Auth UUID
            await prisma.user.update({
                where: { id: dbUser.id },
                data: { clerkId: newAuthUser.user.id }
            })

            console.log(`[set-password] Created Supabase Auth for ${dbUser.email}, UUID: ${newAuthUser.user.id}`)
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[set-password] Unexpected error:', err)
        return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
    }
}
