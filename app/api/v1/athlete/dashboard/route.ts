import { authenticateApi, apiError, apiResponse } from '@/lib/auth-api'
import { fetchAthleteDashboardData } from '@/app/actions'

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
        return apiResponse(data)
    } catch (error) {
        console.error('Athlete dashboard error:', error)
        return apiError('Failed to fetch dashboard data', 500)
    }
}
