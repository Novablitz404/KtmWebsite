import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/v1/onboarding/check-email  { email }
 * -> { available: boolean }
 *
 * Same rule as the website's checkEmailAvailability: an email is taken only when a user row exists AND has an
 * auth account linked. A row without one was pre-registered by a club master and may still sign up.
 */
export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json()
        if (!email || typeof email !== 'string') return NextResponse.json({ error: 'Email is required' }, { status: 400 })

        const user = await prisma.user.findFirst({
            where: { email: { equals: email.trim(), mode: 'insensitive' } },
            select: { clerkId: true },
        })
        return NextResponse.json({ data: { available: !user || !user.clerkId }, error: null })
    } catch (error) {
        console.error('[check-email] Error:', error)
        return NextResponse.json({ error: 'Failed to check email' }, { status: 500 })
    }
}
