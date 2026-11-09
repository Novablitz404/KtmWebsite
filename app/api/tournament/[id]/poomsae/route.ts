import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/supabase/server'
import { resolvePoomsaeHeadToHeadResult } from '@/lib/poomsae-progression'
import type { PoomsaeMatch } from '@prisma/client'

/**
 * HEAD_TO_HEAD only: once both sides of a pairing (same matchId) are
 * Completed, determine the winner (totalScore, tie-break by accuracy) and
 * write their identity into the corresponding slot of the next pairing.
 * A full tie (score and accuracy) is left unresolved — no auto-advance.
 */
async function advancePoomsaeWinner(match: PoomsaeMatch) {
    if (!match.matchId || !match.performanceNumber) return

    const sibling = await prisma.poomsaeMatch.findFirst({
        where: {
            categoryRefId: match.categoryRefId,
            matchId: match.matchId,
            performanceNumber: match.performanceNumber === 1 ? 2 : 1,
        }
    })

    if (!sibling || sibling.status !== 'Completed') return

    let winner: PoomsaeMatch
    let loser: PoomsaeMatch
    if (match.totalScore !== sibling.totalScore) {
        winner = match.totalScore > sibling.totalScore ? match : sibling
        loser = winner === match ? sibling : match
    } else if (match.accuracy !== sibling.accuracy) {
        winner = match.accuracy > sibling.accuracy ? match : sibling
        loser = winner === match ? sibling : match
    } else {
        return // Fully tied — leave unresolved for manual resolution
    }

    await resolvePoomsaeHeadToHeadResult(winner, loser)
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const apiKey = request.headers.get('x-api-key')

        let isAuthorized = false

        // 1. Check API Key
        if (apiKey) {
            const validKey = await prisma.apiKey.findUnique({
                where: { key: apiKey, isActive: true },
                include: { owner: true } // Fetch owner to verify tournament ownership
            })

            if (validKey) {
                // Verify this key's owner manages this tournament
                const tournamentCheck = await prisma.tournament.findUnique({
                    where: { id },
                    include: { managers: true }
                })

                if (tournamentCheck) {
                    const isOwner = tournamentCheck.organizerId === validKey.ownerId
                    const isManager = tournamentCheck.managers.some(m => m.id === validKey.ownerId)
                    if (isOwner || isManager || validKey.owner.role === 'ADMIN') {
                        isAuthorized = true
                    }
                }
            }
        }

        // 2. Fallback to User Session
        if (!isAuthorized) {
            const user = await getAuthUser()

            if (user) {
                const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
                if (dbUser) {
                    const tournamentCheck = await prisma.tournament.findUnique({
                        where: { id },
                        include: { managers: true }
                    })
                    if (tournamentCheck) {
                        const isOwner = tournamentCheck.organizerId === dbUser.id
                        const isManager = tournamentCheck.managers.some(m => m.id === dbUser.id)
                        if (isOwner || isManager || dbUser.role === 'ADMIN') {
                            isAuthorized = true
                        }
                    }
                }
            }
        }

        if (!isAuthorized) {
            return NextResponse.json({ error: 'Unauthorized: Valid User Session or API Key required' }, { status: 401 })
        }

        // Parse Body
        const body = await request.json()
        if (!Array.isArray(body)) {
            return NextResponse.json({ error: 'Invalid payload: Expected array' }, { status: 400 })
        }

        let updatedCount = 0

        // Rows the court operator declared the winner of BY HAND (walkover, withdrawal, referee decision — scores can be
        // 0 to 0). The score comparison below cannot decide those, so they are resolved afterwards as a declared winner.
        const manualIds = body.filter((r: any) => r?.manualWinner && r?.id != null).map((r: any) => Number(r.id)).filter((n: number) => Number.isInteger(n))
        const manualRowsBefore = manualIds.length > 0
            ? await prisma.poomsaeMatch.findMany({ where: { id: { in: manualIds } }, select: { categoryRefId: true, matchId: true } })
            : []
        const manualPairings = new Set(manualRowsBefore.map(r => `${r.categoryRefId}|${r.matchId}`))

        // Process Poomsae Results
        for (const result of body) {
            const { id } = result

            if (!id) {
                console.warn('Skipping result without ID')
                continue
            }

            const match = await prisma.poomsaeMatch.findUnique({
                where: { id }
            })

            if (!match) continue

            const updatedMatch = await prisma.poomsaeMatch.update({
                where: { id },
                data: {
                    accuracy: result.accuracy ?? match.accuracy,
                    presentation: result.presentation ?? match.presentation,
                    totalScore: result.totalScore ?? match.totalScore,
                    rank: result.rank ?? match.rank,
                    status: result.status || 'Completed' // Can explicitly set status or default to Completed
                }
            })
            updatedCount++

            if (updatedMatch.status === 'Completed' && updatedMatch.categoryRefId) {
                const category = await prisma.category.findUnique({
                    where: { id: updatedMatch.categoryRefId },
                    select: { poomsaeFormat: true }
                })
                // A pairing with a hand-declared winner is decided below, not by comparing scores (that would count it twice)
                if (category?.poomsaeFormat === 'HEAD_TO_HEAD' && !manualPairings.has(`${updatedMatch.categoryRefId}|${updatedMatch.matchId}`)) {
                    await advancePoomsaeWinner(updatedMatch)
                }
            }
        }

        // Hand-declared winners, earliest round first so a winner is already in place in the next round before it is decided
        if (manualIds.length > 0) {
            const flagged = await prisma.poomsaeMatch.findMany({ where: { id: { in: manualIds } }, orderBy: [{ round: 'asc' }, { matchId: 'asc' }] })
            for (const row of flagged) {
                const fresh = await prisma.poomsaeMatch.findUnique({ where: { id: row.id } })
                if (!fresh || fresh.winnerId != null || !fresh.categoryRefId) continue // already decided
                const category = await prisma.category.findUnique({ where: { id: fresh.categoryRefId }, select: { poomsaeFormat: true } })
                if (category?.poomsaeFormat !== 'HEAD_TO_HEAD') continue
                const sibling = await prisma.poomsaeMatch.findFirst({
                    where: { categoryRefId: fresh.categoryRefId, matchId: fresh.matchId, performanceNumber: fresh.performanceNumber === 1 ? 2 : 1 }
                })
                if (!sibling) continue
                const { resolvePoomsaeHeadToHeadResult } = await import('@/lib/poomsae-progression')
                await resolvePoomsaeHeadToHeadResult({ ...fresh, status: 'Completed' }, { ...sibling, status: 'Completed' })
            }
        }

        return NextResponse.json({ success: true, updated: updatedCount })

    } catch (error) {
        console.error('Upload Results Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
