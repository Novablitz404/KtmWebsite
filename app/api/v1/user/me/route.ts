import { authenticateApi, apiError, apiResponse } from '@/lib/auth-api'

export async function GET() {
    try {
        const user = await authenticateApi()

        if (!user) {
            return apiError('Unauthorized', 401)
        }

        return apiResponse(user)
    } catch (error) {
        return apiError('Internal Server Error', 500)
    }
}
