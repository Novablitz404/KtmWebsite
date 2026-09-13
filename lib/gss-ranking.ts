/**
 * GSS (Global Skill Score) — Ranking Orchestration Layer
 *
 * Connects the pure Elo calculation engine (lib/elo.ts) with the database.
 * Handles match result processing, tournament completion bonuses,
 * org chain resolution, and materialized view refresh.
 */

import { prisma } from '@/lib/prisma'
import {
    computeMatchEloUpdate,
    calculateFieldStrength,
    calculateFieldBonus,
    getInitialElo,
    calculatePercentile,
    adjustPercentileForFieldSize,
    calculatePoomsaeRollingAverage,
    monthsBetween,
} from '@/lib/elo'

// ─── Tournament Host Resolution ───────────────────────────────

/**
 * Resolves the organization that HOSTED a tournament — i.e. the organizer's
 * own org membership, via Tournament.organizerId → User.organizationMemberId.
 * KTM has a real Organization row (slug 'ktm') like any tenant, so this
 * resolves the same way for every tournament, KTM's own included.
 *
 * GSS attribution is host-based, not athlete-home-org-based: a result counts
 * toward whichever org actually ran the event, regardless of which club/org
 * the competing athletes themselves belong to. Returns null if the organizer
 * has no org membership (result can't be attributed — Elo is skipped).
 */
export async function resolveTournamentHostOrgId(tournamentId: string): Promise<string | null> {
    const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: { organizer: { select: { organizationMemberId: true } } },
    })

    return tournament?.organizer?.organizationMemberId || null
}

// ─── Elo Record Management ───────────────────────────────────

/**
 * Gets or creates an AthleteEloRating record for a given userId/type/scope.
 * If the record doesn't exist, it's created with belt-based initial Elo.
 */
async function getOrCreateEloRecord(
    userId: string,
    type: 'KYORUGI' | 'POOMSAE',
    scope: string,
    organizationId: string | null,
    belt?: string | null
) {
    const id = `${userId}-${type}-${scope}`

    // Upsert, not findUnique-then-create: Poomsae results are processed via a
    // fire-and-forget call (see resolvePoomsaeHeadToHeadResult), so the same
    // athlete's records for different matches can genuinely race here — a
    // plain check-then-create loses that race with a unique constraint error.
    const record = await prisma.athleteEloRating.upsert({
        where: { id },
        update: {},
        create: {
            id,
            userId,
            type,
            scope,
            organizationId,
            rating: getInitialElo(belt),
            matchCount: 0,
        },
    })

    return record
}

// ─── Match Result Processing ─────────────────────────────────

interface EloUpdateParams {
    discipline: 'KYORUGI' | 'POOMSAE'
    matchId: number
    tournamentId: string
    categoryId: string
    winnerPlayerId: string
    loserPlayerId: string
    scoreDifference: number
}

/**
 * Core Elo update — shared by Kyorugi matches and head-to-head Poomsae pairings.
 *
 * Attribution is host-based: writes exactly one Elo record per athlete,
 * scoped to whichever org hosted the tournament (resolveTournamentHostOrgId),
 * not the athletes' own home club/org. Skips entirely if the tournament isn't
 * GSS-approved or its host org can't be resolved.
 */
async function applyEloUpdate({
    discipline, matchId, tournamentId, categoryId, winnerPlayerId, loserPlayerId, scoreDifference,
}: EloUpdateParams) {
    if (!winnerPlayerId || !loserPlayerId || winnerPlayerId === 'BYE' || loserPlayerId === 'BYE') {
        return // Skip BYE matches
    }

    const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: { gssApprovalStatus: true },
    })
    if (tournament?.gssApprovalStatus !== 'APPROVED') {
        return // Not GSS-approved — bracket/scoring still works, just no ranking impact
    }

    const hostOrgId = await resolveTournamentHostOrgId(tournamentId)
    if (!hostOrgId) {
        return // Organizer has no org membership — nowhere to attribute this to
    }

    // Look up the Player records to get userId and belt
    const [winnerPlayer, loserPlayer] = await Promise.all([
        prisma.player.findUnique({ where: { id: winnerPlayerId }, select: { userId: true, belt: true, id: true } }),
        prisma.player.findUnique({ where: { id: loserPlayerId }, select: { userId: true, belt: true, id: true } }),
    ])

    if (!winnerPlayer?.userId || !loserPlayer?.userId) {
        return // Guest players without userId can't have Elo
    }

    const winnerRecord = await getOrCreateEloRecord(winnerPlayer.userId, discipline, hostOrgId, hostOrgId, winnerPlayer.belt)
    const loserRecord = await getOrCreateEloRecord(loserPlayer.userId, discipline, hostOrgId, hostOrgId, loserPlayer.belt)

    const result = computeMatchEloUpdate(
        winnerRecord.rating,
        loserRecord.rating,
        winnerRecord.matchCount,
        loserRecord.matchCount,
        Math.abs(scoreDifference)
    )

    // Update winner
    await prisma.athleteEloRating.update({
        where: { id: winnerRecord.id },
        data: {
            rating: result.winnerNewRating,
            matchCount: { increment: 1 },
            lastMatchAt: new Date(),
            updatedAt: new Date(),
        },
    })

    // Update loser
    await prisma.athleteEloRating.update({
        where: { id: loserRecord.id },
        data: {
            rating: result.loserNewRating,
            matchCount: { increment: 1 },
            lastMatchAt: new Date(),
            updatedAt: new Date(),
        },
    })

    await prisma.eloMatchLog.create({
        data: {
            matchId,
            tournamentId,
            categoryId,
            winnerId: winnerPlayer.userId,
            loserId: loserPlayer.userId,
            winnerEloBefore: winnerRecord.rating,
            winnerEloAfter: result.winnerNewRating,
            loserEloBefore: loserRecord.rating,
            loserEloAfter: result.loserNewRating,
            scoreDifference: Math.abs(scoreDifference),
            kFactor: result.kFactorWinner,
            marginMultiplier: result.marginMultiplier,
        },
    })
}

/**
 * Process a completed Kyorugi match and update Elo ratings.
 *
 * Called when a match winner is set in the scoring/bracket API.
 *
 * @param matchId - The numeric Match.id
 */
export async function processMatchResult(matchId: number) {
    // Fetch the match with scores and category/tournament context
    const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
            categoryRef: {
                include: {
                    tournament: { select: { id: true, tier: true } },
                },
            },
        },
    })

    if (!match || !match.winner || !match.categoryRef?.tournament || !match.categoryRefId) {
        return // No winner or incomplete data
    }

    // Match.player1, player2, winner are player NAME snapshots (see app/actions.ts
    // bracket generation, which writes spec.player1?.name), not Player IDs — so the
    // actual Player record has to be resolved by name within this match's category.
    // Note: this is a best-effort lookup — two players sharing an exact name within
    // the same category would be ambiguous (same limitation as other name-based
    // matching already used elsewhere in this codebase, e.g. medal-count aggregation).
    const winnerName = match.winner
    const loserName = match.player1 === winnerName ? match.player2 : match.player1

    if (!winnerName || !loserName || winnerName === 'BYE' || loserName === 'BYE' || winnerName === 'TBD' || loserName === 'TBD') {
        return // Skip BYE/incomplete matches
    }

    const [winnerPlayer, loserPlayer] = await Promise.all([
        prisma.player.findFirst({ where: { categoryId: match.categoryRefId, name: winnerName }, select: { id: true } }),
        prisma.player.findFirst({ where: { categoryId: match.categoryRefId, name: loserName }, select: { id: true } }),
    ])

    if (!winnerPlayer || !loserPlayer) {
        return // Couldn't resolve a Player record for one or both names
    }

    // Calculate score difference for margin multiplier
    const blueIsWinner = match.player1 === winnerName // player1 = blue corner
    const scoreDifference = blueIsWinner
        ? match.total_blue_score - match.total_red_score
        : match.total_red_score - match.total_blue_score

    await applyEloUpdate({
        discipline: 'KYORUGI',
        matchId: match.id,
        tournamentId: match.categoryRef.tournament.id,
        categoryId: match.categoryRefId,
        winnerPlayerId: winnerPlayer.id,
        loserPlayerId: loserPlayer.id,
        scoreDifference: Math.abs(scoreDifference),
    })
}

/**
 * Process a completed head-to-head Poomsae pairing and update Elo ratings.
 *
 * Called from `advancePoomsaeWinner` once both sides of a pairing are
 * Completed and a winner has been determined by score comparison.
 *
 * @param matchId - The shared PoomsaeMatch.matchId for this pairing
 */
export async function processPoomsaeMatchResult(params: {
    matchId: number
    tournamentId: string
    categoryId: string
    winnerPlayerId: string
    loserPlayerId: string
    scoreDifference: number
}) {
    await applyEloUpdate({
        discipline: 'POOMSAE',
        matchId: params.matchId,
        tournamentId: params.tournamentId,
        categoryId: params.categoryId,
        winnerPlayerId: params.winnerPlayerId,
        loserPlayerId: params.loserPlayerId,
        scoreDifference: Math.abs(params.scoreDifference),
    })
}

// ─── Tournament Completion ───────────────────────────────────

/**
 * Processes field strength bonuses when a tournament is marked COMPLETED.
 *
 * For each Kyorugi category, and each head-to-head Poomsae category, in the tournament:
 * 1. Calculates the average Elo of all participants (field strength)
 * 2. Determines placement (Gold, Silver, Bronze, etc.) from the bracket
 * 3. Awards field bonus points (decayed) to placed athletes
 * 4. Refreshes the materialized ranking view
 *
 * Traditional SCORED Poomsae categories are not included — they don't feed
 * Elo ratings at all (see calculatePoomsaeGSS for the percentile-based approach).
 */
export async function processTournamentCompletion(tournamentId: string) {
    const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: {
            id: true,
            tier: true,
            startDate: true,
            gssApprovalStatus: true,
            categories: {
                where: {
                    OR: [
                        { type: 'KYORUGI' },
                        { type: 'POOMSAE', poomsaeFormat: 'HEAD_TO_HEAD' },
                    ],
                },
                select: {
                    id: true,
                    type: true,
                    players: {
                        where: { registrationStatus: 'APPROVED' },
                        select: { id: true, userId: true, medal: true, belt: true },
                    },
                },
            },
        },
    })

    if (!tournament) return
    if (tournament.gssApprovalStatus !== 'APPROVED') return // Not GSS-approved

    const hostOrgId = await resolveTournamentHostOrgId(tournamentId)
    if (!hostOrgId) return // Organizer has no org membership — nowhere to attribute this to

    for (const category of tournament.categories) {
        const discipline: 'KYORUGI' | 'POOMSAE' = category.type === 'KYORUGI' ? 'KYORUGI' : 'POOMSAE'
        const playersWithUserId = category.players.filter(p => p.userId)
        if (playersWithUserId.length < 2) continue

        // Get all participant Elos for this category (this tournament's host scope)
        const eloRecords = await prisma.athleteEloRating.findMany({
            where: {
                userId: { in: playersWithUserId.map(p => p.userId!) },
                type: discipline,
                scope: hostOrgId,
            },
            select: { userId: true, rating: true },
        })

        const eloMap = new Map(eloRecords.map(r => [r.userId, r.rating]))

        // Use belt-based default for players without an Elo record yet
        const participantElos = playersWithUserId.map(p =>
            eloMap.get(p.userId!) ?? getInitialElo(p.belt)
        )

        const fieldStrength = calculateFieldStrength(participantElos)
        const bracketSize = playersWithUserId.length

        // Award field bonus to placed athletes
        const placedPlayers = playersWithUserId.filter(p => p.medal && p.medal !== '')

        for (const player of placedPlayers) {
            if (!player.userId) continue

            const bonus = calculateFieldBonus(
                fieldStrength,
                bracketSize,
                player.medal!,
                tournament.tier
            )

            if (bonus <= 0) continue

            const record = await getOrCreateEloRecord(
                player.userId,
                discipline,
                hostOrgId,
                hostOrgId,
                player.belt
            )

            // Add the bonus to the rating
            await prisma.athleteEloRating.update({
                where: { id: record.id },
                data: {
                    rating: { increment: bonus },
                    updatedAt: new Date(),
                },
            })
        }
    }

    // Refresh the materialized view after processing
    await refreshGlobalRanking()
}

// ─── Poomsae Percentile Calculation ──────────────────────────

/**
 * Calculates and returns a Poomsae athlete's GSS percentile score.
 * Uses last 8 competitions with time-decay weighting.
 * Only considers INDIVIDUAL poomsae (team/pair deferred to v2).
 */
export async function calculatePoomsaeGSS(userId: string): Promise<number> {
    const now = new Date()

    // Get the athlete's last 8 individual poomsae performances
    const performances = await prisma.poomsaeMatch.findMany({
        where: {
            player: { userId },
            status: 'Completed',
            categoryRef: {
                subtype: 'INDIVIDUAL',
            },
        },
        include: {
            categoryRef: {
                include: {
                    tournament: { select: { startDate: true } },
                    poomsaeMatches: {
                        where: { status: 'Completed' },
                        select: { totalScore: true },
                    },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
    })

    if (performances.length === 0) return 0

    const scores: Array<{ percentile: number; monthsAgo: number }> = []

    for (const perf of performances) {
        if (!perf.categoryRef?.poomsaeMatches || perf.categoryRef.poomsaeMatches.length < 2) continue

        const allScores = perf.categoryRef.poomsaeMatches.map(m => m.totalScore)
        const minScore = Math.min(...allScores)
        const maxScore = Math.max(...allScores)
        const numCompetitors = allScores.length

        const rawPercentile = calculatePercentile(perf.totalScore, minScore, maxScore)
        const adjustedPercentile = adjustPercentileForFieldSize(rawPercentile, numCompetitors)

        const eventDate = perf.categoryRef.tournament?.startDate || perf.createdAt
        const months = monthsBetween(eventDate, now)

        scores.push({ percentile: adjustedPercentile, monthsAgo: months })
    }

    return calculatePoomsaeRollingAverage(scores)
}

// ─── Materialized View Refresh ───────────────────────────────

/**
 * Refreshes the GlobalAthleteRanking materialized view.
 * Called after tournament completion or batch operations.
 */
export async function refreshGlobalRanking() {
    try {
        await prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW CONCURRENTLY "GlobalAthleteRanking"')
    } catch (error) {
        // Fallback to non-concurrent refresh if concurrent index doesn't exist
        console.warn('[GSS] Concurrent refresh failed, falling back to blocking refresh:', error)
        await prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW "GlobalAthleteRanking"')
    }
}
