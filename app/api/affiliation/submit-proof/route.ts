import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/supabase/server'

/**
 * POST /api/affiliation/submit-proof
 * 
 * Club master submits proof of payment for manual affiliation payment.
 * Updates affiliation status to PENDING_REVIEW.
 */
export async function POST(req: NextRequest) {
    try {
        const dbUser = await getAuthUser()
        if (!dbUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { affiliationId, proofImageUrl } = body

        if (!affiliationId || !proofImageUrl) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Verify the affiliation exists and user is the club master
        const affiliation = await prisma.clubAffiliation.findUnique({
            where: { id: affiliationId },
            include: { club: true }
        })

        if (!affiliation) {
            return NextResponse.json({ error: 'Affiliation not found' }, { status: 404 })
        }

        if (affiliation.club.masterId !== dbUser.id && dbUser.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Only the club master can submit proof of payment' }, { status: 403 })
        }

        // Update with proof and set to pending review
        await prisma.clubAffiliation.update({
            where: { id: affiliationId },
            data: {
                proofImageUrl,
                proofSubmittedAt: new Date(),
                paymentStatus: 'PENDING',
                paymentMethod: 'manual',
                status: 'PENDING_REVIEW',
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Submit proof error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
