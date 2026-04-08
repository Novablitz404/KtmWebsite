import { Player } from '@prisma/client'

// Helper to calculate nearest power of 2
function nextPowerOf2(n: number) {
    if (n === 0) return 0;
    return Math.pow(2, Math.ceil(Math.log2(n)));
}

/**
 * Fisher-Yates shuffle — randomizes player order for fair draws
 */
function shuffleArray<T>(arr: T[]): T[] {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Generate standard tournament seeding positions for a bracket of given size.
 * This ensures seed 1 and seed 2 are on opposite halves,
 * seeds 3 and 4 are in different quarters, etc.
 *
 * Returns an array where index = bracket slot, value = seed number (1-based)
 *
 * Example for size 8:
 * Slot 0: Seed 1, Slot 1: Seed 8, Slot 2: Seed 5, Slot 3: Seed 4,
 * Slot 4: Seed 3, Slot 5: Seed 6, Slot 6: Seed 7, Slot 7: Seed 2
 */
function generateSeedPositions(bracketSize: number): number[] {
    if (bracketSize === 1) return [1];
    if (bracketSize === 2) return [1, 2];

    const positions = new Array(bracketSize).fill(0);
    positions[0] = 1;
    positions[1] = 2;

    // Progressively place seeds in proper positions
    for (let round = 2; round <= Math.log2(bracketSize); round++) {
        const seedCount = Math.pow(2, round);
        const newPositions = new Array(seedCount).fill(0);

        for (let i = 0; i < seedCount / 2; i++) {
            const currentSeed = positions[i];
            const mirrorSeed = seedCount + 1 - currentSeed;

            newPositions[i * 2] = currentSeed;
            newPositions[i * 2 + 1] = mirrorSeed;
        }

        for (let i = 0; i < seedCount; i++) {
            positions[i] = newPositions[i];
        }
    }

    return positions;
}

/**
 * Attempt to separate same-club players in early rounds by swapping.
 * Works on the seeded player slots array.
 *
 * @param slots Array of (Player | null) in bracket slot order
 * @param bracketSize Size of the bracket (power of 2)
 */
function separateClubs(slots: (Player | null)[], bracketSize: number): (Player | null)[] {
    const result = [...slots];
    const matchCount = bracketSize / 2;

    // Scan each Round 1 match (pairs: 0v1, 2v3, 4v5...)
    for (let matchIdx = 0; matchIdx < matchCount; matchIdx++) {
        const i = matchIdx * 2;
        const j = matchIdx * 2 + 1;

        const p1 = result[i];
        const p2 = result[j];

        if (!p1 || !p2) continue;
        if (!p1.clubId || !p2.clubId) continue;
        if (p1.clubId !== p2.clubId) continue;

        // Same club conflict! Try to find a swap candidate
        // Look in the opposite half of the bracket first, then anywhere
        const halfSize = bracketSize / 2;
        const isTopHalf = i < halfSize;
        const searchStart = isTopHalf ? halfSize : 0;
        const searchEnd = isTopHalf ? bracketSize : halfSize;

        let bestSwapIdx = -1;

        for (let k = searchStart; k < searchEnd; k++) {
            const candidate = result[k];
            if (!candidate) continue;
            if (candidate.clubId === p1.clubId) continue; // Same club, no help

            // Check that swapping won't create a NEW same-club conflict
            // The candidate's current partner
            const partnerIdx = (k % 2 === 0) ? k + 1 : k - 1;
            const partner = result[partnerIdx];

            // Would p2 conflict with the candidate's partner?
            if (partner && partner.clubId === p2.clubId) continue;

            // Would the candidate conflict with p1?
            // (candidate replaces p2 at slot j, so it faces p1)
            if (candidate.clubId === p1.clubId) continue;

            bestSwapIdx = k;
            break;
        }

        if (bestSwapIdx !== -1) {
            // Swap p2 with the candidate
            [result[j], result[bestSwapIdx]] = [result[bestSwapIdx], result[j]];
        }
    }

    return result;
}

export interface BracketMatchSpec {
    id: number; // Match number (now the primary key)
    round: number; // 1 = First Round, Max = Finals
    player1: Player | null;
    player2: Player | null;
    nextMatchId: number | null;
    nextMatchSlot: 'player1' | 'player2' | null;
    isFinal: boolean; // Whether this is the final match
}

/**
 * Generates a single-elimination bracket WITHOUT BYE matches.
 * Players with byes are seeded directly into their next-round match slots.
 *
 * Features:
 * - Standard tournament seeding positions (1 vs bracketSize, etc.)
 * - Club separation to avoid same-club matchups in early rounds
 * - Random player shuffle when no ranking is provided
 *
 * Example with 6 players (bracket size 8):
 * - Round 1: 2 matches (the fights)
 * - Round 2 (Semis): 2 matches (2 BYE recipients + 2 R1 winners)
 * - Round 3 (Finals): 1 match
 * Total: 5 matches (not 7 with BYE matches)
 */
export function generateSingleEliminationBracket(
    players: Player[],
    startMatchId: number = 1,
    preOrderedPlayers?: Player[]
): BracketMatchSpec[] {
    if (players.length < 2) return [];

    // Step 0: Use pre-ordered list if provided (from preview), otherwise random shuffle
    const shuffledPlayers = preOrderedPlayers && preOrderedPlayers.length === players.length
        ? preOrderedPlayers
        : shuffleArray(players);

    const bracketSize = nextPowerOf2(shuffledPlayers.length);
    const totalRounds = Math.log2(bracketSize);
    const numByes = bracketSize - shuffledPlayers.length;

    // Step 1: Place players into bracket slots using standard seeding positions
    const seedPositions = generateSeedPositions(bracketSize);
    const slots: (Player | null)[] = new Array(bracketSize).fill(null);

    for (let i = 0; i < bracketSize; i++) {
        const seedNum = seedPositions[i]; // 1-based seed number for this slot
        if (seedNum <= shuffledPlayers.length) {
            slots[i] = shuffledPlayers[seedNum - 1];
        }
        // Otherwise leave null (bye)
    }

    // Step 2: Club separation — swap same-club matchups
    const separatedSlots = separateClubs(slots, bracketSize);

    // Step 3: Build matches from the slot assignments
    // Only Round 1 matches where BOTH players exist (no bye matches)
    const numFirstRoundMatches = (bracketSize / 2) - numByes;

    const matchesByRound = new Map<number, BracketMatchSpec[]>();
    let matchIdCounter = startMatchId;

    // Create matches from Finals down to Round 1
    for (let roundNum = totalRounds; roundNum >= 1; roundNum--) {
        const matchesInFullRound = Math.pow(2, totalRounds - roundNum);
        const isFirstRound = roundNum === 1;
        const matchCount = isFirstRound ? numFirstRoundMatches : matchesInFullRound;
        const isFinalRound = roundNum === totalRounds;

        const roundMatches: BracketMatchSpec[] = [];

        for (let i = 0; i < matchCount; i++) {
            roundMatches.push({
                id: matchIdCounter++,
                round: roundNum,
                player1: null,
                player2: null,
                nextMatchId: null,
                nextMatchSlot: null,
                isFinal: isFinalRound,
            });
        }

        matchesByRound.set(roundNum, roundMatches);
    }

    // Step 4: Link matches to next-round matches
    for (let roundNum = 1; roundNum < totalRounds; roundNum++) {
        const currentMatches = matchesByRound.get(roundNum) || [];
        const nextRoundMatches = matchesByRound.get(roundNum + 1) || [];

        if (nextRoundMatches.length === 0) continue;

        if (roundNum === 1) {
            currentMatches.forEach((match, idx) => {
                const nextMatchIdx = Math.floor(idx / 2);
                if (nextMatchIdx < nextRoundMatches.length) {
                    match.nextMatchId = nextRoundMatches[nextMatchIdx].id;
                    match.nextMatchSlot = (idx % 2 === 0) ? 'player1' : 'player2';
                }
            });
        } else {
            currentMatches.forEach((match, idx) => {
                const nextMatchIdx = Math.floor(idx / 2);
                if (nextMatchIdx < nextRoundMatches.length) {
                    match.nextMatchId = nextRoundMatches[nextMatchIdx].id;
                    match.nextMatchSlot = (idx % 2 === 0) ? 'player1' : 'player2';
                }
            });
        }
    }

    // Step 5: Place players from separated slots into matches
    // Determine which slots have actual fights vs byes
    const firstRoundMatches = matchesByRound.get(1) || [];
    const secondRoundMatches = matchesByRound.get(2) || matchesByRound.get(1) || [];

    // Identify the slot pairs that have both players (actual fights)
    const fightPairs: { p1: Player; p2: Player; slotIdx: number }[] = [];
    const byePlayers: { player: Player; halfIdx: number }[] = [];

    for (let slotIdx = 0; slotIdx < bracketSize / 2; slotIdx++) {
        const p1 = separatedSlots[slotIdx * 2];
        const p2 = separatedSlots[slotIdx * 2 + 1];

        if (p1 && p2) {
            fightPairs.push({ p1, p2, slotIdx });
        } else if (p1) {
            byePlayers.push({ player: p1, halfIdx: slotIdx });
        } else if (p2) {
            byePlayers.push({ player: p2, halfIdx: slotIdx });
        }
    }

    // Place fighters into Round 1 matches
    for (let i = 0; i < firstRoundMatches.length && i < fightPairs.length; i++) {
        firstRoundMatches[i].player1 = fightPairs[i].p1;
        firstRoundMatches[i].player2 = fightPairs[i].p2;
    }

    // Place bye recipients directly into Round 2 slots
    let byeIdx = 0;
    for (let i = 0; i < secondRoundMatches.length && byeIdx < byePlayers.length; i++) {
        const match = secondRoundMatches[i];

        const feedingMatch1 = firstRoundMatches.find(m =>
            m.nextMatchId === match.id && m.nextMatchSlot === 'player1'
        );
        if (!feedingMatch1 && byeIdx < byePlayers.length) {
            match.player1 = byePlayers[byeIdx++].player;
        }

        const feedingMatch2 = firstRoundMatches.find(m =>
            m.nextMatchId === match.id && m.nextMatchSlot === 'player2'
        );
        if (!feedingMatch2 && byeIdx < byePlayers.length) {
            match.player2 = byePlayers[byeIdx++].player;
        }
    }

    // Collect all matches and return (Round 1 first, Finals last)
    const allMatches: BracketMatchSpec[] = [];
    for (let roundNum = 1; roundNum <= totalRounds; roundNum++) {
        const roundMatches = matchesByRound.get(roundNum) || [];
        allMatches.push(...roundMatches);
    }

    return allMatches;
}
