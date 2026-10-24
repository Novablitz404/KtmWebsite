import { authenticateApi, apiError, apiResponse } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'

// GET /api/v1/athlete/ratings — Elo ratings (Kyorugi / Poomsae) and tournament results
export async function GET() {
    try {
        const user = await authenticateApi()
        if (!user) return apiError('Unauthorized', 401)

        const [ratings, results] = await Promise.all([
            prisma.athleteEloRating.findMany({
                where: { userId: user.id },
                orderBy: { rating: 'desc' },
                select: { type: true, scope: true, organizationId: true, rating: true, matchCount: true, lastMatchAt: true },
            }),
            prisma.player.findMany({
                where: { userId: user.id },
                orderBy: { createdAt: 'desc' },
                take: 50,
                select: {
                    id: true, medal: true, division: true, belt: true, registrationStatus: true, paymentStatus: true, createdAt: true,
                    category: { select: { name: true, type: true, tournament: { select: { id: true, name: true, startDate: true } } } },
                },
            }),
        ])

        return apiResponse({ ratings, results })
    } catch (error) {
        console.error('Athlete ratings error:', error)
        return apiError('Failed to fetch ratings', 500)
    }
}
