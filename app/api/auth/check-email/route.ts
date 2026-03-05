import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/auth/check-email
 * Check if a user exists in the DB by email AND has never signed in via Supabase Auth.
 * Only returns { exists: true, needsPasswordSetup: true } for genuine migrated users.
 */
export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json()

        if (!email || typeof email !== 'string') {
            return NextResponse.json({ exists: false, needsPasswordSetup: false }, { status: 400 })
        }

        // Check if user exists in the app DB
        const user = await prisma.user.findFirst({
            where: {
                email: {
                    equals: email.trim(),
                    mode: 'insensitive',
                }
            },
            select: { id: true }
        })

        if (!user) {
            return NextResponse.json({ exists: false, needsPasswordSetup: false })
        }

        // Check if this user has ever signed in via Supabase Auth
        // A migrated user will have last_sign_in_at = NULL (never signed in with password)
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: authUsers } = await supabase.auth.admin.listUsers()
        const authUser = authUsers?.users?.find(
            u => u.email?.toLowerCase() === email.trim().toLowerCase()
        )

        // Only flag as needing password setup if:
        // 1. No auth user exists (migrated from another system), OR
        // 2. Auth user exists but has NEVER signed in
        const needsPasswordSetup = !authUser || !authUser.last_sign_in_at

        console.log(`[check-email] email="${email.trim()}" exists=${!!user} needsPasswordSetup=${needsPasswordSetup}`)

        return NextResponse.json({ exists: !!user, needsPasswordSetup })
    } catch (err) {
        console.error('[check-email] Error:', err)
        return NextResponse.json({ exists: false, needsPasswordSetup: false }, { status: 500 })
    }
}
