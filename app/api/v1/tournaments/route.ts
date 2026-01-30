import { authenticateApi, apiError, apiResponse } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
    try {
        const user = await authenticateApi()
        // Allow any authenticated user (Athlete, Club Master, etc.)
        if (!user) return apiError('Unauthorized', 401)

        const { searchParams } = new URL(request.url)
        const filter = searchParams.get('filter') // 'OPEN' or 'ALL'

        const now = new Date()

        const tournaments = await prisma.tournament.findMany({
            where: {
                // Show upcoming or ongoing
                startDate: { gte: new Date(now.setHours(0, 0, 0, 0)) },
                status: { not: 'CANCELLED' }
            },
            select: {
                id: true,
                name: true,
                startDate: true,
                venue: true,
                status: true,
                tier: true,
                headerImageUrl: true,
                registrationEnd: true,
                organizer: {
                    select: {
                        name: true,
                        organization: {
                            select: { name: true }
                        }
                    }
                }
            },
            orderBy: { startDate: 'asc' },
            take: 20
        })

        return apiResponse(tournaments)

    } catch (error) {
        console.error('Tournaments list error:', error)
        return apiError('Failed to fetch tournaments', 500)
    }
}
