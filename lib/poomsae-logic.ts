import { Player } from '@prisma/client'

export interface PoomsaeMatchSpec {
    roundGroupIndex: number // Grouping key for assigning shared matchId (1=Prelim, 2=Semi, 3=Final)
    round: number
    performanceNumber: number // Sequential order (1, 2, 3...) within the group
    targetRank?: number | null // The required rank to fill this slot (Advanced rounds only)
    playerId: string | null
    player: Player | null
    teamMembers?: Player[]
    assignedForms?: string | null
    status: 'Pending' | 'Completed'
}

/**
 * Generates Poomsae performance slots based on Cut-off system.
 * Handles Individual, Pair, and Team grouping with shared group identities.
 */
export function generatePoomsaeBracket(
    players: Player[],
    categoryType: string = 'INDIVIDUAL',
    requiredForms: string | null = null
): PoomsaeMatchSpec[] {
    if (players.length === 0) return []

    let performers: { representative: Player, members?: Player[] }[] = []

    if (categoryType === 'INDIVIDUAL') {
        performers = players.map(p => ({ representative: p }))
    } else {
        const groups = new Map<string, Player[]>()
        players.forEach(p => {
            const clubId = p.clubId || 'unaffiliated'
            const teamId = p.teamId || 'ungrouped'
            const key = `${clubId}-${teamId.toUpperCase()}`
            if (!groups.has(key)) groups.set(key, [])
            groups.get(key)!.push(p)
        })

        groups.forEach((teamPlayers) => {
            teamPlayers.sort((a, b) => a.name.localeCompare(b.name))
            performers.push({
                representative: teamPlayers[0],
                members: teamPlayers
            })
        })
    }

    const count = performers.length
    let startRound = 3 // Final
    if (count >= 20) startRound = 1 // Prelim
    else if (count >= 9) startRound = 2 // Semi

    const formsList = requiredForms ? requiredForms.split(',').map(f => f.trim()) : []
    const getFormsForRound = (r: number) => {
        if (formsList.length === 0) return null
        if (r === 3) return formsList[formsList.length - 1]
        if (r === 2) return formsList.length >= 2 ? formsList[formsList.length - 2] : formsList[0]
        return formsList[0]
    }

    const allMatchSpecs: PoomsaeMatchSpec[] = []

    // 1. Determine rounds to generate
    const roundsToGenerate: number[] = []
    if (startRound <= 1) roundsToGenerate.push(1)
    if (startRound <= 2) roundsToGenerate.push(2)
    roundsToGenerate.push(3)

    // 2. Generate specs for each round
    roundsToGenerate.forEach((rnd, idx) => {
        const roundGroupIndex = idx + 1

        let slotCount = 0
        if (rnd === startRound) slotCount = count
        else if (rnd === 2) slotCount = Math.max(8, Math.ceil(count / 2))
        else if (rnd === 3) slotCount = 8

        const specs: PoomsaeMatchSpec[] = []
        for (let i = 0; i < slotCount; i++) {
            specs.push({
                roundGroupIndex,
                round: rnd,
                performanceNumber: 0,
                targetRank: null, // Default
                playerId: null,
                player: null,
                assignedForms: getFormsForRound(rnd),
                status: 'Pending'
            })
        }

        if (rnd === startRound) {
            // SHUFFLE STARTING ROUND ONLY
            const tempPerformers = [...performers];
            for (let i = tempPerformers.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [tempPerformers[i], tempPerformers[j]] = [tempPerformers[j], tempPerformers[i]];
            }
            tempPerformers.forEach((p, i) => {
                specs[i].playerId = p.representative.id
                specs[i].player = p.representative
                specs[i].teamMembers = p.members
            })

            // Double shuffle for slots
            for (let i = specs.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [specs[i], specs[j]] = [specs[j], specs[i]];
            }
            specs.forEach((s, i) => {
                s.performanceNumber = i + 1
            })
            allMatchSpecs.push(...specs)
        } else {
            // ADVANCED ROUNDS (Deterministic Rank-Based order)
            // Rule: Highest rank (1) performs last. Lowest rank (slotCount) performs first.
            specs.forEach((s, i) => {
                const pNum = i + 1
                s.performanceNumber = pNum
                s.targetRank = slotCount - pNum + 1 // Rank 8 -> Perf 1, Rank 1 -> Perf 8
            })
            allMatchSpecs.push(...specs)
        }
    })

    return allMatchSpecs
}
