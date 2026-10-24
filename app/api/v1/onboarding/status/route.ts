import { apiError, apiResponse, getApiAuthUser } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/v1/onboarding/status
 *
 * Tells a signed-in client whether the profile still needs to be completed, and returns any existing
 * values to pre-fill the form (e.g. an athlete pre-registered by a club master, matched by email).
 */
export async function GET() {
    try {
        const authUser = await getApiAuthUser()
        if (!authUser) return apiError('Unauthorized', 401)

        const select = {
            id: true, role: true, onboardingStatus: true, name: true, birthDate: true, gender: true,
            weight: true, height: true, belt: true, clubName: true, country: true, imageUrl: true,
        } as const

        let dbUser = await prisma.user.findUnique({ where: { clerkId: authUser.id }, select })
        if (!dbUser && authUser.email) {
            // Pre-registered by a club master: same email, no auth account linked yet.
            dbUser = await prisma.user.findFirst({
                where: { email: { equals: authUser.email, mode: 'insensitive' }, clerkId: null },
                select,
            })
        }

        const role = dbUser?.role || (authUser.user_metadata?.role as string) || 'ATHLETE'
        // A missing row or an INCOMPLETE row means sign-up happened but the profile form was never submitted.
        // PENDING_APPROVAL (submitted, waiting for a club master) is not "incomplete".
        const needsOnboarding = !dbUser || dbUser.onboardingStatus === 'INCOMPLETE'

        return apiResponse({
            needsOnboarding,
            role,
            profile: dbUser && {
                name: dbUser.name,
                birthDate: dbUser.birthDate ? dbUser.birthDate.toISOString().slice(0, 10) : null,
                gender: dbUser.gender,
                weight: dbUser.weight,
                height: dbUser.height,
                belt: dbUser.belt,
                clubName: dbUser.clubName,
                country: dbUser.country,
                imageUrl: dbUser.imageUrl,
            },
        })
    } catch (error) {
        console.error('Onboarding status error:', error)
        return apiError('Failed to load onboarding status', 500)
    }
}
