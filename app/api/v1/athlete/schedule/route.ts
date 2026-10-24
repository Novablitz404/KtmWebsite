import { authenticateApi, apiError, apiResponse } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'

// GET /api/v1/athlete/schedule — classes at the athlete's active clubs, flagged with whether they are enrolled
export async function GET() {
    try {
        const user = await authenticateApi()
        if (!user) return apiError('Unauthorized', 401)

        const memberships = await prisma.clubMembership.findMany({ where: { userId: user.id, status: 'ACTIVE' }, select: { clubId: true } })

        const classes = await prisma.clubClass.findMany({
            where: { clubId: { in: memberships.map(m => m.clubId) } },
            orderBy: { startTime: 'asc' },
            select: {
                id: true, name: true, days: true, startTime: true, endTime: true, capacity: true,
                beltMin: true, beltMax: true, instructor: true, location: true, notes: true,
                club: { select: { id: true, name: true } },
                members: { where: { userId: user.id }, select: { userId: true } },
                _count: { select: { members: true } },
            },
        })

        return apiResponse(classes.map(({ members, _count, ...c }) => ({ ...c, enrolled: members.length > 0, enrolledCount: _count.members })))
    } catch (error) {
        console.error('Athlete schedule error:', error)
        return apiError('Failed to fetch schedule', 500)
    }
}
