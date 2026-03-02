import { authenticateApi, apiError, apiResponse } from '@/lib/auth-api'

/**
 * GET /api/me
 * Returns the current authenticated user's basic info (role, name, etc.)
 * Used by the sign-in page to determine which dashboard to redirect to.
 */
export async function GET() {
    const dbUser = await authenticateApi()
    if (!dbUser) return apiError('Unauthorized', 401)

    return apiResponse({
        role: dbUser.role,
        name: dbUser.name,
    })
}
