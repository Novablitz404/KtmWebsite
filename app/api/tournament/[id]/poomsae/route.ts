import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/supabase/server'
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
    if (match.totalScore !== sibling.totalScore) {
        winner = match.totalScore > sibling.totalScore ? match : sibling
    } else if (match.accuracy !== sibling.accuracy) {
        winner = match.accuracy > sibling.accuracy ? match : sibling
    } else {
        return // Fully tied — leave unresolved for manual resolution
    }

    if (!match.nextMatchId || !match.nextMatchSlot) return // Final round — nothing to advance to

    const targetRow = await prisma.poomsaeMatch.findFirst({
        where: {
            categoryRefId: match.categoryRefId,
            matchId: match.nextMatchId,
            performanceNumber: parseInt(match.nextMatchSlot, 10),
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
                if (category?.poomsaeFormat === 'HEAD_TO_HEAD') {
                    await advancePoomsaeWinner(updatedMatch)
                }
            }
        }

        return NextResponse.json({ success: true, updated: updatedCount })

    } catch (error) {
        console.error('Upload Results Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
