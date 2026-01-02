import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { currentUser } from '@clerk/nextjs/server'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const user = await currentUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const dbUser = await prisma.user.findUnique({
            where: { clerkId: user.id }
        })

        if (!dbUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Access Control
        const tournament = await prisma.tournament.findUnique({
            where: { id },
            include: { managers: true }
        })

        if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })

        const isOrganizer = tournament.organizerId === dbUser.id
        const isManager = tournament.managers.some(m => m.id === dbUser.id)

        if (!isOrganizer && !isManager && dbUser.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Parse Body
        const body = await request.json()
        if (!Array.isArray(body)) {
            return NextResponse.json({ error: 'Invalid payload: Expected array' }, { status: 400 })
        }

        let updatedCount = 0

        // Process Results Transactionally (or sequentially)
        // We'll iterate and update. 
        // Note: Bulk processing can be heavy, but typically < 100 matches at once.

        for (const result of body) {
            const { matchId, winnerId, scores } = result

            // Validate Match belongs to this tournament
            // We need to fetch match to check its category->tournament relation? 
            // Or assume match ID uniqueness is enough (Ints are unique per DB).
            // But strict checking is better.

            const match = await prisma.match.findUnique({
                where: { id: matchId },
                include: { categoryRef: true }
            })

            if (!match || match.categoryRef?.tournamentId !== id) {
                console.warn(`Skipping match ${matchId}: Not found or wrong tournament`)
                continue
            }

            // Parse scores "25-10" or similar?
            // The JSON from user sample was { "matchId": 101, "winnerId": "00123", "scores": "25-10" }
            // Our DB has r1_blue_score, total_blue_score etc.
            // Ideally the Electron app sends granular scores.
            // If it sends a simple string, we might just store total?
            // The DB schema has Integers for scores.
            // "scores": "25-10" -> Blue: 25, Red: 10?
            // We need to assume a format.
            // Let's parse split '-'

            let blueScore = 0
            let redScore = 0
            if (typeof scores === 'string' && scores.includes('-')) {
                const parts = scores.split('-')
                blueScore = parseInt(parts[0]) || 0
                redScore = parseInt(parts[1]) || 0
            }

            // Get Winner Name (Since DB stores Winner Name, not ID currently?)
            // Check Schema: `winner String?`
            // User JSON usually sends ID.
            // We need to find the name from the ID.
            // Since we don't have direct player lookup easily without fetching, 
            // We might need to check who is who in the match.

            // Wait, match.player1 and match.player2 are NAMES in DB likely?
            // If winnerId matches match.player1's ID... we need to resolve IDs again.
            // This suggests "player1" and "player2" in `Match` model MIGHT need to be IDs, or we rely on names.

            // Let's assume the Name is passed if DB uses Name? 
            // Or we fetch Player by ID to get the Name.
            let winnerName = null
            if (winnerId) {
                const winnerPlayer = await prisma.player.findUnique({
                    where: { id: winnerId }
                })
                if (winnerPlayer) winnerName = winnerPlayer.name
            }

            // Update Match
            const updatedMatch = await prisma.match.update({
                where: { id: matchId },
                data: {
                    winner: winnerName,
                    total_blue_score: blueScore,
                    total_red_score: redScore,
                    status: 'Completed'
                },
                include: { nextMatch: true }
            })

            // Bracket Progression
            // If there is a next match, place the winner there
            if (updatedMatch.nextMatchId && winnerName) {
                // Check which slot
                const slot = updatedMatch.nextMatchSlot // "player1" or "player2"

                if (slot === 'player1') {
                    await prisma.match.update({
                        where: { id: updatedMatch.nextMatchId },
                        data: { player1: winnerName }
                    })
                } else if (slot === 'player2') {
                    await prisma.match.update({
                        where: { id: updatedMatch.nextMatchId },
                        data: { player2: winnerName }
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
