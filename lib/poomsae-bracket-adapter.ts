import type { Match, PoomsaeMatch } from '@prisma/client'
import type { PoomsaePreviewSlot } from './bracket-preview-helpers'

type PoomsaeMatchWithPlayer = PoomsaeMatch & {
    player?: { name: string; club?: { name: string } | null } | null
}

/**
 * Adapts HEAD_TO_HEAD PoomsaeMatch rows (one row per side, two rows sharing a matchId
 * per pairing) into Match-shaped objects so the existing Kyorugi bracket-tree component
 * (BracketView) can render Poomsae HEAD_TO_HEAD brackets unmodified — same tree layout,
 * SVG connectors, A/B split, and PDF export as Kyorugi.
 *
 * PoomsaeMatch.nextMatchId already points at the target pairing's matchId (not a row id),
 * so using matchId as this adapted object's `id` needs no remapping of the ID space.
 *
 * Match's score fields are Int (built for Kyorugi's whole-point rounds); Poomsae scores
 * are decimals (e.g. 8.630). The total is rounded to the nearest whole number for this
 * compact overview badge — full precision lives in the scoring UI, not this bracket view.
 */
export function adaptPoomsaeMatchesToBracket(poomsaeMatches: PoomsaeMatchWithPlayer[]): Match[] {
    const groups = new Map<number, PoomsaeMatchWithPlayer[]>()
    poomsaeMatches.forEach(m => {
        if (m.matchId == null) return
        if (!groups.has(m.matchId)) groups.set(m.matchId, [])
        groups.get(m.matchId)!.push(m)
    })

    const resolveName = (row?: PoomsaeMatchWithPlayer) => {
        if (!row) return 'TBD'
        return row.displayName || row.player?.name || 'TBD'
    }

    const matches = Array.from(groups.entries()).map(([matchId, rows]) => {
        const sideA = rows.find(r => r.performanceNumber === 1)
        const sideB = rows.find(r => r.performanceNumber === 2)
        const first = sideA || sideB || rows[0]

        // Winner (tie-break by accuracy), mirroring advancePoomsaeWinner in
        // app/api/tournament/[id]/poomsae/route.ts — full tie is left unresolved.
        let winner: string | null = null
        if (sideA?.status === 'Completed' && sideB?.status === 'Completed') {
            if (sideA.totalScore !== sideB.totalScore) {
                winner = sideA.totalScore > sideB.totalScore ? resolveName(sideA) : resolveName(sideB)
            } else if (sideA.accuracy !== sideB.accuracy) {
                winner = sideA.accuracy > sideB.accuracy ? resolveName(sideA) : resolveName(sideB)
            }
        }

        const blueScore = sideA ? Math.round(sideA.totalScore) : 0
        const redScore = sideB ? Math.round(sideB.totalScore) : 0

        return {
            id: matchId,
            category: first.category,
            categoryRefId: first.categoryRefId,
            round: first.round,
            player1: resolveName(sideA),
            player2: resolveName(sideB),
            winner,
            nextMatchId: first.nextMatchId ?? null,
            nextMatchSlot: first.nextMatchSlot === '1' ? 'player1' : first.nextMatchSlot === '2' ? 'player2' : null,
            matchId,
            court: first.court,
            scheduledDay: first.scheduledDay,
            r1_blue_score: blueScore,
            r1_red_score: redScore,
            r2_blue_score: 0,
            r2_red_score: 0,
            r3_blue_score: 0,
            r3_red_score: 0,
            total_blue_score: blueScore,
            total_red_score: redScore,
            blue_gam_jeom: 0,
            red_gam_jeom: 0,
            blue_rounds_won: 0,
            red_rounds_won: 0,
        } as Match
    })

    return matches.sort((a, b) => (a.matchId ?? 0) - (b.matchId ?? 0))
}

/**
 * Same idea as adaptPoomsaeMatchesToBracket above, but for a not-yet-generated
 * HEAD_TO_HEAD draw preview (PoomsaePreviewSlot[] from previewCategoryBracket),
 * so the preview can render through the same BracketView tree used once the
 * category is actually generated — nothing is scored yet, so winner/scores stay
 * at their defaults; roundGroupIndex/nextRoundGroupIndex play the same role
 * matchId/nextMatchId play for the persisted-row adapter.
 */
export function adaptPoomsaePreviewToBracket(slots: PoomsaePreviewSlot[]): Match[] {
    const groups = new Map<number, PoomsaePreviewSlot[]>()
    slots.forEach(s => {
        if (!groups.has(s.roundGroupIndex)) groups.set(s.roundGroupIndex, [])
        groups.get(s.roundGroupIndex)!.push(s)
    })

    const resolveName = (s?: PoomsaePreviewSlot) => {
        if (!s) return 'TBD'
        return s.displayName || s.playerName || 'TBD'
    }

    const matches = Array.from(groups.entries()).map(([roundGroupIndex, rows]) => {
        const sideA = rows.find(r => r.performanceNumber === 1)
        const sideB = rows.find(r => r.performanceNumber === 2)
        const first = sideA || sideB || rows[0]

        return {
            id: roundGroupIndex,
            category: '',
            categoryRefId: null,
            round: first.round,
            player1: resolveName(sideA),
            player2: resolveName(sideB),
            winner: null,
            nextMatchId: first.nextRoundGroupIndex ?? null,
            nextMatchSlot: first.nextMatchSlot === '1' ? 'player1' : first.nextMatchSlot === '2' ? 'player2' : null,
            matchId: roundGroupIndex,
            court: 'Unassigned',
            scheduledDay: null,
            r1_blue_score: 0,
            r1_red_score: 0,
            r2_blue_score: 0,
            r2_red_score: 0,
            r3_blue_score: 0,
            r3_red_score: 0,
            total_blue_score: 0,
            total_red_score: 0,
            blue_gam_jeom: 0,
            red_gam_jeom: 0,
            blue_rounds_won: 0,
            red_rounds_won: 0,
        } as Match
    })

    return matches.sort((a, b) => (a.matchId ?? 0) - (b.matchId ?? 0))
}
