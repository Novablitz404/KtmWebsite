import { prisma } from '@/lib/prisma'

export type SmartAlertType = 'UNCONTESTED' | 'SPLIT_SUGGESTION' | 'MERGE_SUGGESTION'

export interface SmartAlert {
    type: SmartAlertType
    categoryId: string
    categoryName: string
    message: string
    details?: any // For storing target merge category or player counts
}

// Configurable thresholds
const SPLIT_THRESHOLD     = 15  // > 15 players       → suggest split
const MERGE_THRESHOLD     = 4   // < 4 players        → candidate for merge
const MAX_MERGE_WEIGHT_GAP = 15 // max kg gap allowed → don't merge far-apart weight classes

export async function detectSmartAlerts(tournamentId: string): Promise<SmartAlert[]> {
    const categories = await prisma.category.findMany({
        where: { tournamentId },
        include: {
            players: {
                select: { id: true, clubId: true, name: true, weight: true, club: { select: { name: true, logoUrl: true } } }
            }
        },
        orderBy: { minWeight: 'asc' } // Helper for finding merge neighbors
    })

    const alerts: SmartAlert[] = []

    // Helper map for finding adjacent categories
    // Key: "Division|Gender|Belt" -> List of categories sorted by weight
    const catGroups = new Map<string, typeof categories>()

    // Track which weight groups have uncontested alerts → suppress merge in those groups
    const uncontestedGroupKeys = new Set<string>()

    for (const cat of categories) {
        // Build groupKey first (needed for both uncontested tracking and merge grouping)
        const groupKey = `${cat.type}|${cat.subtype}|${cat.gender}|${cat.belt || 'Any'}|${cat.minAge}|${cat.maxAge}`

        // 1. Uncontested Logic
        if (cat.players.length === 1) {
            const player = cat.players[0]
            alerts.push({
                type: 'UNCONTESTED',
                categoryId: cat.id,
                categoryName: cat.name,
                message: `Uncontested Player in ${cat.name}`,
                details: {
                    playerId: player.id,
                    playerName: player.name,
                    clubName: player.club?.name || 'Unknown Club',
                    clubLogoUrl: player.club?.logoUrl || null
                }
            })
            uncontestedGroupKeys.add(groupKey)
        }

        // 2. Split Logic
        if (cat.players.length > SPLIT_THRESHOLD) {
            alerts.push({
                type: 'SPLIT_SUGGESTION',
                categoryId: cat.id,
                categoryName: cat.name,
                message: `Large Category (${cat.players.length} players). Suggest Splitting.`,
                details: {
                    playerCount: cat.players.length,
                    players: cat.players.slice(0, 6).map(p => ({
                        id: p.id, name: p.name,
                        clubName: p.club?.name || 'Unknown Club',
                        clubLogoUrl: p.club?.logoUrl || null
                    }))
                }
            })
        }

        // Grouping for Merge Logic
        if (!catGroups.has(groupKey)) {
            catGroups.set(groupKey, [])
        }
        catGroups.get(groupKey)?.push(cat)
    }

    // 3. Merge Logic
    // Iterate groups and find "Small" categories (< MERGE_THRESHOLD) that have a viable heavier neighbour
    // SKIP groups that still have uncontested alerts — resolve those first
    for (const [groupKey, groupCats] of catGroups.entries()) {
        if (uncontestedGroupKeys.has(groupKey)) continue

        groupCats.sort((a, b) => (a.minWeight || 0) - (b.minWeight || 0))

        for (let i = 0; i < groupCats.length - 1; i++) {
            const current = groupCats[i]
            const next    = groupCats[i + 1]

            if (current.players.length > 0 && current.players.length < MERGE_THRESHOLD) {
                const combinedCount = current.players.length + next.players.length

                // Guard 1: merged category must not exceed SPLIT_THRESHOLD
                if (combinedCount > SPLIT_THRESHOLD) continue

                // Guard 2: weight gap between the two categories must be reasonable
                const weightGap = (next.minWeight || 0) - (current.maxWeight || current.minWeight || 0)
                if (weightGap > MAX_MERGE_WEIGHT_GAP) continue

                alerts.push({
                    type: 'MERGE_SUGGESTION',
                    categoryId: current.id,
                    categoryName: current.name,
                    message: `Small category (${current.players.length} players). Safe to merge into "${next.name}" — combined total: ${combinedCount}.`,
                    details: {
                        targetCategoryId: next.id,
                        targetCategoryName: next.name,
                        combinedCount,
                        players: current.players.map(p => ({
                            id: p.id, name: p.name,
                            clubName: p.club?.name || 'Unknown Club',
                            clubLogoUrl: p.club?.logoUrl || null
                        }))
                    }
                })
            }
        }
    }

    return alerts
}

/**
 * Creates a formal proposal in the database
 */
export async function createSmartProposal(
    tournamentId: string,
    type: string,
    data: any
) {
    return await prisma.smartProposal.create({
        data: {
            tournamentId,
            type,
            data: JSON.stringify(data),
            status: 'PENDING'
        }
    })
}

/**
 * Validates if a merge is strictly "Up" to a heavier category
 */
export function validateMergeDirection(sourceWeight: number, targetWeight: number) {
    return targetWeight > sourceWeight;
}
