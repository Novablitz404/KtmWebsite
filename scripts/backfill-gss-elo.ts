/**
 * Wipes and recomputes all GSS/Elo data from scratch under the host-based
 * attribution model (see lib/gss-ranking.ts) — a result is scoped to
 * whichever org hosted the tournament, and only counts if that tournament's
 * gssApprovalStatus is APPROVED.
 *
 * Safe to re-run anytime — e.g. after approving another batch of historical
 * tournaments for GSS, run this again to backfill their already-recorded
 * match results into the ranking pipeline. Going forward, tournaments
 * approved *before* they run don't need this at all — their matches get
 * scored into GSS live, the same moment results come in.
 *
 * Usage:
 *   npx tsx scripts/backfill-gss-elo.ts          (dry run — no writes)
 *   npx tsx scripts/backfill-gss-elo.ts --apply  (wipes + recomputes)
 */

import { PrismaClient } from '@prisma/client'
import {
    processMatchResult,
    processPoomsaeMatchResult,
    processTournamentCompletion,
    refreshGlobalRanking,
} from '../lib/gss-ranking'
import { resolvePoomsaeHeadToHeadResult } from '../lib/poomsae-progression'

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')

async function main() {
    console.log(apply ? '🔴 LIVE MODE — will wipe and recompute\n' : '🟢 DRY RUN — no writes will happen\n')

    const approvedTournaments = await prisma.tournament.findMany({
        where: { gssApprovalStatus: 'APPROVED' },
        select: { id: true, name: true, status: true },
    })
    console.log(`Found ${approvedTournaments.length} GSS-approved tournament(s).`)
    if (approvedTournaments.length === 0) {
        console.log('Nothing to backfill — approve tournaments via the admin GSS Approvals panel first.')
    }

    if (!apply) {
        for (const t of approvedTournaments) {
            const matchCount = await prisma.match.count({ where: { categoryRef: { tournamentId: t.id }, winner: { not: null } } })
            const poomsaeCount = await prisma.poomsaeMatch.count({ where: { categoryRef: { tournamentId: t.id }, winnerId: { not: null } } })
            console.log(`  - ${t.name} (${t.status}): ${matchCount} Kyorugi results, ${poomsaeCount / 2} Poomsae H2H pairings`)
        }
        console.log('\nRun with --apply to wipe AthleteEloRating/EloMatchLog and recompute.')
        await prisma.$disconnect()
        return
    }

    console.log('\n--- Wiping existing Elo data ---')
    const deletedLogs = await prisma.eloMatchLog.deleteMany({})
    const deletedRatings = await prisma.athleteEloRating.deleteMany({})
    console.log(`Deleted ${deletedRatings.count} AthleteEloRating rows, ${deletedLogs.count} EloMatchLog rows.`)

    console.log('\n--- Replaying Kyorugi matches ---')
    let kyorugiProcessed = 0
    for (const t of approvedTournaments) {
        const matches = await prisma.match.findMany({
            where: { categoryRef: { tournamentId: t.id }, winner: { not: null } },
            select: { id: true },
        })
        for (const m of matches) {
            await processMatchResult(m.id)
            kyorugiProcessed++
        }
    }
    console.log(`Replayed ${kyorugiProcessed} Kyorugi match results.`)

    console.log('\n--- Replaying Poomsae head-to-head pairings ---')
    let poomsaeProcessed = 0
    for (const t of approvedTournaments) {
        const decidedRows = await prisma.poomsaeMatch.findMany({
            where: { categoryRef: { tournamentId: t.id }, winnerId: { not: null } },
        })
        // Each pairing has 2 rows sharing a matchId — process each pairing once
        const seenPairings = new Set<string>()
        for (const row of decidedRows) {
            const pairingKey = `${row.categoryRefId}-${row.matchId}`
            if (seenPairings.has(pairingKey)) continue
            seenPairings.add(pairingKey)

            const sibling = decidedRows.find(r => r.categoryRefId === row.categoryRefId && r.matchId === row.matchId && r.id !== row.id)
            if (!sibling) continue

            const winner = row.id === row.winnerId ? row : sibling
            const loser = winner.id === row.id ? sibling : row

            // resolvePoomsaeHeadToHeadResult also re-advances the winner into the
            // next pairing slot — harmless no-op if already advanced, since it
            // just re-writes the same playerId/displayName that's already there.
            await resolvePoomsaeHeadToHeadResult(winner, loser)
            poomsaeProcessed++
        }
    }
    console.log(`Replayed ${poomsaeProcessed} Poomsae head-to-head pairings.`)

    console.log('\n--- Applying tournament-completion field bonuses ---')
    let completionsProcessed = 0
    for (const t of approvedTournaments) {
        if (t.status !== 'COMPLETED') continue
        await processTournamentCompletion(t.id)
        completionsProcessed++
    }
    console.log(`Processed field bonuses for ${completionsProcessed} completed tournament(s).`)

    console.log('\n--- Refreshing GlobalAthleteRanking ---')
    await refreshGlobalRanking()

    const finalCount = await prisma.athleteEloRating.count()
    console.log(`\nDone. ${finalCount} AthleteEloRating rows now exist.`)

    await prisma.$disconnect()
}

main().catch(async (e) => {
    console.error('Backfill failed:', e)
    await prisma.$disconnect()
    process.exit(1)
})
