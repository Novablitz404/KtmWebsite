import { prisma } from '@/lib/prisma'

export async function getPlatformStats() {
    try {
        const [
            clubCount,
            athleteCount,
            tournamentCount,
            seminarCount,
            promotionCount,
        ] = await Promise.all([
            prisma.club.count(),
            prisma.user.count({ where: { role: 'ATHLETE' } }),
            prisma.tournament.count(),
            prisma.seminar.count(),
            prisma.promotionTest.count(),
        ])

        // Get club names for context
        const clubs = await prisma.club.findMany({
            select: { name: true },
            orderBy: { name: 'asc' },
            take: 50,
        })

        // Get upcoming events
        const now = new Date()
        const upcomingTournaments = await prisma.tournament.findMany({
            where: { startDate: { gte: now } },
            select: { name: true, startDate: true },
            orderBy: { startDate: 'asc' },
            take: 5,
        })

        const upcomingSeminars = await prisma.seminar.findMany({
            where: { startDate: { gte: now } },
            select: { name: true, startDate: true },
            orderBy: { startDate: 'asc' },
            take: 5,
        })

        const upcomingPromotions = await prisma.promotionTest.findMany({
            where: { testDate: { gte: now } },
            select: { name: true, testDate: true },
            orderBy: { testDate: 'asc' },
            take: 5,
        })

        return {
            clubCount,
            athleteCount,
            tournamentCount,
            seminarCount,
            promotionCount,
            clubNames: clubs.map((c: { name: string }) => c.name),
            upcomingTournaments: upcomingTournaments.map((t: { name: string; startDate: Date }) => ({ name: t.name, date: t.startDate.toISOString().split('T')[0] })),
            upcomingSeminars: upcomingSeminars.map((s: { name: string; startDate: Date }) => ({ name: s.name, date: s.startDate.toISOString().split('T')[0] })),
            upcomingPromotions: upcomingPromotions.map((p: { name: string; testDate: Date }) => ({ name: p.name, date: p.testDate.toISOString().split('T')[0] })),
        }
    } catch (error) {
        console.error('Failed to fetch platform stats:', error)
        return null
    }
}
