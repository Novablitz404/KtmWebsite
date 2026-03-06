import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/supabase/server'

/**
 * POST /api/affiliation/pay
 * 
 * Initiates affiliation payment for a club.
 * Creates or updates a ClubAffiliation record and redirects to Xendit.
 */
export async function POST(req: NextRequest) {
    try {
        const dbUser = await getAuthUser()
        if (!dbUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { clubId } = body

        if (!clubId) {
            return NextResponse.json({ error: 'Club ID is required' }, { status: 400 })
        }

        // Verify user is the club master
        const club = await prisma.club.findUnique({
            where: { id: clubId },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                        affiliationFee: true,
                    }
                }
            }
        })

        if (!club) {
            return NextResponse.json({ error: 'Club not found' }, { status: 404 })
        }
        if (club.masterId !== dbUser.id && dbUser.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Only the club master can pay affiliation fees' }, { status: 403 })
        }
        if (!club.organization) {
            return NextResponse.json({ error: 'Club is not linked to an organization' }, { status: 400 })
        }
        if (!club.organization.affiliationFee || club.organization.affiliationFee <= 0) {
            return NextResponse.json({ error: 'Organization has no affiliation fee set' }, { status: 400 })
        }

        const fee = club.organization.affiliationFee

        // Create or update the affiliation record
        const affiliation = await prisma.clubAffiliation.upsert({
            where: {
                clubId_organizationId: {
                    clubId: club.id,
                    organizationId: club.organization.id,
                }
            },
            create: {
                clubId: club.id,
                organizationId: club.organization.id,
                status: 'UNPAID',
                paymentStatus: 'PENDING',
            },
            update: {
                paymentStatus: 'PENDING',
            }
        })

        // Return data for the checkout call
        return NextResponse.json({
            success: true,
            affiliationId: affiliation.id,
            amount: fee,
            clubName: club.name,
            organizationName: club.organization.name,
        })
    } catch (error) {
        console.error('Affiliation payment error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
