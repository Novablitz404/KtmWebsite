import { Player } from '@prisma/client'

// Helper to calculate nearest power of 2
function nextPowerOf2(n: number) {
    if (n === 0) return 0;
    return Math.pow(2, Math.ceil(Math.log2(n)));
}

export interface BracketMatchSpec {
    id: number; // Match number (now the primary key)
    round: number; // 1 = First Round, Max = Finals
    player1: Player | null;
    player2: Player | null;
    nextMatchId: number | null;
    nextMatchSlot: 'player1' | 'player2' | null;
    status: 'Pending' | 'Ready' | 'Bye';
}

/**
 * Generates a single-elimination bracket WITHOUT BYE matches.
 * Players with byes are seeded directly into their next-round match slots.
 * 
 * Example with 6 players (bracket size 8):
 * - Round 1: 2 matches (the fights)
 * - Round 2 (Semis): 2 matches (2 BYE recipients + 2 R1 winners)
 * - Round 3 (Finals): 1 match
 * Total: 5 matches (not 7 with BYE matches)
 */
export function generateSingleEliminationBracket(players: Player[], startMatchId: number = 1): BracketMatchSpec[] {
    if (players.length < 2) return [];

    const bracketSize = nextPowerOf2(players.length);
    const totalRounds = Math.log2(bracketSize);
    const numByes = bracketSize - players.length;
    const numFirstRoundMatches = (bracketSize / 2) - numByes; // Only real fights

    // Step 1: Create match structure
    // We'll track matches per round: round -> [match objects]
    const matchesByRound = new Map<number, BracketMatchSpec[]>();

    let matchIdCounter = startMatchId;

    // Create matches from Finals down to the actual first round
    // But we only create first-round matches for actual fights (not byes)
    for (let roundNum = totalRounds; roundNum >= 1; roundNum--) {
        const matchesInFullRound = Math.pow(2, totalRounds - roundNum);
        const isFirstRound = roundNum === 1;

        // For first round, only create matches for actual fights
        const matchCount = isFirstRound ? numFirstRoundMatches : matchesInFullRound;

        const roundMatches: BracketMatchSpec[] = [];

        for (let i = 0; i < matchCount; i++) {
            roundMatches.push({
                id: matchIdCounter++,
                round: roundNum,
                player1: null,
                player2: null,
                nextMatchId: null,
                nextMatchSlot: null,
                status: 'Pending'
            });
        }

        matchesByRound.set(roundNum, roundMatches);
    }

    // Step 2: Link matches to their next-round matches
    for (let roundNum = 1; roundNum < totalRounds; roundNum++) {
        const currentMatches = matchesByRound.get(roundNum) || [];
        const nextRoundMatches = matchesByRound.get(roundNum + 1) || [];

        if (nextRoundMatches.length === 0) continue;

        // For first round, we need special handling since there are fewer matches
        if (roundNum === 1) {
            // First round matches feed into specific slots based on bye distribution
            // We'll calculate which next-round slots they go to
            currentMatches.forEach((match, idx) => {
                const nextMatchIdx = Math.floor(idx / 2);
                if (nextMatchIdx < nextRoundMatches.length) {
                    match.nextMatchId = nextRoundMatches[nextMatchIdx].id;
                    match.nextMatchSlot = (idx % 2 === 0) ? 'player1' : 'player2';
                }
            });
        } else {
            // Standard linking for later rounds
            currentMatches.forEach((match, idx) => {
                const nextMatchIdx = Math.floor(idx / 2);
                if (nextMatchIdx < nextRoundMatches.length) {
                    match.nextMatchId = nextRoundMatches[nextMatchIdx].id;
                    match.nextMatchSlot = (idx % 2 === 0) ? 'player1' : 'player2';
                }
            });
        }
    }

    // Step 3: Place players
    // Split players: first N go to byes (seeded directly into round 2), rest fight in round 1
    const byeRecipients = players.slice(0, numByes);
    const fighters = players.slice(numByes);

    // Place fighters in first round matches
    const firstRoundMatches = matchesByRound.get(1) || [];
    let fighterIdx = 0;
    for (const match of firstRoundMatches) {
        if (fighterIdx < fighters.length) {
            match.player1 = fighters[fighterIdx++];
        }
        if (fighterIdx < fighters.length) {
            match.player2 = fighters[fighterIdx++];
        }
        // Update status
        if (match.player1 && match.player2) {
            match.status = 'Pending';
        }
    }

    // Place bye recipients directly into round 2 (or round 1 if it's the finals)
    const secondRoundMatches = matchesByRound.get(2) || matchesByRound.get(1) || [];

    // Calculate which slots in round 2 are for bye recipients
    // Bye recipients fill the slots NOT taken by first-round match winners
    let byeIdx = 0;
    for (let i = 0; i < secondRoundMatches.length && byeIdx < byeRecipients.length; i++) {
        const match = secondRoundMatches[i];

        // Check if player1 slot should be filled by a bye recipient
        // (This happens when there's no first-round match feeding into this slot)
        const feedingMatch1 = firstRoundMatches.find(m =>
            m.nextMatchId === match.id && m.nextMatchSlot === 'player1'
        );
        if (!feedingMatch1 && byeIdx < byeRecipients.length) {
            match.player1 = byeRecipients[byeIdx++];
        }

        // Check player2 slot
        const feedingMatch2 = firstRoundMatches.find(m =>
            m.nextMatchId === match.id && m.nextMatchSlot === 'player2'
        );
        if (!feedingMatch2 && byeIdx < byeRecipients.length) {
            match.player2 = byeRecipients[byeIdx++];
        }
    }

    // Collect all matches and return
    const allMatches: BracketMatchSpec[] = [];
    for (let roundNum = 1; roundNum <= totalRounds; roundNum++) {
        const roundMatches = matchesByRound.get(roundNum) || [];
        allMatches.push(...roundMatches);
    }

    return allMatches;
}
