import { prisma } from '@/lib/prisma'

// Belt progression order (lowest to highest)
export const BELT_ORDER = ['White', 'Yellow', 'Orange', 'Green', 'Purple', 'Blue', 'Red', 'Maroon', 'Brown', 'Black']

export function getNextBelt(currentBelt: string, jump: boolean = false): string | null {
    const index = BELT_ORDER.findIndex(b => b.toLowerCase() === currentBelt.toLowerCase())
    if (index === -1) return null // Unknown belt
    const advance = jump ? 2 : 1
    const nextIndex = index + advance
    if (nextIndex >= BELT_ORDER.length) return BELT_ORDER[BELT_ORDER.length - 1] // Cap at Black
    return BELT_ORDER[nextIndex]
}

// Shared authorization: checks direct org match OR parent-child org hierarchy
// Supports both organization owners AND club masters
export async function canManagePromotion(clerkUserId: string, promotionOrgId: string): Promise<boolean> {
    const dbUser = await prisma.user.findUnique({
        where: { clerkId: clerkUserId },
        include: {
            organization: true,
            club: { select: { organizationId: true } }
        }
    })

    if (!dbUser) return false
    if (dbUser.role === 'ADMIN') return true

    // Collect all org IDs the user is associated with
    const userOrgIds: string[] = []
    if (dbUser.organization?.id) userOrgIds.push(dbUser.organization.id)
    if (dbUser.club?.organizationId) userOrgIds.push(dbUser.club.organizationId)

    if (userOrgIds.length === 0) return false

    // Direct match
    if (userOrgIds.includes(promotionOrgId)) return true

    // Parent-child hierarchy check
    const promotionOrg = await prisma.organization.findUnique({
        where: { id: promotionOrgId },
        select: { id: true, parentOrganizationId: true }
    })

    if (!promotionOrg) return false
    const promoRoot = promotionOrg.parentOrganizationId || promotionOrg.id

    // Check if any of the user's orgs share the same root
    for (const orgId of userOrgIds) {
        const userOrg = await prisma.organization.findUnique({
            where: { id: orgId },
            select: { id: true, parentOrganizationId: true }
        })
        if (!userOrg) continue
        const userRoot = userOrg.parentOrganizationId || userOrg.id
        if (userRoot === promoRoot) return true
    }

    return false
}
