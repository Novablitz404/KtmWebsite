import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { currentUser } from '@clerk/nextjs/server'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const apiKey = request.headers.get('x-api-key')

        let isAuthorized = false

        // 1. Check API Key first
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

        // 2. Fallback to User Session (for Browser testing)
        if (!isAuthorized) {
            const user = await currentUser()
            if (user) {
                const dbUser = await prisma.user.findUnique({ where: { clerkId: user.id } })
                if (dbUser) {
                    // Check tournament permissions
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

        // Fetch tournament with broad inclusion
        const tournament = await prisma.tournament.findUnique({
            where: { id },
            include: {
                categories: {
                    include: {
                        matches: {
                            orderBy: { round: 'asc' },
                            include: {
                                nextMatch: true
                            }
                        },
                        players: {
                            include: {
                                user: true,
                                club: true
                            }
                        }
                    }
                },
                managers: true
            }
        })

        if (!tournament) {
            return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
        }

        const matchesList: any[] = []
        const masterList: any[] = []
        const processedEntries = new Set<string>() // To avoid exact duplicates if any

        tournament.categories.forEach(category => {
            const playerMap = new Map<string, string>() // Name -> ID

            category.players.forEach(p => {
                playerMap.set(p.name, p.id)

                // Master List Construction
                // Create a unique key for this Player+Category entry
                const entryKey = `${p.id}-${category.id}`
                if (!processedEntries.has(entryKey)) {
                    processedEntries.add(entryKey)

                    let firstName = ''
                    let lastName = ''
                    // Try to split name from User or Player
                    const fullName = p.user?.name || p.name
                    if (fullName) {
                        const parts = fullName.split(' ')
                        firstName = parts[0]
                        lastName = parts.slice(1).join(' ')
                    }

                    // Determine formatting for export
                    masterList.push({
                        id: p.id,
                        firstName,
                        lastName,
                        gender: p.gender || p.user?.gender || 'Male',
                        birthDate: p.user?.birthDate ? new Date(p.user.birthDate).toISOString().split('T')[0] : '', // YYYY-MM-DD
                        belt: p.belt || p.user?.belt || 'White',
                        club: p.club?.name || p.user?.clubName || '',
                        court: category.court || '',
                        type: category.type
                    })
                }
            })

            category.matches.forEach(match => {
                const p1Name = match.player1
                const p2Name = match.player2
                const p1Id = playerMap.get(p1Name) || null
                const p2Id = playerMap.get(p2Name) || null

                let winnerToSlot = null
                if (match.nextMatchSlot) {
                    winnerToSlot = match.nextMatchSlot === 'player1' ? 'Player 1' :
                        (match.nextMatchSlot === 'player2' ? 'Player 2' : null)
                }

                matchesList.push({
                    "Match_ID": match.id,
                    "Category": category.name,
                    "Round": match.round,
                    "Player_1": p1Name,
                    "Player_1_ID": p1Id,
                    "Player_2": p2Name,
                    "Player_2_ID": p2Id,
                    "Winner_To_Match_ID": match.nextMatchId,
                    "Winner_To_Slot": winnerToSlot,
                    "Court": match.court
                })
            })
        })

        return NextResponse.json({
            success: true,
            tournament: {
                id: tournament.id,
                name: tournament.name
            },
            matches: matchesList,
            masterList: masterList
        })

    } catch (error) {
        console.error('Download API Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
