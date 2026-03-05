import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/supabase/server'

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

        // Process Kyorugi Results
        for (const result of body) {
            const { id } = result

            if (!id) {
                console.warn('Skipping result without ID')
                continue
            }

            const match = await prisma.match.findUnique({
                where: { id },
                include: { categoryRef: true }
            })

            if (!match) continue

            const updatedMatch = await prisma.match.update({
                where: { id },
                data: {
                    winner: result.winner || null,
                    r1_blue_score: result.r1_blue_score ?? match.r1_blue_score,
                    r1_red_score: result.r1_red_score ?? match.r1_red_score,
                    r2_blue_score: result.r2_blue_score ?? match.r2_blue_score,
                    r2_red_score: result.r2_red_score ?? match.r2_red_score,
                    r3_blue_score: result.r3_blue_score ?? match.r3_blue_score,
                    r3_red_score: result.r3_red_score ?? match.r3_red_score,
                    total_blue_score: result.total_blue_score ?? match.total_blue_score,
                    total_red_score: result.total_red_score ?? match.total_red_score,
                    blue_gam_jeom: result.blue_gam_jeom ?? match.blue_gam_jeom,
                    red_gam_jeom: result.red_gam_jeom ?? match.red_gam_jeom,
                    blue_rounds_won: result.blue_rounds_won ?? match.blue_rounds_won,
                    red_rounds_won: result.red_rounds_won ?? match.red_rounds_won
                },
                include: { nextMatch: true }
            })

            // Bracket Progression
            if (updatedMatch.nextMatchId && result.winner) {
                const slot = updatedMatch.nextMatchSlot // "player1" or "player2"
                if (slot === 'player1') {
                    await prisma.match.update({
                        where: { id: updatedMatch.nextMatchId },
                        data: { player1: result.winner }
                    })
                } else if (slot === 'player2') {
                    await prisma.match.update({
                        where: { id: updatedMatch.nextMatchId },
                        data: { player2: result.winner }
                    })
                }
            }
            updatedCount++
        }

        return NextResponse.json({ success: true, updated: updatedCount })

    } catch (error) {
        console.error('Upload Results Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
