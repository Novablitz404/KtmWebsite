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

// ─── Types ───────────────────────────────────────────────────

interface OrgChain {
    directOrgId: string | null
    parentOrgId: string | null
}

interface EloScope {
    scope: string       // 'GLOBAL' or organizationId
    organizationId: string | null
}

// ─── Organization Resolution ─────────────────────────────────

/**
 * Resolves the full organization chain for an athlete.
 * Player → Club → Organization (direct) → parentOrganization (via active ClubAffiliation)
 *
 * Returns { directOrgId, parentOrgId } — both can be null if the athlete has no club.
 */
export async function resolveAthleteOrgChain(playerId: string): Promise<OrgChain> {
    const player = await prisma.player.findUnique({
        where: { id: playerId },
        select: {
            club: {
                select: {
                    organizationId: true,
                    affiliations: {
                        where: { status: 'ACTIVE' },
                        select: { organizationId: true },
                        take: 1,
                    },
                },
            },
        },
    })

    if (!player?.club) {
        return { directOrgId: null, parentOrgId: null }
    }

    const directOrgId = player.club.organizationId || null
    const parentOrgId = player.club.affiliations?.[0]?.organizationId || null

    // If the direct org IS the parent affiliation target, there's no separate parent
    if (directOrgId && parentOrgId && directOrgId === parentOrgId) {
        return { directOrgId, parentOrgId: null }
    }

    return { directOrgId, parentOrgId }
}

/**
 * Resolves org chain from a userId (instead of playerId).
 * Looks up the user's club via the Club.masterId or via any Player record.
 */
export async function resolveUserOrgChain(userId: string): Promise<OrgChain> {
    // Try via Club mastership first
    const club = await prisma.club.findUnique({
        where: { masterId: userId },
        select: {
            organizationId: true,
            affiliations: {
                where: { status: 'ACTIVE' },
                select: { organizationId: true },
                take: 1,
            },
        },
    })

    if (club) {
        const directOrgId = club.organizationId || null
        const parentOrgId = club.affiliations?.[0]?.organizationId || null
        if (directOrgId && parentOrgId && directOrgId === parentOrgId) {
            return { directOrgId, parentOrgId: null }
        }
        return { directOrgId, parentOrgId }
    }

    // Fallback: look up via the user's most recent Player record
    const player = await prisma.player.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
    })

    if (player) {
        return resolveAthleteOrgChain(player.id)
    }

    return { directOrgId: null, parentOrgId: null }
}

/**
 * Builds the list of scopes to write Elo records for.
 * Always includes GLOBAL + direct org. Includes parent org only if affiliation is active.
 */
function buildScopes(orgChain: OrgChain): EloScope[] {
    const scopes: EloScope[] = [
        { scope: 'GLOBAL', organizationId: null },
    ]

    if (orgChain.directOrgId) {
        scopes.push({ scope: orgChain.directOrgId, organizationId: orgChain.directOrgId })
    }

    if (orgChain.parentOrgId) {
        scopes.push({ scope: orgChain.parentOrgId, organizationId: orgChain.parentOrgId })
    }

    return scopes
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

    let record = await prisma.athleteEloRating.findUnique({ where: { id } })

    if (!record) {
        record = await prisma.athleteEloRating.create({
            data: {
                id,
                userId,
                type,
                scope,
                organizationId,
                rating: getInitialElo(belt),
                matchCount: 0,
            },
        })
    }

    return record
}

// ─── Match Result Processing ─────────────────────────────────

/**
 * Process a completed Kyorugi match and update Elo ratings.
 *
 * Called when a match winner is set in the scoring/bracket API.
 * Writes up to 3 Elo records per athlete (global + direct org + parent org).
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

    if (!match || !match.winner || !match.categoryRef?.tournament) {
        return // No winner or incomplete data
    }

    // Match.player1, player2, winner are Player IDs (strings)
    const winnerId = match.winner
    const loserId = match.player1 === winnerId ? match.player2 : match.player1

    if (!winnerId || !loserId || winnerId === 'BYE' || loserId === 'BYE') {
        return // Skip BYE matches
    }

    // Look up the Player records to get userId and belt
    const [winnerPlayer, loserPlayer] = await Promise.all([
        prisma.player.findUnique({ where: { id: winnerId }, select: { userId: true, belt: true, id: true } }),
        prisma.player.findUnique({ where: { id: loserId }, select: { userId: true, belt: true, id: true } }),
    ])

    if (!winnerPlayer?.userId || !loserPlayer?.userId) {
        return // Guest players without userId can't have Elo
    }

    // Calculate score difference for margin multiplier
    const blueIsWinner = match.player1 === winnerId // player1 = blue corner
    const scoreDifference = blueIsWinner
        ? match.total_blue_score - match.total_red_score
        : match.total_red_score - match.total_blue_score

    // Resolve org chains for both players
    const [winnerOrgChain, loserOrgChain] = await Promise.all([
        resolveAthleteOrgChain(winnerId),
        resolveAthleteOrgChain(loserId),
    ])

    const winnerScopes = buildScopes(winnerOrgChain)
    const loserScopes = buildScopes(loserOrgChain)

    // Collect all unique scopes from both players
    const allScopeKeys = new Set<string>()
    winnerScopes.forEach(s => allScopeKeys.add(s.scope))
    loserScopes.forEach(s => allScopeKeys.add(s.scope))

    // For each scope that BOTH players share, do a proper Elo update.
    // For scopes only one player has, still update their record (match happened).
    for (const scopeKey of allScopeKeys) {
        const winnerScope = winnerScopes.find(s => s.scope === scopeKey)
        const loserScope = loserScopes.find(s => s.scope === scopeKey)

        // Get or create records
        const winnerRecord = winnerScope
            ? await getOrCreateEloRecord(winnerPlayer.userId, 'KYORUGI', scopeKey, winnerScope.organizationId, winnerPlayer.belt)
            : null
        const loserRecord = loserScope
            ? await getOrCreateEloRecord(loserPlayer.userId, 'KYORUGI', scopeKey, loserScope.organizationId, loserPlayer.belt)
            : null

        // If both players exist in this scope, do paired Elo update
        if (winnerRecord && loserRecord) {
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

            // Log the match result (only for GLOBAL scope to avoid duplicate logs)
            if (scopeKey === 'GLOBAL') {
                await prisma.eloMatchLog.create({
                    data: {
                        matchId: match.id,
                        tournamentId: match.categoryRef!.tournament!.id,
                        categoryId: match.categoryRefId!,
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
        } else if (winnerRecord) {
            // Only winner exists in this scope — just increment match count
            await prisma.athleteEloRating.update({
                where: { id: winnerRecord.id },
                data: { matchCount: { increment: 1 }, lastMatchAt: new Date(), updatedAt: new Date() },
            })
        } else if (loserRecord) {
            // Only loser exists in this scope
            await prisma.athleteEloRating.update({
                where: { id: loserRecord.id },
                data: { matchCount: { increment: 1 }, lastMatchAt: new Date(), updatedAt: new Date() },
            })
        }
    }
}

// ─── Tournament Completion ───────────────────────────────────

/**
 * Processes field strength bonuses when a tournament is marked COMPLETED.
 *
 * For each Kyorugi category in the tournament:
 * 1. Calculates the average Elo of all participants (field strength)
 * 2. Determines placement (Gold, Silver, Bronze, etc.) from the bracket
 * 3. Awards field bonus points (decayed) to placed athletes
 * 4. Refreshes the materialized ranking view
 */
export async function processTournamentCompletion(tournamentId: string) {
    const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: {
            id: true,
            tier: true,
            startDate: true,
            categories: {
                where: { type: 'KYORUGI' },
                select: {
                    id: true,
                    players: {
                        where: { registrationStatus: 'APPROVED' },
                        select: { id: true, userId: true, medal: true, belt: true },
                    },
                },
            },
        },
    })

    if (!tournament) return

    for (const category of tournament.categories) {
        const playersWithUserId = category.players.filter(p => p.userId)
        if (playersWithUserId.length < 2) continue

        // Get all participant Elos for this category (global scope)
        const eloRecords = await prisma.athleteEloRating.findMany({
            where: {
                userId: { in: playersWithUserId.map(p => p.userId!) },
                type: 'KYORUGI',
                scope: 'GLOBAL',
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

            // Resolve org chain and apply bonus across all scopes
            const orgChain = await resolveAthleteOrgChain(player.id)
            const scopes = buildScopes(orgChain)

            for (const { scope, organizationId } of scopes) {
                const record = await getOrCreateEloRecord(
                    player.userId,
                    'KYORUGI',
                    scope,
                    organizationId,
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
