import { apiError, apiResponse, getApiAuthUser } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'

// GET /api/v1/advertisements — the ads the athlete app shows in its home carousel, in display order.
// Only ads that are switched on and inside their schedule are returned.
export async function GET() {
    try {
        const user = await getApiAuthUser()
        if (!user) return apiError('Unauthorized', 401)

        const now = new Date()
        const items = await prisma.advertisement.findMany({
            where: {
                isActive: true,
                AND: [
                    { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
                    { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
                ],
            },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            take: 10,
            select: { id: true, eyebrow: true, title: true, description: true, ctaLabel: true, linkUrl: true, imageUrl: true, imagePosition: true },
        })
        return apiResponse({ items })
    } catch (error) {
        console.error('Advertisements error:', error)
        return apiError('Failed to fetch advertisements', 500)
    }
}
