import { prisma } from '@/lib/prisma'
import { processPoomsaeMatchResult } from '@/lib/gss-ranking'
import type { PoomsaeMatch } from '@prisma/client'

/**
 * Given a decided HEAD_TO_HEAD Poomsae pairing (winner + loser performance
 * rows), feeds the result into the GSS/Elo ranking pipeline and advances the
 * winner's identity into the next pairing's slot, if any.
 *
 * Shared by the score-based external API (app/api/tournament/[id]/poomsae)
 * and the organizer's manual "declare winner" action.
 */
export async function resolvePoomsaeHeadToHeadResult(winner: PoomsaeMatch, loser: PoomsaeMatch) {
    // Persist the decision itself — both rows in the pairing point at the
    // winning row's own id, so `row.id === row.winnerId` answers "did this row
    // win?" without needing to look up the sibling or compare scores. This is
    // what the bracket display (adaptPoomsaeMatchesToBracket) reads.
    await prisma.poomsaeMatch.updateMany({
        where: { id: { in: [winner.id, loser.id] } },
        data: { winnerId: winner.id }
    })

    // Only individual real players have a playerId + userId — TEAM/PAIR rows
    // carry displayName/memberIds instead, so ranking is naturally skipped for them.
    if (winner.playerId && loser.playerId && winner.categoryRefId && winner.matchId) {
        const category = await prisma.category.findUnique({
            where: { id: winner.categoryRefId },
            select: { tournamentId: true }
        })
        if (category) {
            processPoomsaeMatchResult({
                matchId: winner.matchId,
                tournamentId: category.tournamentId,
                categoryId: winner.categoryRefId,
                winnerPlayerId: winner.playerId,
                loserPlayerId: loser.playerId,
                scoreDifference: Math.abs(winner.totalScore - loser.totalScore),
            }).catch(err => {
                console.error('[GSS] Failed to process Poomsae Elo update:', err)
            })
        }
    }

    if (!winner.nextMatchId || !winner.nextMatchSlot) return // Final round — nothing to advance to

    const targetRow = await prisma.poomsaeMatch.findFirst({
        where: {
            categoryRefId: winner.categoryRefId,
            matchId: winner.nextMatchId,
            performanceNumber: parseInt(winner.nextMatchSlot, 10),
        }
    })
    if (!targetRow) return

    await prisma.poomsaeMatch.update({
        where: { id: targetRow.id },
        data: {
            playerId: winner.playerId,
            displayName: winner.displayName,
            memberIds: winner.memberIds,
            memberNames: winner.memberNames,
        }
    })
}
