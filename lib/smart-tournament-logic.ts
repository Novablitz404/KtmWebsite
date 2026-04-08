import { prisma } from '@/lib/prisma'

export type SmartAlertType = 'UNCONTESTED' | 'SPLIT_SUGGESTION' | 'MERGE_SUGGESTION' | 'CROSS_DIVISION'

export interface SmartAlert {
    type: SmartAlertType
    categoryId: string
    categoryName: string
    message: string
    details?: any
}

// Configurable thresholds
const SPLIT_THRESHOLD      = 8   // > 8 players         → suggest split
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

            // Uncontested only applies to Kyorugi (sparring)
            if (cat.type !== 'KYORUGI') continue

            const isUncontested   = cat.players.length === 1
            const prevUncontested = prev !== null && prev.players.length === 1

            if (isUncontested && prevUncontested && !willBeFilled.has(prev.id)) {
                // prev's athlete is moving up to fill this category
                // (only if prev itself is not already being filled from below)
                willBeFilled.add(cat.id)
            }
        }
    }

    // ── Pass 1b: Build cross-division target map ──────────────────────────────
    // For the LAST/HEAVIEST category in each Kyorugi group that is uncontested
    // (no next weight sibling), find the matching category in the next
    // age division up (same type|subtype|gender|belt|skillLevel, higher age)
    // by checking where the player's weight actually fits.
    const crossDivisionTargets = new Map<string, { targetCategoryId: string; targetCategoryName: string }>()

    // Group by base key (everything except minAge|maxAge)
    type GroupEntry = { minAge: number; maxAge: number; cats: typeof categories }
    const groupsByBaseKey = new Map<string, GroupEntry[]>()
    for (const [key, group] of catGroups.entries()) {
        const parts = key.split('|')
        const [type, subtype, gender, belt, skillLevel, minAgeStr, maxAgeStr] = parts
        if (type !== 'KYORUGI') continue
        const baseKey = `${type}|${subtype}|${gender}|${belt}|${skillLevel}`
        if (!groupsByBaseKey.has(baseKey)) groupsByBaseKey.set(baseKey, [])
        groupsByBaseKey.get(baseKey)!.push({
            minAge: parseInt(minAgeStr),
            maxAge: parseInt(maxAgeStr),
            cats: group
        })
    }
    for (const entries of groupsByBaseKey.values()) {
        entries.sort((a, b) => a.minAge - b.minAge)
        for (const entry of entries) {
            const lastCat = entry.cats[entry.cats.length - 1]
            if (lastCat.players.length !== 1) continue
            if (willBeFilled.has(lastCat.id)) continue
            // Only the true last weight (no next sibling within the group)
            if (entry.cats.length > 1 && lastCat.id !== entry.cats[entry.cats.length - 1].id) continue
            // Find next age division
            const nextEntry = entries.find(en => en.minAge > entry.maxAge)
            if (!nextEntry) continue

            // Find the correct category in the next division by checking where
            // the player's weight fits, just like uncontested does within its
            // own division. Fall back to the heaviest category if no match.
            const playerWeight = lastCat.players[0]?.weight || 0
            const targetCat = nextEntry.cats.find(c =>
                playerWeight >= (c.minWeight || 0) && playerWeight < (c.maxWeight || 999)
            ) || nextEntry.cats[nextEntry.cats.length - 1] // fallback to heaviest

            crossDivisionTargets.set(lastCat.id, {
                targetCategoryId: targetCat.id,
                targetCategoryName: targetCat.name
            })
        }
    }

    // ── Mark cross-division targets as "will be filled" ──────────────────────
    // Just like uncontested chain suppression within a division: if we're moving
    // someone INTO a category via cross-div, that target should NOT generate its
    // own UNCONTESTED or CROSS_DIVISION alert — it's about to receive a player.
    for (const [, crossTarget] of crossDivisionTargets) {
        willBeFilled.add(crossTarget.targetCategoryId)
    }

    // ── Pass 2: Generate UNCONTESTED alerts ───────────────────────────────────
    for (const group of catGroups.values()) {
        for (let i = 0; i < group.length; i++) {
            const cat = group[i]
            // Uncontested only applies to Kyorugi — Poomsae/Kyukpa are scored
            // individually so a single athlete simply wins their division
            if (cat.type !== 'KYORUGI') continue
            if (cat.players.length !== 1) continue
            if (willBeFilled.has(cat.id)) continue  // will be resolved by the category below

            // Find the next sibling (move-up target)
            const next = i < group.length - 1 ? group[i + 1] : null

            // If this is the last weight AND has a cross-division target,
            // skip here — it will get a CROSS_DIVISION alert in Pass 2b
            if (next === null && crossDivisionTargets.has(cat.id)) continue

            alerts.push({
                type: 'UNCONTESTED',
                categoryId: cat.id,
                categoryName: cat.name,
                message: `Uncontested Player in ${cat.name}`,
                details: {
                    playerId:           cat.players[0].id,
                    playerName:         cat.players[0].name,
                    clubId:             cat.players[0].clubId || null,
                    clubName:           cat.players[0].club?.name || 'Unknown Club',
                    clubLogoUrl:        cat.players[0].club?.logoUrl || null,
                    sourceCategoryName: cat.name,
                    targetCategoryId:   next?.id || null,
                    targetCategoryName: next?.name || null,
                }
            })
        }
    }

    // ── Pass 2b: CROSS_DIVISION alerts ────────────────────────────────────────
    // Uncontested in the highest weight class with a matching division above.
    for (const [catId, crossTarget] of crossDivisionTargets.entries()) {
        const cat = categories.find(c => c.id === catId)
        if (!cat || cat.players.length !== 1) continue
        alerts.push({
            type: 'CROSS_DIVISION',
            categoryId: catId,
            categoryName: cat.name,
            message: `Uncontested in highest weight — eligible for cross-division move to ${crossTarget.targetCategoryName}`,
            details: {
                playerId:           cat.players[0].id,
                playerName:         cat.players[0].name,
                clubId:             cat.players[0].clubId || null,
                clubName:           cat.players[0].club?.name || 'Unknown Club',
                clubLogoUrl:        cat.players[0].club?.logoUrl || null,
                sourceCategoryName: cat.name,
                targetCategoryId:   crossTarget.targetCategoryId,
                targetCategoryName: crossTarget.targetCategoryName,
            }
        })
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
            const effectiveCount     = current.players.length + (willBeFilled.has(current.id) ? 1 : 0)
            const effectiveNextCount = next.players.length    + (willBeFilled.has(next.id)    ? 1 : 0)

            // Skip: source is empty or already large enough
            if (effectiveCount === 0 || effectiveCount >= MERGE_THRESHOLD) continue

            // Skip: target (next) is empty — merging into an empty category doesn't give an opponent
            if (effectiveNextCount === 0) continue

            const combinedCount = effectiveCount + effectiveNextCount

            // Guard: merged result must not exceed split threshold
            if (combinedCount > SPLIT_THRESHOLD) continue

            // Guard: weight gap between adjacent classes must be reasonable
            const weightGap = (next.minWeight || 0) - (current.maxWeight || current.minWeight || 0)
            if (weightGap > MAX_MERGE_WEIGHT_GAP) continue

            // If BOTH current and next are small, they should merge together (preferred).
            // In this case do NOT emit a separate alert for next → next+1 (handled by the
            // combined alert here). Skip the pair only if next is already a merge source
            // in the iteration (i+1 will be skipped naturally since next may also be small,
            // but that's fine — we want the combined alert here).
            const bothSmall = effectiveNextCount < MERGE_THRESHOLD

            // The merge target (next) may itself be uncontested — merging resolves it
            isMergeTarget.add(next.id)

            // Build effective player list (actual + note about incoming)
            const effectivePlayers = [...current.players]

            const mergeNote = bothSmall
                ? `Small categories (${effectiveCount} + ${effectiveNextCount} athletes). Merge "${current.name}" into "${next.name}" — combined: ${combinedCount}.`
                : `Small category (${effectiveCount} athlete${effectiveCount !== 1 ? 's' : ''}). Safe to merge into "${next.name}" — combined: ${combinedCount}.`

            alerts.push({
                type: 'MERGE_SUGGESTION',
                categoryId: current.id,
                categoryName: current.name,
                message: mergeNote,
                details: {
                    targetCategoryId:   next.id,
                    targetCategoryName: next.name,
                    effectiveCount,
                    combinedCount,
                    bothSmall,
                    incomingFromBelow:  willBeFilled.has(current.id),
                    players: effectivePlayers.map(p => ({
                        id: p.id, name: p.name,
                        clubName:    p.club?.name    || 'Unknown Club',
                        clubLogoUrl: p.club?.logoUrl || null,
                    }))
                }
            })

            // If both are small they merge together — skip evaluating next as a source
            // so we don't emit a second alert for next → next+1
            if (bothSmall) i++
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
