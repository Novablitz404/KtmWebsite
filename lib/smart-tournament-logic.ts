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
const SPLIT_THRESHOLD = 15 // > 15 players = Split
const MERGE_THRESHOLD = 4  // < 4 players = candidate for merge

export async function detectSmartAlerts(tournamentId: string): Promise<SmartAlert[]> {
    const categories = await prisma.category.findMany({
        where: { tournamentId },
        include: {
            players: {
                select: { id: true, clubId: true, name: true } // Need clubId for proposal logic later
            }
        },
        orderBy: { minWeight: 'asc' } // Helper for finding merge neighbors
    })

    const alerts: SmartAlert[] = []

    // Helper map for finding adjacent categories
    // Key: "Division|Gender|Belt" -> List of categories sorted by weight
    const catGroups = new Map<string, typeof categories>()

    for (const cat of categories) {
        // 1. Uncontested Logic
        if (cat.players.length === 1) {
            alerts.push({
                type: 'UNCONTESTED',
                categoryId: cat.id,
                categoryName: cat.name,
                message: `Uncontested Player in ${cat.name}`,
                details: {
                    playerId: cat.players[0].id,
                    playerName: cat.players[0].name
                }
            })
        }

        // 2. Split Logic
        if (cat.players.length > SPLIT_THRESHOLD) {
            alerts.push({
                type: 'SPLIT_SUGGESTION',
                categoryId: cat.id,
                categoryName: cat.name,
                message: `Large Category (${cat.players.length} players). Suggest Splitting.`
            })
        }

        // Grouping for Merge Logic
        // Normalize Gender/Belt for grouping
        const groupKey = `${cat.type}|${cat.subtype}|${cat.gender}|${cat.belt || 'Any'}|${cat.minAge}|${cat.maxAge}`
        if (!catGroups.has(groupKey)) {
            catGroups.set(groupKey, [])
        }
        catGroups.get(groupKey)?.push(cat)
    }

    // 3. Merge Logic
    // Iterate groups and find "Small" categories (< MERGE_THRESHOLD) that have a heavier neighbor
    for (const [key, groupCats] of catGroups.entries()) {
        // Ensure sorted by minWeight (already sorted in query, but good to be safe)
        groupCats.sort((a, b) => (a.minWeight || 0) - (b.minWeight || 0))

        for (let i = 0; i < groupCats.length - 1; i++) {
            const current = groupCats[i]
            const next = groupCats[i + 1]

            // If current is small AND next exists
            if (current.players.length > 0 && current.players.length < MERGE_THRESHOLD) {
                // Check if adjacent (this is implicit by sorting, but ideally checks weight gaps)
                // For now, simpler logic: "Next heavier category in same division"

                alerts.push({
                    type: 'MERGE_SUGGESTION',
                    categoryId: current.id,
                    categoryName: current.name,
                    message: `Small Category (${current.players.length}). Merge into ${next.name}?`,
                    details: {
                        targetCategoryId: next.id,
                        targetCategoryName: next.name
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
