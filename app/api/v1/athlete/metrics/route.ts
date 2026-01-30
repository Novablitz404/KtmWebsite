import { authenticateApi, apiError, apiResponse } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'

export async function PUT(request: Request) {
    try {
        const user = await authenticateApi()

        if (!user) {
            return apiError('Unauthorized', 401)
        }

        if (user.role !== 'ATHLETE') {
            return apiError('Forbidden', 403)
        }

        const body = await request.json()
        const { height, weight } = body

        // Validation
        if (!height || !weight || isNaN(Number(height)) || isNaN(Number(weight))) {
            return apiError('Height and Weight are required and must be numbers', 400)
        }

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                height: Number(height),
                weight: Number(weight)
            },
            select: {
                id: true,
                height: true,
                weight: true
            }
        })

        return apiResponse(updatedUser)

    } catch (error) {
        console.error('Metrics update error:', error)
        return apiError('Failed to update metrics', 500)
    }
}
