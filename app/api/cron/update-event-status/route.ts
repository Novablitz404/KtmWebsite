import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/cron/update-event-status
 * 
 * Vercel Cron Job — runs daily at midnight (UTC+8).
 * Automatically marks tournaments, seminars, and promotions as COMPLETED
 * if their event date has passed and they're still in an active status.
 */
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    // Verify cron secret to prevent unauthorized calls
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const results: Record<string, number> = {}

    try {
        // 1. Tournaments — mark COMPLETED if startDate has passed (skip TBA)
        const tournaments = await prisma.tournament.updateMany({
            where: {
                startDate: { lt: now },
                status: { in: ['UPCOMING', 'ONGOING', 'OPEN'] },
                dateTBA: false,
            },
            data: { status: 'COMPLETED' },
        })
        results.tournaments = tournaments.count

        // 2. Seminars — mark COMPLETED if endDate (or startDate) has passed
        const seminars = await prisma.seminar.updateMany({
            where: {
                OR: [
                    { endDate: { lt: now }, status: { in: ['UPCOMING', 'OPEN'] } },
                    { endDate: null, startDate: { lt: now }, status: { in: ['UPCOMING', 'OPEN'] } },
                ],
            },
            data: { status: 'COMPLETED' },
        })
        results.seminars = seminars.count

        // 3. Promotions — mark COMPLETED if testDate has passed
        const promotions = await prisma.promotionTest.updateMany({
            where: {
                testDate: { lt: now },
                status: { in: ['UPCOMING', 'OPEN'] },
            },
            data: { status: 'COMPLETED' },
        })
        results.promotions = promotions.count

        console.log(`[Cron] Event status update: ${JSON.stringify(results)}`)

        return NextResponse.json({
            success: true,
            updated: results,
            timestamp: now.toISOString(),
        })
    } catch (error: any) {
        console.error('[Cron] Event status update failed:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
