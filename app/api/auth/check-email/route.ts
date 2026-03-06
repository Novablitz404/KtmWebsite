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

        // Check if this user has a Supabase Auth account
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Since User.id = Supabase Auth UUID, use getUserById for O(1) lookup
        // This works at any scale (1000, 10000+ users) — no pagination needed
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user.id)

        const hasAuthAccount = !!authUser?.user && !authError

        // Only flag as needing password setup if:
        // The user exists in our DB but has NO Supabase Auth account at all
        // (i.e. truly a migrated user who was never created in Supabase Auth)
        // If they DO have an auth account but entered wrong password, this should NOT trigger.
        const needsPasswordSetup = !hasAuthAccount

        console.log(`[check-email] email="${email.trim()}" dbUser=${!!user} authUser=${hasAuthAccount} needsPasswordSetup=${needsPasswordSetup}`)

        return NextResponse.json({ exists: !!user, needsPasswordSetup })
    } catch (err) {
        console.error('[check-email] Error:', err)
        return NextResponse.json({ exists: false, needsPasswordSetup: false }, { status: 500 })
    }
}
