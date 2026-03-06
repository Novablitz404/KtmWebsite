'use server'

import { prisma } from '@/lib/prisma'

/**
 * Check if a club has an active affiliation with any organization.
 * Used by registration flows to block unaffiliated clubs.
 */
export async function checkClubAffiliation(clubId: string): Promise<{
    isActive: boolean
    message: string
    affiliation: any | null
}> {
    // First, get the club and its organization
    const club = await prisma.club.findUnique({
        where: { id: clubId },
        select: {
            id: true,
            name: true,
            organizationId: true,
            organization: {
                select: {
                    id: true,
                    name: true,
                    affiliationFee: true,
                }
            }
        }
    })

    if (!club) {
        return { isActive: false, message: 'Club not found', affiliation: null }
    }

    // If the club isn't linked to any organization, no affiliation needed
    if (!club.organizationId || !club.organization) {
        return { isActive: true, message: 'No organization — affiliation not required', affiliation: null }
    }

    // If the organization has no fee set, treat as no affiliation requirement
    if (!club.organization.affiliationFee || club.organization.affiliationFee <= 0) {
        return { isActive: true, message: 'Organization has no affiliation fee', affiliation: null }
    }

    // Check for active affiliation
    const affiliation = await prisma.clubAffiliation.findUnique({
        where: {
            clubId_organizationId: {
                clubId: club.id,
                organizationId: club.organizationId,
            }
        }
    })

    if (!affiliation) {
        return {
            isActive: false,
            message: `${club.name} is not affiliated with ${club.organization.name}. Club master must pay the annual affiliation fee (₱${club.organization.affiliationFee.toLocaleString()}).`,
            affiliation: null
        }
    }

    if (affiliation.status === 'EXPIRED' || (affiliation.expiresAt && new Date(affiliation.expiresAt) < new Date())) {
        return {
            isActive: false,
            message: `${club.name}'s affiliation with ${club.organization.name} has expired. Club master must renew the annual affiliation fee.`,
            affiliation
        }
    }

    if (affiliation.status === 'UNPAID') {
        return {
            isActive: false,
            message: `${club.name}'s affiliation fee with ${club.organization.name} is unpaid. Club master must complete payment.`,
            affiliation
        }
    }

    // Status is ACTIVE and not expired
    return { isActive: true, message: 'Affiliation active', affiliation }
}

/**
 * Check affiliation by user ID — finds the user's club and checks affiliation.
 * Used for individual athlete registration.
 */
export async function checkUserAffiliation(userId: string): Promise<{
    isActive: boolean
    message: string
    clubId: string | null
}> {
    // Find the user's club
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            clubName: true,
        }
    })

    if (!user || !user.clubName) {
        // No club — independent athlete, no affiliation needed
        return { isActive: true, message: 'Independent athlete', clubId: null }
    }

    // Find the club by name
    const club = await prisma.club.findFirst({
        where: { name: user.clubName },
        select: { id: true }
    })

    if (!club) {
        // User has a clubName but no matching Club record — treat as independent
        return { isActive: true, message: 'Club not found in system', clubId: null }
    }

    const result = await checkClubAffiliation(club.id)
    return {
        isActive: result.isActive,
        message: result.message,
        clubId: club.id,
    }
}

/**
 * Get full affiliation status for a club — used for dashboard display.
 */
export async function getClubAffiliationStatus(clubId: string) {
    const club = await prisma.club.findUnique({
        where: { id: clubId },
        select: {
            id: true,
            name: true,
            organizationId: true,
            organization: {
                select: {
                    id: true,
                    name: true,
                    affiliationFee: true,
                }
            },
            affiliations: {
                orderBy: { createdAt: 'desc' },
                take: 1,
            }
        }
    })

    if (!club) return null

    const affiliation = club.affiliations[0] || null
    const orgFee = club.organization?.affiliationFee || 0
    const orgName = club.organization?.name || null

    // Auto-expire if past date
    let status = affiliation?.status || 'UNPAID'
    if (affiliation && affiliation.expiresAt && new Date(affiliation.expiresAt) < new Date() && status === 'ACTIVE') {
        status = 'EXPIRED'
        // Update in DB
        await prisma.clubAffiliation.update({
            where: { id: affiliation.id },
            data: { status: 'EXPIRED' }
        })
    }

    return {
        hasOrganization: !!club.organizationId,
        organizationName: orgName,
        organizationId: club.organizationId,
        affiliationFee: orgFee,
        status,
        paidAt: affiliation?.paidAt || null,
        expiresAt: affiliation?.expiresAt || null,
        affiliationId: affiliation?.id || null,
    }
}
