import { Player } from '@prisma/client'

// Helper to calculate nearest power of 2
function nextPowerOf2(n: number) {
    if (n === 0) return 0;
    return Math.pow(2, Math.ceil(Math.log2(n)));
}

/**
 * Fisher-Yates shuffle — randomizes player order for fair draws
 */
export function shuffleArray<T>(arr: T[]): T[] {
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

    // Step 3: Identify the slot pairs that have both players (actual fights) vs a
    // lone player (bye) — done BEFORE building/linking match objects so linking can
    // use each pair's true slot-pair index (0..bracketSize/2-1). Doing this after
    // (as before) meant Round 1 matches were linked by their position in the
    // *compacted* fights-only array, which loses all correspondence to the real
    // bracket geometry once byes are involved — e.g. two unrelated Round 1 matches
    // could end up sharing a next-round slot while the byes meant to pair with them
    // landed elsewhere, instead of each Round 1 winner meeting one bye recipient.
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

    // Step 4: Build matches from the slot assignments
    // Only Round 1 matches where BOTH players exist (no bye matches)
    const numFirstRoundMatches = fightPairs.length;

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

    // Step 5: Link Round 1 matches to Round 2, and place bye recipients into Round 2,
    // grouped by which Round 2 match each slot-pair feeds (Math.floor(slotIdx / 2)).
    // Within a group of one fight pair + one bye, the fight's winner always lands on
    // top (player1) and the bye always lands on the bottom (player2) — a fixed
    // display convention, independent of the pair's raw slot-pair parity (which only
    // determines which Round 2 match the group feeds, not top/bottom placement).
    const firstRoundMatches = matchesByRound.get(1) || [];
    const secondRoundMatches = matchesByRound.get(2) || [];

    type Group = { fights: typeof fightPairs; byes: typeof byePlayers };
    const round2Groups = new Map<number, Group>();
    const groupFor = (idx: number): Group => {
        if (!round2Groups.has(idx)) round2Groups.set(idx, { fights: [], byes: [] });
        return round2Groups.get(idx)!;
    };
    fightPairs.forEach(fp => groupFor(Math.floor(fp.slotIdx / 2)).fights.push(fp));
    byePlayers.forEach(bp => groupFor(Math.floor(bp.halfIdx / 2)).byes.push(bp));

    round2Groups.forEach((group, groupIdx) => {
        const targetMatch = secondRoundMatches[groupIdx];
        if (!targetMatch) return;

        if (group.fights.length === 1 && group.byes.length === 1) {
            // One Round 1 match + one bye — winner on top, bye on bottom.
            const fightMatchIdx = fightPairs.indexOf(group.fights[0]);
            firstRoundMatches[fightMatchIdx].nextMatchId = targetMatch.id;
            firstRoundMatches[fightMatchIdx].nextMatchSlot = 'player1';
            targetMatch.player2 = group.byes[0].player;
        } else if (group.fights.length === 2) {
            // Two Round 1 matches feed the same slot — both TBD, order is arbitrary.
            [...group.fights].sort((a, b) => a.slotIdx - b.slotIdx).forEach((fp, i) => {
                const fightMatchIdx = fightPairs.indexOf(fp);
                firstRoundMatches[fightMatchIdx].nextMatchId = targetMatch.id;
                firstRoundMatches[fightMatchIdx].nextMatchSlot = i === 0 ? 'player1' : 'player2';
            });
        } else if (group.byes.length === 2) {
            // Two byes meeting directly — both known players, order is arbitrary.
            const sorted = [...group.byes].sort((a, b) => a.halfIdx - b.halfIdx);
            targetMatch.player1 = sorted[0].player;
            targetMatch.player2 = sorted[1].player;
        }
    });

    for (let roundNum = 2; roundNum < totalRounds; roundNum++) {
        const currentMatches = matchesByRound.get(roundNum) || [];
        const nextRoundMatches = matchesByRound.get(roundNum + 1) || [];

        if (nextRoundMatches.length === 0) continue;

        currentMatches.forEach((match, idx) => {
            const nextMatchIdx = Math.floor(idx / 2);
            if (nextMatchIdx < nextRoundMatches.length) {
                match.nextMatchId = nextRoundMatches[nextMatchIdx].id;
                match.nextMatchSlot = (idx % 2 === 0) ? 'player1' : 'player2';
            }
        });
    }

    // Step 6: Place fighters into Round 1 matches (fightPairs is already in
    // ascending slotIdx order, matching firstRoundMatches' creation order above).
    for (let i = 0; i < firstRoundMatches.length && i < fightPairs.length; i++) {
        firstRoundMatches[i].player1 = fightPairs[i].p1;
        firstRoundMatches[i].player2 = fightPairs[i].p2;
    }

    // Collect all matches and return (Round 1 first, Finals last)
    const allMatches: BracketMatchSpec[] = [];
    for (let roundNum = 1; roundNum <= totalRounds; roundNum++) {
        const roundMatches = matchesByRound.get(roundNum) || [];
        allMatches.push(...roundMatches);
    }

    return allMatches;
}
