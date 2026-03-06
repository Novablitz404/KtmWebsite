import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/event/promo/validate
 * 
 * Validates a promo code for a tournament.
 * Returns discount info if valid, error if not.
 */
export async function POST(req: NextRequest) {
    try {
        const { tournamentId, code } = await req.json()

        if (!tournamentId || !code) {
            return NextResponse.json({ error: 'Missing tournamentId or code' }, { status: 400 })
        }

        const promoCode = await prisma.promoCode.findUnique({
            where: {
                tournamentId_code: {
                    tournamentId,
                    code: code.toUpperCase().trim()
                }
            }
        })

        if (!promoCode) {
            return NextResponse.json({ error: 'Invalid promo code' }, { status: 404 })
        }

        if (!promoCode.isActive) {
            return NextResponse.json({ error: 'This promo code is no longer active' }, { status: 400 })
        }

        const now = new Date()
        if (now < promoCode.validFrom || now > promoCode.validUntil) {
            return NextResponse.json({ error: 'This promo code has expired' }, { status: 400 })
        }

        if (promoCode.maxUses && promoCode.currentUses >= promoCode.maxUses) {
            return NextResponse.json({ error: 'This promo code has reached its usage limit' }, { status: 400 })
        }

        return NextResponse.json({
            valid: true,
            discountType: promoCode.discountType,
            discountValue: promoCode.discountValue,
            code: promoCode.code,
        })
    } catch (error) {
        console.error('Promo validation error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
