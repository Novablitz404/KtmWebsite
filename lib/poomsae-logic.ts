import { Player } from '@prisma/client'
import { generateSingleEliminationBracket } from '@/lib/bracket-logic'

// Player with optional club relation (needed for team display names)
export type PlayerWithClub = Player & { club?: { name: string } | null }

// A performer unit ready for bracket placement — one player for INDIVIDUAL,
// or a representative + full member list for TEAM/PAIR.
export interface PoomsaePerformerEntry {
    representative: PlayerWithClub
    members?: PlayerWithClub[]
    displayName?: string
    memberIds?: string
    memberNames?: string
}

export interface PoomsaeMatchSpec {
    roundGroupIndex: number // SCORED: grouping key for shared matchId (1=Prelim, 2=Semi, 3=Final). HEAD_TO_HEAD: unique ID per pairing.
    round: number
    performanceNumber: number // Sequential order (1, 2, 3...) within the group. HEAD_TO_HEAD: 1 or 2 (the two sides of the pairing).
    targetRank?: number | null // The required rank to fill this slot (SCORED advanced rounds only)
    playerId: string | null
    player: Player | null
    displayName?: string | null  // "Katma Team A" for TEAM/PAIR, null for INDIVIDUAL
    memberIds?: string | null    // "26828, 76251" for TEAM/PAIR, null for INDIVIDUAL
    memberNames?: string | null  // "James Smith, Linda Brown" for TEAM/PAIR, null for INDIVIDUAL
    teamMembers?: Player[]
    assignedForms?: string | null
    status: 'Pending' | 'Completed'
    nextRoundGroupIndex?: number | null // HEAD_TO_HEAD only: the specific next pairing's roundGroupIndex this winner advances to
    nextMatchSlot?: '1' | '2' | null    // HEAD_TO_HEAD only: which performanceNumber slot in the next pairing this winner fills
}

/**
 * Generates Poomsae performance slots based on Cut-off system.
 * Handles Individual, Pair, and Team grouping with shared group identities.
 */
export function generatePoomsaeBracket(
    players: PlayerWithClub[],
    categoryType: string = 'INDIVIDUAL',
    requiredForms: string | null = null,
    format: 'SCORED' | 'HEAD_TO_HEAD' = 'SCORED'
): PoomsaeMatchSpec[] {
    if (players.length === 0) return []

    const isTeamOrPair = categoryType === 'TEAM' || categoryType === 'PAIR'
    const typeLabel = categoryType === 'TEAM' ? 'Team' : 'Pair'

    let performers: PoomsaePerformerEntry[] = []

    if (!isTeamOrPair) {
        performers = players.map(p => ({ representative: p }))
    } else {
        const groups = new Map<string, PlayerWithClub[]>()
        players.forEach(p => {
            const clubId = p.clubId || 'unaffiliated'
            const teamId = p.teamId || 'ungrouped'
            const key = `${clubId}-${teamId.toUpperCase()}`
            if (!groups.has(key)) groups.set(key, [])
            groups.get(key)!.push(p)
        })

        groups.forEach((teamPlayers) => {
            // VALIDATION LOGIC
            // 1. Pair: Exactly 2 players, 1 Male + 1 Female
            if (categoryType === 'PAIR') {
                if (teamPlayers.length !== 2) return // Invalid count
                const males = teamPlayers.filter(p => (p.gender || 'Male').startsWith('M')).length
                const females = teamPlayers.filter(p => (p.gender || 'Male').startsWith('F')).length
                if (males !== 1 || females !== 1) return // Invalid composition
            }

            // 2. Team: Exactly 3 players, All Same Gender
            if (categoryType === 'TEAM') {
                if (teamPlayers.length !== 3) return // Invalid count
                const firstGender = (teamPlayers[0].gender || 'Male')[0]
                const allSame = teamPlayers.every(p => (p.gender || 'Male')[0] === firstGender)
                if (!allSame) return // Mixed gender not allowed for Team
            }

            teamPlayers.sort((a, b) => a.name.localeCompare(b.name))
            const rep = teamPlayers[0]
            const clubName = rep.club?.name || 'Unknown Club'
            const teamId = rep.teamId || 'A'

            performers.push({
                representative: rep,
                members: teamPlayers,
                displayName: `${clubName} ${typeLabel} ${teamId}`,
                memberIds: teamPlayers.map(p => p.id).join(', '),
                memberNames: teamPlayers.map(p => p.name).join(', ')
            })
        })
    }

    if (format === 'HEAD_TO_HEAD') {
        return generateHeadToHeadPoomsaeSpecs(performers, requiredForms)
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
                if (isTeamOrPair) {
                    // TEAM/PAIR: playerId = null, use displayName + memberIds
                    specs[i].playerId = null
                    specs[i].player = null
                    specs[i].displayName = p.displayName || null
                    specs[i].memberIds = p.memberIds || null
                    specs[i].memberNames = p.memberNames || null
                } else {
                    // INDIVIDUAL: use playerId FK as before
                    specs[i].playerId = p.representative.id
                    specs[i].player = p.representative
                }
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

/**
 * Generates a head-to-head single-elimination poomsae bracket.
 * Reuses the generic Kyorugi seeding/pairing/bye logic — performers are paired
 * directly (rather than ranked in round groups), and each pairing's winner
 * (determined by score comparison) advances to a specific next-round pairing.
 */
export function generateHeadToHeadPoomsaeSpecs(
    performers: PoomsaePerformerEntry[],
    requiredForms: string | null = null
): PoomsaeMatchSpec[] {
    if (performers.length < 2) return []

    const performerByPlayerId = new Map(performers.map(p => [p.representative.id, p]))
    const bracketSpecs = generateSingleEliminationBracket(performers.map(p => p.representative))
    if (bracketSpecs.length === 0) return []

    // generateSingleEliminationBracket assigns ids final-round-first (so its
    // internal linking math works top-down). Renumber round-1-first here so
    // ascending roundGroupIndex values sort into round order downstream,
    // matching the SCORED format's convention (and every other consumer's
    // assumption that a higher matchId means a later round).
    const idRemap = new Map<number, number>()
    const orderedByRound = [...bracketSpecs].sort((a, b) => a.round - b.round || a.id - b.id)
    orderedByRound.forEach((match, idx) => idRemap.set(match.id, idx + 1))
    bracketSpecs.forEach(match => {
        match.id = idRemap.get(match.id)!
        match.nextMatchId = match.nextMatchId ? idRemap.get(match.nextMatchId)! : null
    })

    const totalRounds = Math.max(...bracketSpecs.map(s => s.round))
    const formsList = requiredForms ? requiredForms.split(',').map(f => f.trim()) : []
    const getFormsForRound = (round: number) => {
        if (formsList.length === 0) return null
        const roundsFromFinal = totalRounds - round
        const idx = Math.max(0, formsList.length - 1 - roundsFromFinal)
        return formsList[idx]
    }

    const specs: PoomsaeMatchSpec[] = []

    // Every match slot in the tree gets a row now — including rounds where
    // neither side is known yet — so the winner-advancement logic (which
    // looks up a specific row by matchId + performanceNumber) always has
    // somewhere to write the winner in later. This mirrors how Kyorugi
    // pre-creates "TBD" rows for the whole bracket tree upfront.
    for (const match of bracketSpecs) {
        const sides: [Player | null, 1 | 2][] = [[match.player1, 1], [match.player2, 2]]
        for (const [side, performanceNumber] of sides) {
            const performer = side ? performerByPlayerId.get(side.id) : undefined
            const isTeamOrPair = !!performer?.displayName

            specs.push({
                roundGroupIndex: match.id,
                round: match.round,
                performanceNumber,
                targetRank: null,
                playerId: side && !isTeamOrPair ? side.id : null,
                player: side && !isTeamOrPair ? side : null,
                displayName: performer?.displayName || null,
                memberIds: performer?.memberIds || null,
                memberNames: performer?.memberNames || null,
                teamMembers: performer?.members,
                assignedForms: getFormsForRound(match.round),
                status: 'Pending',
                nextRoundGroupIndex: match.nextMatchId,
                nextMatchSlot: match.nextMatchSlot === 'player1' ? '1' : match.nextMatchSlot === 'player2' ? '2' : null,
            })
        }
    }

    return specs
}
