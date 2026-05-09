'use server'

import { prisma } from '@/lib/prisma'

export interface RankingEntry {
    userId: string
    name: string
    clubName: string | null
    totalPoints: number
    rank: number
    eloRating?: number
    isActive?: boolean
    profileImage?: string | null
    verified: boolean;
}

/**
 * Fetches GSS Rankings from the materialized view.
 *
 * Scope resolution (affiliation-driven):
 * - KTM site (no tenantId or slug 'ktm') → GLOBAL scope
 * - Org with active parent affiliation → parent org's scope
 * - Org without parent → own org scope
 */
export async function fetchRankings(
    filters: {
        type?: string // KYORUGI | POOMSAE
        division?: string // e.g., "Junior"
        gender?: string // "Male" | "Female"
        belt?: string
        skillLevel?: string
        weightCategory?: string
        tenantId?: string // Organization ID for scoping
        tenantSlug?: string // Tenant slug (e.g., "ktm", "wotf-global")
        search?: string // Athlete name search
    } = {}
) {
    let rankings: Array<{
        id: string
        userId: string
        playerName: string
        clubName: string | null
        division: string | null
        gender: string | null
        type: string
        scope: string
        eloRating: number
        matchCount: number
        activityCount: number
        isActive: boolean
        fieldBonus: number
        totalPoints: number
        globalRank: number
    }> = []

    try {
        // Determine scope based on tenant context
        let scope = 'GLOBAL'

        if (filters.tenantId && filters.tenantSlug !== 'ktm') {
            // Check if this org is a PARENT (has clubs affiliated TO it)
            const affiliatedClubCount = await prisma.clubAffiliation.count({
                where: {
                    organizationId: filters.tenantId,
                    status: 'ACTIVE',
                },
            })

            if (affiliatedClubCount > 0) {
                // This org IS a parent org (e.g., WOTF Global) — show its own org scope
                // which includes all athletes whose clubs are affiliated with it
                scope = filters.tenantId
            } else {
                // This org is a child/standalone — check if it has a parent
                const org = await prisma.organization.findUnique({
                    where: { id: filters.tenantId },
                    select: {
                        id: true,
                        clubs: {
                            select: {
                                affiliations: {
                                    where: { status: 'ACTIVE' },
                                    select: { organizationId: true },
                                    take: 1,
                                },
                            },
                            take: 1,
                        },
                    },
                })

                const parentAffiliation = org?.clubs?.[0]?.affiliations?.[0]
                if (parentAffiliation) {
                    scope = parentAffiliation.organizationId
                } else {
                    scope = filters.tenantId
                }
            }
        }

        // Query the Materialized View
        rankings = await prisma.globalAthleteRanking.findMany({
            where: {
                scope,
                ...(filters.type ? { type: filters.type } : {}),
                ...(filters.division ? { division: { contains: filters.division, mode: 'insensitive' as const } } : {}),
                ...(filters.gender ? { gender: filters.gender } : {}),
                ...(filters.search ? { playerName: { contains: filters.search, mode: 'insensitive' as const } } : {}),
            },
            orderBy: { globalRank: 'asc' },
            take: 100 // Top 100 limit
        })
    } catch (e) {
        console.error("GlobalAthleteRanking view not found or error querying:", e)
        return [] // Return empty if migration hasn't been run
    }

    // Fetch profile images from DB
    const userIds = rankings.map(r => r.userId)
    const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, imageUrl: true }
    })

    const imageMap = new Map<string, string | null>()
    users.forEach(u => imageMap.set(u.id, u.imageUrl))

    // Format to match expected RankingEntry interface
    return rankings.map((r) => {
        return {
            userId: r.userId,
            name: r.playerName,
            clubName: r.clubName,
            totalPoints: r.totalPoints,
            rank: r.globalRank,
            eloRating: r.eloRating,
            isActive: r.isActive,
            verified: true,
            profileImage: imageMap.get(r.userId) || undefined
        }
    })
}
