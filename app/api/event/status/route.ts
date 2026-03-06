import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/event/status
 * 
 * Look up guest registration status by email + tournamentId.
 * No auth required — used by the public status page.
 */
export async function POST(req: NextRequest) {
    try {
        const { email, tournamentId } = await req.json()

        if (!email || !tournamentId) {
            return NextResponse.json({ error: 'Email and tournament ID are required' }, { status: 400 })
        }

        const registrations = await prisma.guestRegistration.findMany({
            where: {
                email: email.toLowerCase().trim(),
                tournamentId,
            },
            include: {
                player: {
                    select: {
                        id: true,
                        name: true,
                        paymentStatus: true,
                        registrationStatus: true,
                        category: {
                            select: { name: true, type: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        if (registrations.length === 0) {
            return NextResponse.json({
                found: false,
                message: 'No registrations found for this email'
            })
        }

        return NextResponse.json({
            found: true,
            registrations: registrations.map(reg => ({
                registrationCode: reg.registrationCode,
                fullName: reg.fullName,
                category: reg.player.category?.name || 'Pending',
                categoryType: reg.player.category?.type || 'Unknown',
                paymentStatus: reg.player.paymentStatus,
                registrationStatus: reg.player.registrationStatus,
                registeredAt: reg.createdAt,
            }))
        })
    } catch (error) {
        console.error('Status lookup error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
