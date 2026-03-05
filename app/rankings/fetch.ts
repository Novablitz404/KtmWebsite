'use server'

import { prisma } from '@/lib/prisma'

export interface RankingEntry {
    userId: string
    name: string
    clubName: string | null
    totalPoints: number
    rank: number
    profileImage?: string | null
    verified: boolean;
}

export async function fetchRankings(
    filters: {
        type?: string // KYORUGI | POOMSAE
        division?: string // e.g., "Junior"
        gender?: string // "Male" | "Female"
        belt?: string
        skillLevel?: string
        weightCategory?: string
        tenantId?: string // Added for organization filtering
        search?: string // Added for athlete name search
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
        totalPoints: number
        globalRank: number
    }> = []

    try {
        // Query the Materialized View directly
        rankings = await prisma.globalAthleteRanking.findMany({
            where: {
                ...(filters.type ? { type: filters.type } : {}),
                ...(filters.division ? { division: { contains: filters.division, mode: 'insensitive' as const } } : {}),
                ...(filters.gender ? { gender: filters.gender } : {}),
                ...(filters.search ? { playerName: { contains: filters.search, mode: 'insensitive' as const } } : {}),
                ...(filters.tenantId ? {
                    OR: [
                        { organizationId: filters.tenantId },
                        { parentOrganizationId: filters.tenantId }
                    ]
                } : {})
            },
            orderBy: { globalRank: 'asc' },
            take: 100 // Top 100 limit
        })
    } catch (e) {
        console.error("GlobalAthleteRanking view not found or error querying:", e)
        return [] // Return empty if migration hasn't been run
    }

    // Fetch profile images from DB (no more Clerk API calls)
    const topRankings = rankings.slice(0, 50);
    const userIds = topRankings.map(r => r.userId)
    const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, imageUrl: true }
    })

    const imageMap = new Map<string, string | null>()
    users.forEach(u => imageMap.set(u.id, u.imageUrl))

    // Format to match expected RankingEntry interface
    return rankings.map((r, index) => {
        return {
            userId: r.userId,
            name: r.playerName,
            clubName: r.clubName,
            totalPoints: r.totalPoints,
            rank: index + 1,
            verified: true,
            profileImage: imageMap.get(r.userId) || undefined
        }
    })
}
