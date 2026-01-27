'use server'

import { prisma } from '@/lib/prisma'
import { calculateKPoints } from '@/src/lib/ranking'
import { clerkClient } from '@clerk/nextjs/server'

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
    } = {}
) {
    // 1. Fetch all Players who have medals in completed tournaments
    // This is a heavy query, but necessary for dynamic calculation without a cache table.
    // Optimizations: Filter by date (last 4 years only for decay).

    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 4);

    const playersWithMedals = await prisma.player.findMany({
        where: {
            medal: { not: null }, // Only those with results
            userId: { not: null }, // Only linked users can have K-Points (need verification status)

            // Player-level filters
            ...(filters.gender ? { gender: filters.gender } : {}),
            ...(filters.belt ? { belt: filters.belt } : {}),
            ...(filters.skillLevel ? { skillLevel: filters.skillLevel } : {}),
            ...(filters.division ? { division: { contains: filters.division, mode: 'insensitive' } } : {}),

            category: {
                tournament: {
                    status: { in: ['COMPLETED', 'ONGOING'] }, // Usually COMPLETED
                    startDate: { gte: cutoffDate }
                },

                // Category-level filters
                ...(filters.type ? { type: filters.type } : {}),
            }
        },
        include: {
            user: {
                select: { id: true, name: true, clubName: true, isVerified: true, clerkId: true }
            },
            category: {
                include: {
                    tournament: {
                        select: { tier: true, startDate: true }
                    }
                }
            }
        }
    })

    // 2. Aggregate Points per User
    const userPointsMap = new Map<string, RankingEntry & { clerkId?: string }>();

    for (const p of playersWithMedals) {
        if (!p.user) continue;

        // Use our ranking engine logic
        const points = calculateKPoints(
            { medal: p.medal },
            {
                tier: p.category.tournament.tier,
                startDate: p.category.tournament.startDate
            },
            { isVerified: p.user.isVerified }
        );

        if (points > 0) {
            const existing = userPointsMap.get(p.user.id);
            if (existing) {
                existing.totalPoints += points;
            } else {
                userPointsMap.set(p.user.id, {
                    userId: p.user.id,
                    name: p.user.name || 'Unknown Athlete',
                    clubName: p.user.clubName,
                    totalPoints: points,
                    rank: 0,
                    verified: p.user.isVerified,
                    clerkId: p.user.clerkId // data for fetching image
                });
            }
        }
    }

    // 3. Sort and Assign Rank
    const sortedRankings = Array.from(userPointsMap.values())
        .sort((a, b) => b.totalPoints - a.totalPoints);

    // 4. Fetch Profile Images from Clerk (Batch)
    // Only fetch for top 50 to avoid limits or massive fetches
    const topRankings = sortedRankings.slice(0, 50);
    const clerkIdsToFetch = topRankings.map(r => r.clerkId).filter(Boolean) as string[];

    // Deduplicate
    const uniqueClerkIds = Array.from(new Set(clerkIdsToFetch));
    const imageMap = new Map<string, string>();

    if (uniqueClerkIds.length > 0) {
        try {
            const client = await clerkClient()
            const clerkUsers = await client.users.getUserList({ userId: uniqueClerkIds, limit: 100 });
            clerkUsers.data.forEach(u => {
                imageMap.set(u.id, u.imageUrl);
            });
        } catch (error) {
            console.error('Failed to fetch Clerk images for rankings:', error);
        }
    }

    // Assign rank and image
    sortedRankings.forEach((entry, index) => {
        entry.rank = index + 1;
        entry.totalPoints = parseFloat(entry.totalPoints.toFixed(2));
        if (entry.clerkId && imageMap.has(entry.clerkId)) {
            entry.profileImage = imageMap.get(entry.clerkId);
        }
        // Remove internal clerkId before returning if strict (but RankingEntry interface needs update if we want to be clean, or just cast)
        // We added clerkId to the map value type manually above.
    });

    // Return Clean Entries
    return sortedRankings.map(({ clerkId, ...rest }) => rest);
}
