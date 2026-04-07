import { prisma } from '@/lib/prisma'

export type SmartAlertType = 'UNCONTESTED' | 'SPLIT_SUGGESTION' | 'MERGE_SUGGESTION'

export interface SmartAlert {
    type: SmartAlertType
    categoryId: string
    categoryName: string
    message: string
    details?: any
}

// Configurable thresholds
const SPLIT_THRESHOLD      = 15  // > 15 players        → suggest split
const MERGE_THRESHOLD      = 4   // < 4 players          → candidate for merge
const MAX_MERGE_WEIGHT_GAP = 15  // max kg gap between adjacent weight classes

export async function detectSmartAlerts(tournamentId: string): Promise<SmartAlert[]> {
    const categories = await prisma.category.findMany({
        where: { tournamentId },
        include: {
            players: {
                select: { id: true, clubId: true, name: true, weight: true, club: { select: { name: true, logoUrl: true } } }
            }
        },
        orderBy: { minWeight: 'asc' }
    })

    const alerts: SmartAlert[] = []

    // ── Build weight-class groups ─────────────────────────────────────────────
    // Key: "Type|Subtype|Gender|Belt|SkillLevel|MinAge|MaxAge" → categories sorted by weight
    // This ensures Advance and Novice are never treated as siblings,
    // and belt-based categories (Poomsae) are never crossed.
    const catGroups = new Map<string, typeof categories>()
    for (const cat of categories) {
        const key = `${cat.type}|${cat.subtype}|${cat.gender}|${cat.belt || 'Any'}|${cat.skillLevel || 'Any'}|${cat.minAge}|${cat.maxAge}`
        if (!catGroups.has(key)) catGroups.set(key, [])
        catGroups.get(key)!.push(cat)
    }
    for (const group of catGroups.values()) {
        group.sort((a, b) => (a.minWeight || 0) - (b.minWeight || 0))
    }

    // ── Track categories that WILL BE FILLED by a lower uncontested athlete ───
    // These should NOT generate their own UNCONTESTED alert.
    // Key: categoryId → true if it will receive an athlete from below
    const willBeFilled   = new Set<string>()  // category that receives an athlete (skip uncontested)
    const isMergeTarget  = new Set<string>()  // category that is the target of a merge (skip uncontested)

    // ── Pass 1: Detect uncontested chains ─────────────────────────────────────
    // Walk each group bottom-to-top. If a category (count=1) has a previous
    // sibling that is ALSO count=1, the lower one's athlete will fill this one.
    // Mark this category as "will be filled" — the filled count becomes 2,
    // making it a merge candidate instead of an uncontested.
    for (const group of catGroups.values()) {
        for (let i = 0; i < group.length; i++) {
            const cat  = group[i]
            const prev = i > 0 ? group[i - 1] : null

            const isUncontested   = cat.players.length === 1
            const prevUncontested = prev !== null && prev.players.length === 1

            if (isUncontested && prevUncontested && !willBeFilled.has(prev.id)) {
                // prev's athlete is moving up to fill this category
                // (only if prev itself is not already being filled from below)
                willBeFilled.add(cat.id)
            }
        }
    }

    // ── Pass 2: Generate UNCONTESTED alerts ───────────────────────────────────
    for (const group of catGroups.values()) {
        for (let i = 0; i < group.length; i++) {
            const cat = group[i]
            if (cat.players.length !== 1) continue
            if (willBeFilled.has(cat.id)) continue  // will be resolved by the category below

            // Find the next sibling (move-up target)
            const next = i < group.length - 1 ? group[i + 1] : null

            alerts.push({
                type: 'UNCONTESTED',
                categoryId: cat.id,
                categoryName: cat.name,
                message: `Uncontested Player in ${cat.name}`,
                details: {
                    playerId:           cat.players[0].id,
                    playerName:         cat.players[0].name,
                    clubName:           cat.players[0].club?.name || 'Unknown Club',
                    clubLogoUrl:        cat.players[0].club?.logoUrl || null,
                    sourceCategoryName: cat.name,
                    targetCategoryId:   next?.id || null,
                    targetCategoryName: next?.name || null,
                }
            })
        }
    }

    // ── Pass 3: Generate MERGE alerts ─────────────────────────────────────────
    // A category is a merge candidate if its EFFECTIVE count (actual + incoming
    // athlete from a lower uncontested category) is small but > 0.
    // Skip groups where any category is still uncontested (resolve those first).
    //
    // Also: suppress UNCONTESTED alerts for the merge TARGET category —
    // the merge itself resolves the uncontested status.
    for (const group of catGroups.values()) {
        // Check if any category in this group still has a pending uncontested alert
        const groupHasUncontested = group.some(
            cat => cat.players.length === 1 && !willBeFilled.has(cat.id)
        )
        if (groupHasUncontested) continue

        for (let i = 0; i < group.length - 1; i++) {
            const current = group[i]
            const next    = group[i + 1]

            // Effective count: actual players + 1 if an athlete is incoming from below
            const effectiveCount = current.players.length + (willBeFilled.has(current.id) ? 1 : 0)

            if (effectiveCount === 0 || effectiveCount >= MERGE_THRESHOLD) continue

            const combinedCount = effectiveCount + next.players.length

            // Guard: merged result must not exceed split threshold
            if (combinedCount > SPLIT_THRESHOLD) continue

            // Guard: weight gap between classes must be reasonable
            const weightGap = (next.minWeight || 0) - (current.maxWeight || current.minWeight || 0)
            if (weightGap > MAX_MERGE_WEIGHT_GAP) continue

            // The merge target (next) may itself be uncontested — merging resolves it
            isMergeTarget.add(next.id)

            // Build effective player list (actual + note about incoming)
            const effectivePlayers = [...current.players]

            alerts.push({
                type: 'MERGE_SUGGESTION',
                categoryId: current.id,
                categoryName: current.name,
                message: `Small category (${effectiveCount} athlete${effectiveCount !== 1 ? 's' : ''}). Safe to merge into "${next.name}" — combined: ${combinedCount}.`,
                details: {
                    targetCategoryId:   next.id,
                    targetCategoryName: next.name,
                    effectiveCount,
                    combinedCount,
                    incomingFromBelow:  willBeFilled.has(current.id),
                    players: effectivePlayers.map(p => ({
                        id: p.id, name: p.name,
                        clubName:    p.club?.name    || 'Unknown Club',
                        clubLogoUrl: p.club?.logoUrl || null,
                    }))
                }
            })
        }
    }

    // ── Pass 4: SPLIT alerts ──────────────────────────────────────────────────
    for (const cat of categories) {
        if (cat.players.length > SPLIT_THRESHOLD) {
            alerts.push({
                type: 'SPLIT_SUGGESTION',
                categoryId: cat.id,
                categoryName: cat.name,
                message: `Large category (${cat.players.length} players). Consider splitting.`,
                details: {
                    playerCount: cat.players.length,
                    players: cat.players.slice(0, 6).map(p => ({
                        id: p.id, name: p.name,
                        clubName:    p.club?.name    || 'Unknown Club',
                        clubLogoUrl: p.club?.logoUrl || null,
                    }))
                }
            })
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
