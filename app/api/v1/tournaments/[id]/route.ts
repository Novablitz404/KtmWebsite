import { authenticateApi, apiError, apiResponse } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const user = await authenticateApi()
        if (!user) return apiError('Unauthorized', 401)

        const params = await context.params
        const { id } = params

        if (!id) return apiError('Tournament ID required', 400)

        const tournament = await prisma.tournament.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                startDate: true,
                venue: true,
                status: true,
                tier: true,
                headerImageUrl: true,
                registrationStart: true,
                registrationEnd: true,
                guidelinesText: true,
                organizer: {
                    select: {
                        name: true,
                        organization: {
                            select: { name: true, logoUrl: true }
                        }
                    }
                },
                categories: {
                    where: { type: 'KYORUGI' }, // Separate by type if needed
                    select: {
                        id: true,
                        name: true,
                        gender: true,
                        belt: true,
                        minAge: true,
                        maxAge: true,
                        minWeight: true,
                        maxWeight: true
                    }
                }
            }
        })

        if (!tournament) {
            return apiError('Tournament not found', 404)
        }

        return apiResponse(tournament)

    } catch (error) {
        console.error('Tournament detail error:', error)
        return apiError('Failed to fetch tournament', 500)
    }
}
