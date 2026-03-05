import { authenticateApi, apiError, apiResponse } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'

/**
 * GET /api/me
 * Returns the current authenticated user's basic info (role, name, etc.)
 * Used by the sign-in page to determine which dashboard to redirect to.
 */
export async function GET() {
    const dbUser = await authenticateApi()
    if (!dbUser) return apiError('Unauthorized', 401)

    return apiResponse({
        id: dbUser.id,
        clerkId: dbUser.clerkId,
        email: dbUser.email,
        role: dbUser.role,
        name: dbUser.name,
        imageUrl: (dbUser as any).imageUrl ?? null,
        belt: dbUser.belt,
        gender: dbUser.gender,
        clubName: dbUser.clubName,
        organizationMemberId: dbUser.organizationMemberId,
    })
}

/**
 * PATCH /api/me
 * Backfills organizationMemberId for existing users signing in on an org domain.
 * Only updates if the user's organizationMemberId is currently null.
 */
export async function PATCH() {
    const dbUser = await authenticateApi()
    if (!dbUser) return apiError('Unauthorized', 401)

    // Already has org membership — nothing to do
    if (dbUser.organizationMemberId) {
        return apiResponse({ updated: false })
    }

    // Get tenant slug from proxy header
    const headersList = await headers()
    const orgSlug = headersList.get('x-org-slug')

    if (!orgSlug || orgSlug === 'ktm') {
        return apiResponse({ updated: false })
    }

    // Resolve org ID from slug
    const org = await prisma.organization.findFirst({
        where: {
            OR: [
                { slug: orgSlug },
                { customDomain: orgSlug },
            ]
        },
        select: { id: true }
    })

    if (!org) {
        return apiResponse({ updated: false })
    }

    // Backfill the organizationMemberId
    await prisma.user.update({
        where: { id: dbUser.id },
        data: { organizationMemberId: org.id }
    })

    console.log(`[Backfill] Set organizationMemberId=${org.id} for user ${dbUser.id} (${dbUser.email})`)
    return apiResponse({ updated: true, organizationId: org.id })
}
