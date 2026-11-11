import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processTournamentCompletion } from '@/lib/gss-ranking'
import { grantFreeLicensesToNewAthletes } from '@/lib/athlete-license'

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
        // Find tournaments that are about to be completed (for GSS processing)
        const tournamentsToComplete = await prisma.tournament.findMany({
            where: {
                startDate: { lt: now },
                status: { in: ['UPCOMING', 'ONGOING', 'OPEN'] },
                dateTBA: false,
            },
            select: { id: true },
        })

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

        // GSS: Process field strength bonuses for each completed tournament
        for (const t of tournamentsToComplete) {
            processTournamentCompletion(t.id).catch(err => {
                console.error(`[GSS] Tournament completion processing failed for ${t.id}:`, err)
            })
        }

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

        // 4. Free 2026 license safety net — licenses any athlete who slipped past signup (no-op after Dec 31, 2026)
        results.freeLicensesGranted = await grantFreeLicensesToNewAthletes().catch(err => {
            console.error('[Cron] free license sweep failed:', err)
            return 0
        })

        // 5. License renewal reminders — athletes (and their club masters) 30 and 7 days before expiry.
        //    Each athlete falls in a given 24h window exactly once, so no duplicates are sent.
        try {
            const DAY = 24 * 60 * 60 * 1000
            let reminded = 0
            for (const days of [30, 7]) {
                const expiring = await prisma.user.findMany({
                    where: {
                        role: 'ATHLETE',
                        isVerified: true,
                        licenseExpiresAt: { gt: new Date(now.getTime() + (days - 1) * DAY), lte: new Date(now.getTime() + days * DAY) },
                    },
                    select: { id: true, name: true, clubName: true, licenseExpiresAt: true },
                })
                if (expiring.length === 0) continue

                const when = expiring[0].licenseExpiresAt!.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Manila' })
                await prisma.notification.createMany({
                    data: expiring.map(u => ({
                        userId: u.id,
                        title: 'Your athlete license is expiring soon',
                        body: `Your license expires on ${when}. Renew it to stay in the rankings and keep earning GSS points.`,
                        url: '/athlete',
                    })),
                })
                reminded += expiring.length

                // One summary per club master
                const byClub = new Map<string, number>()
                for (const u of expiring) if (u.clubName) byClub.set(u.clubName, (byClub.get(u.clubName) ?? 0) + 1)
                const clubs = await prisma.club.findMany({ where: { name: { in: [...byClub.keys()] } }, select: { name: true, masterId: true } })
                await prisma.notification.createMany({
                    data: clubs.map(c => ({
                        userId: c.masterId,
                        title: 'Athlete licenses expiring soon',
                        body: `${byClub.get(c.name)} athlete license${byClub.get(c.name) === 1 ? '' : 's'} in your club expire on ${when}. Request renewals so they stay in the rankings.`,
                        url: '/club',
                    })),
                })
            }
            results.licenseReminders = reminded
        } catch (err) {
            console.error('[Cron] license reminders failed:', err)
        }

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
