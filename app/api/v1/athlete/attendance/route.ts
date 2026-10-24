import { authenticateApi, apiError, apiResponse } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'

// GET /api/v1/athlete/attendance?take=50&before=<ISO date>
export async function GET(request: Request) {
    try {
        const user = await authenticateApi()
        if (!user) return apiError('Unauthorized', 401)

        const { searchParams } = new URL(request.url)
        const take = Math.min(Math.max(Number(searchParams.get('take')) || 50, 1), 200)
        const before = searchParams.get('before')

        const monthStart = new Date()
        monthStart.setDate(1)
        monthStart.setHours(0, 0, 0, 0)

        const [records, thisMonth, total] = await Promise.all([
            prisma.clubAttendance.findMany({
                where: { userId: user.id, ...(before && { checkIn: { lt: new Date(before) } }) },
                orderBy: { checkIn: 'desc' },
                take,
                select: { id: true, checkIn: true, checkOut: true, method: true, club: { select: { id: true, name: true } } },
            }),
            prisma.clubAttendance.count({ where: { userId: user.id, checkIn: { gte: monthStart } } }),
            prisma.clubAttendance.count({ where: { userId: user.id } }),
        ])

        return apiResponse({ records, summary: { thisMonth, total } })
    } catch (error) {
        console.error('Athlete attendance error:', error)
        return apiError('Failed to fetch attendance', 500)
    }
}
