import { authenticateApi, apiError, apiResponse } from '@/lib/auth-api'
import { fetchAthleteDashboardData } from '@/app/actions'
import { getAthleteClubAccess } from '@/lib/athlete-club-access'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const user = await authenticateApi()
        if (!user) return apiError('Unauthorized', 401)

        // Ensure user is an athlete
        if (user.role !== 'ATHLETE') {
            return apiError('Forbidden: Athlete access only', 403)
        }

        // Ensure clerkId exists
        if (!user.clerkId) {
            return apiError('User not fully onboarded', 400)
        }

        const data = await fetchAthleteDashboardData(user.clerkId)
        if (!data) return apiError('Athlete not found', 404)
        const [clubAccess, profile] = await Promise.all([
            getAthleteClubAccess(user.id),
            prisma.user.findUnique({ where: { id: user.id }, select: { imageUrl: true } }),
        ])
        return apiResponse({ ...data, user: { ...data.user, imageUrl: profile?.imageUrl ?? null }, clubAccess })
    } catch (error) {
        console.error('Athlete dashboard error:', error)
        return apiError('Failed to fetch dashboard data', 500)
    }
}
