import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/auth/check-email
 * Check if a user exists in the DB by email.
 * Used by sign-in forms to distinguish "wrong password" from "migrated user with no password".
 */
export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json()

        if (!email || typeof email !== 'string') {
            return NextResponse.json({ exists: false }, { status: 400 })
        }

        // Use case-insensitive search since emails may be stored in mixed case
        const user = await prisma.user.findFirst({
            where: {
                email: {
                    equals: email.trim(),
                    mode: 'insensitive',
                }
            },
            select: { id: true }
        })

        console.log(`[check-email] email="${email.trim()}" exists=${!!user}`)

        return NextResponse.json({ exists: !!user })
    } catch (err) {
        console.error('[check-email] Error:', err)
        return NextResponse.json({ exists: false }, { status: 500 })
    }
}
