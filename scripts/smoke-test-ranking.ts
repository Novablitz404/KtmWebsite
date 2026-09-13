/**
 * Smoke test for the GSS ranking pipeline (Kyorugi + head-to-head Poomsae).
 *
 * Exercises the real HTTP routes the external scoring system calls
 * (/api/tournament/[id]/kyorugi and /poomsae), authenticated the same way
 * a court laptop would be (x-api-key), then verifies AthleteEloRating rows
 * land correctly. Also exercises processTournamentCompletion directly.
 *
 * Requires the local dev server running at http://localhost:3000.
 *
 * Usage:
 *   npx tsx scripts/smoke-test-ranking.ts
 *
 * Creates and tears down its own throwaway tournament/org/club/users —
 * safe to run against a real (local) database, cleans up after itself
 * even if an assertion fails.
 */

import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'
import { processTournamentCompletion } from '@/lib/gss-ranking'

const prisma = new PrismaClient()
const BASE_URL = process.env.SMOKE_TEST_URL || 'http://localhost:3000'

let pass = 0
let fail = 0
function check(label: string, condition: boolean, detail?: string) {
    if (condition) {
        console.log(`  ✅ ${label}`)
        pass++
    } else {
        console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`)
        fail++
    }
}

async function main() {
    console.log('=== GSS Ranking Smoke Test ===\n')

    // ─── Fixtures ──────────────────────────────────────────────
    const ownerUser = await prisma.user.create({
        data: { id: randomUUID(), name: 'Smoke Owner', email: `smoke-owner-${Date.now()}@example.com`, role: 'ORGANIZER' }
    })
    const org = await prisma.organization.create({
        data: { name: 'SMOKE-TEST-ORG', slug: `smoke-test-org-${Date.now()}`, owner: { connect: { id: ownerUser.id } } }
    })
    // GSS attribution is host-based (see lib/gss-ranking.ts): it resolves the
    // hosting org via Tournament.organizerId -> User.organizationMemberId, not
    // Organization.ownerId — the organizer needs to be a *member* of the org
    // it's about to host a tournament for, not just its owner.
    await prisma.user.update({ where: { id: ownerUser.id }, data: { organizationMemberId: org.id } })
    const club = await prisma.club.create({
        data: { name: 'SMOKE-TEST-CLUB', organization: { connect: { id: org.id } }, master: { connect: { id: ownerUser.id } } }
    })
    const apiKey = await prisma.apiKey.create({
        data: { key: `smoke_test_${randomUUID()}`, ownerId: ownerUser.id, description: 'Smoke test key' }
    })
    // GSS-approved up front (approval happens before the event runs) so the
    // per-match Elo writes below aren't gated out.
    const tournament = await prisma.tournament.create({
        data: { name: 'SMOKE-TEST-TOURNAMENT', startDate: new Date(), organizerId: ownerUser.id, gssApprovalStatus: 'APPROVED' }
    })

    async function makeUser(label: string) {
        const uniqueName = `Smoke ${label} ${Math.floor(Math.random() * 1_000_000)}`
        return prisma.user.create({
            data: { id: randomUUID(), name: uniqueName, email: `smoke-${label.toLowerCase()}-${Date.now()}-${Math.random()}@example.com`, role: 'ATHLETE', belt: 'Black', clubName: club.name }
        })
    }
    // Player.name must match the User's name here — real bracket generation
    // (app/actions.ts) snapshots the player's *name* into Match.player1/player2,
    // not their ID (this is exactly the bug that was found and fixed in
    // processMatchResult), so the smoke test needs to mirror that convention.
    async function makePlayer(prefix: string, categoryId: string, userId: string, name: string) {
        return prisma.player.create({
            data: { id: `${prefix}${Date.now()}`.slice(0, 9), name, gender: 'MALE', belt: 'Black', weight: 70, height: 170, categoryId, userId, clubId: club.id }
        })
    }

    const cleanupUserIds: string[] = [ownerUser.id]

    try {
        // ─── 1. KYORUGI ────────────────────────────────────────
        // Uses realistic NAME-based player1/player2/winner fields — matching how
        // real bracket generation writes Match rows — to catch the ID-vs-name
        // resolution bug that was found and fixed in processMatchResult.
        console.log('--- Kyorugi (real match, via /api/tournament/[id]/kyorugi) ---')
        const kyorugiCategory = await prisma.category.create({
            data: { name: 'SMOKE-KYORUGI', tournamentId: tournament.id, type: 'KYORUGI' }
        })
        const kWinnerUser = await makeUser('KyorugiWinner')
        const kLoserUser = await makeUser('KyorugiLoser')
        cleanupUserIds.push(kWinnerUser.id, kLoserUser.id)
        const kWinnerPlayer = await makePlayer('1', kyorugiCategory.id, kWinnerUser.id, kWinnerUser.name!)
        const kLoserPlayer = await makePlayer('2', kyorugiCategory.id, kLoserUser.id, kLoserUser.name!)

        const match = await prisma.match.create({
            data: { categoryRefId: kyorugiCategory.id, round: 1, player1: kWinnerPlayer.name, player2: kLoserPlayer.name }
        })

        const kyorugiRes = await fetch(`${BASE_URL}/api/tournament/${tournament.id}/kyorugi`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey.key },
            body: JSON.stringify([{
                id: match.id,
                winner: kWinnerPlayer.name,
                total_blue_score: 20,
                total_red_score: 10,
            }]),
        })
        check('POST /kyorugi returns 200', kyorugiRes.ok, `status ${kyorugiRes.status}`)

        // processMatchResult is fire-and-forget — give it a moment to land
        await new Promise(r => setTimeout(r, 1500))

        const [kWinnerElo, kLoserElo] = await Promise.all([
            prisma.athleteEloRating.findUnique({ where: { id: `${kWinnerUser.id}-KYORUGI-${org.id}` } }),
            prisma.athleteEloRating.findUnique({ where: { id: `${kLoserUser.id}-KYORUGI-${org.id}` } }),
        ])
        check('Kyorugi winner got an Elo record', !!kWinnerElo)
        check('Kyorugi loser got an Elo record', !!kLoserElo)
        check('Kyorugi winner rating > loser rating', !!kWinnerElo && !!kLoserElo && kWinnerElo.rating > kLoserElo.rating,
            `winner=${kWinnerElo?.rating} loser=${kLoserElo?.rating}`)

        // ─── 2. POOMSAE HEAD_TO_HEAD ───────────────────────────
        console.log('\n--- Poomsae Head-to-Head (real pairing, via /api/tournament/[id]/poomsae) ---')
        const poomsaeCategory = await prisma.category.create({
            data: { name: 'SMOKE-POOMSAE-H2H', tournamentId: tournament.id, type: 'POOMSAE', poomsaeFormat: 'HEAD_TO_HEAD' }
        })
        const pWinnerUser = await makeUser('PoomsaeWinner')
        const pLoserUser = await makeUser('PoomsaeLoser')
        cleanupUserIds.push(pWinnerUser.id, pLoserUser.id)
        const pWinnerPlayer = await makePlayer('3', poomsaeCategory.id, pWinnerUser.id, pWinnerUser.name!)
        const pLoserPlayer = await makePlayer('4', poomsaeCategory.id, pLoserUser.id, pLoserUser.name!)

        const pairingMatchId = Math.floor(Math.random() * 1_000_000) + 1
        const perf1 = await prisma.poomsaeMatch.create({
            data: { categoryRefId: poomsaeCategory.id, round: 1, matchId: pairingMatchId, performanceNumber: 1, playerId: pWinnerPlayer.id, status: 'Pending' }
        })
        const perf2 = await prisma.poomsaeMatch.create({
            data: { categoryRefId: poomsaeCategory.id, round: 1, matchId: pairingMatchId, performanceNumber: 2, playerId: pLoserPlayer.id, status: 'Pending' }
        })

        const poomsaeRes = await fetch(`${BASE_URL}/api/tournament/${tournament.id}/poomsae`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey.key },
            body: JSON.stringify([
                { id: perf1.id, totalScore: 7.8, accuracy: 4.0, status: 'Completed' },
                { id: perf2.id, totalScore: 7.2, accuracy: 3.8, status: 'Completed' },
            ]),
        })
        check('POST /poomsae returns 200', poomsaeRes.ok, `status ${poomsaeRes.status}`)

        const [perf1After, perf2After] = await Promise.all([
            prisma.poomsaeMatch.findUnique({ where: { id: perf1.id } }),
            prisma.poomsaeMatch.findUnique({ where: { id: perf2.id } }),
        ])
        check('Winning performance has winnerId pointing at itself', perf1After?.winnerId === perf1.id,
            `perf1.winnerId=${perf1After?.winnerId} perf1.id=${perf1.id}`)
        check('Losing performance has winnerId pointing at the winner', perf2After?.winnerId === perf1.id,
            `perf2.winnerId=${perf2After?.winnerId} perf1.id=${perf1.id}`)

        await new Promise(r => setTimeout(r, 1500))

        const [pWinnerElo, pLoserElo] = await Promise.all([
            prisma.athleteEloRating.findUnique({ where: { id: `${pWinnerUser.id}-POOMSAE-${org.id}` } }),
            prisma.athleteEloRating.findUnique({ where: { id: `${pLoserUser.id}-POOMSAE-${org.id}` } }),
        ])
        check('Poomsae (higher score) got an Elo record', !!pWinnerElo)
        check('Poomsae (lower score) got an Elo record', !!pLoserElo)
        check('Poomsae higher-score rating > lower-score rating', !!pWinnerElo && !!pLoserElo && pWinnerElo.rating > pLoserElo.rating,
            `higher=${pWinnerElo?.rating} lower=${pLoserElo?.rating}`)

        const eloLog = await prisma.eloMatchLog.findFirst({ where: { matchId: pairingMatchId } })
        check('EloMatchLog entry created for the pairing', !!eloLog)

        // Note: declareKyorugiWinner/declarePoomsaeWinner (the win-button server
        // actions) can't be exercised from a standalone script — they call
        // getAuthUser(), which uses next/headers' cookies() and throws outside a
        // real Next.js request context. Their ranking/progression logic is the
        // same resolvePoomsaeHeadToHeadResult/processMatchResult already proven
        // above via the external API path; the auth gate + UI wiring need a
        // real organizer session in the browser to verify (click-through test).

        // ─── 3. Tournament completion (field bonus) ────────────
        console.log('\n--- processTournamentCompletion (field-strength medal bonus) ---')
        await prisma.player.update({ where: { id: kWinnerPlayer.id }, data: { medal: 'GOLD', registrationStatus: 'APPROVED' } })
        await prisma.player.update({ where: { id: kLoserPlayer.id }, data: { registrationStatus: 'APPROVED' } })
        await prisma.player.update({ where: { id: pWinnerPlayer.id }, data: { medal: 'GOLD', registrationStatus: 'APPROVED' } })
        await prisma.player.update({ where: { id: pLoserPlayer.id }, data: { registrationStatus: 'APPROVED' } })

        const kWinnerBefore = (await prisma.athleteEloRating.findUnique({ where: { id: `${kWinnerUser.id}-KYORUGI-${org.id}` } }))!.rating
        const pWinnerBefore = (await prisma.athleteEloRating.findUnique({ where: { id: `${pWinnerUser.id}-POOMSAE-${org.id}` } }))!.rating

        await processTournamentCompletion(tournament.id)

        const kWinnerAfter = (await prisma.athleteEloRating.findUnique({ where: { id: `${kWinnerUser.id}-KYORUGI-${org.id}` } }))!.rating
        const pWinnerAfter = (await prisma.athleteEloRating.findUnique({ where: { id: `${pWinnerUser.id}-POOMSAE-${org.id}` } }))!.rating

        check('Kyorugi gold medalist got a field bonus', kWinnerAfter > kWinnerBefore, `before=${kWinnerBefore} after=${kWinnerAfter}`)
        check('Poomsae H2H gold medalist got a field bonus', pWinnerAfter > pWinnerBefore, `before=${pWinnerBefore} after=${pWinnerAfter}`)

    } finally {
        // ─── Cleanup ────────────────────────────────────────────
        console.log('\n--- Cleaning up ---')
        await prisma.eloMatchLog.deleteMany({ where: { tournamentId: tournament.id } })
        await prisma.athleteEloRating.deleteMany({ where: { userId: { in: cleanupUserIds } } })
        await prisma.poomsaeMatch.deleteMany({ where: { categoryRef: { tournamentId: tournament.id } } })
        await prisma.match.deleteMany({ where: { categoryRef: { tournamentId: tournament.id } } })
        await prisma.player.deleteMany({ where: { category: { tournamentId: tournament.id } } })
        await prisma.category.deleteMany({ where: { tournamentId: tournament.id } })
        await prisma.tournament.delete({ where: { id: tournament.id } })
        await prisma.apiKey.delete({ where: { id: apiKey.id } })
        await prisma.club.delete({ where: { id: club.id } })
        await prisma.organization.delete({ where: { id: org.id } })
        await prisma.user.deleteMany({ where: { id: { in: cleanupUserIds } } })
        console.log('Cleanup done.')
        await prisma.$disconnect()
    }

    console.log(`\n=== ${pass} passed, ${fail} failed ===`)
    if (fail > 0) process.exit(1)
}

main().catch(async (e) => {
    console.error('Smoke test crashed:', e)
    await prisma.$disconnect()
    process.exit(1)
})
