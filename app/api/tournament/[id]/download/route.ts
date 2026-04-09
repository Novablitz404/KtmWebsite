import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/supabase/server'

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
            const user = await getAuthUser()
            if (user) {
                const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
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
                            orderBy: { id: 'asc' },
                            include: {
                                nextMatch: true
                            }
                        },
                        poomsaeMatches: {
                            orderBy: { round: 'asc' },
                            include: {
                                player: {
                                    include: {
                                        club: true,
                                        user: true
                                    }
                                }
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
        const poomsaeMatchesList: any[] = []
        const masterList: any[] = []
        const processedEntries = new Set<string>() // To avoid exact duplicates if any

        tournament.categories.forEach(category => {
            const playerMap = new Map<string, { id: string, club: string }>() // Name -> { ID, Club }

            // Populate playerMap from category players
            category.players.forEach(p => {
                const clubName = p.club?.name || p.user?.clubName || ''
                const fullName = p.user?.name || p.name
                playerMap.set(fullName, { id: p.id, club: clubName })
            })

            // Master List Construction with Team ID Logic
            const clubPlayers = new Map<string, any[]>()
            category.players.forEach(p => {
                const clubName = p.club?.name || p.user?.clubName || 'Unattached'
                if (!clubPlayers.has(clubName)) {
                    clubPlayers.set(clubName, [])
                }
                clubPlayers.get(clubName)?.push(p)
            })

            clubPlayers.forEach((players, clubName) => {
                // simple sort to ensure deterministic team assignment
                players.sort((a, b) => a.name.localeCompare(b.name))

                players.forEach((p, index) => {
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
                            lastName = parts.slice(1).join(' ') || parts[0] // fallback if single name
                        }

                        // Date Formatting DD/MM/YYYY
                        let formattedDOB = ''
                        const rawDOB = p.user?.birthDate
                        if (rawDOB) {
                            const d = new Date(rawDOB)
                            formattedDOB = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`
                        }

                        // Gender M/F
                        const rawGender = p.gender || p.user?.gender || 'Male'
                        const gender = rawGender.charAt(0).toUpperCase() // 'M' or 'F'

                        // Event Type (Capitalize)
                        // Priority: Player Explicit Type -> Category Subtype -> Default
                        const rawType = p.poomsaeType || category.subtype || 'INDIVIDUAL'
                        const eventType = rawType.charAt(0) + rawType.slice(1).toLowerCase() // "Individual", "Team"

                        // Team ID Logic
                        let teamId = p.teamId || '' // Use explicit ID if set

                        // Infer if not set explicitly
                        if (!teamId) {
                            if (rawType === 'PAIR') {
                                teamId = (Math.floor(index / 2) + 1).toString()
                            } else if (rawType === 'TEAM') {
                                teamId = (Math.floor(index / 3) + 1).toString()
                            }
                        }

                        masterList.push({
                            Player_ID: p.id,
                            "First Name": firstName,
                            "Last Name": lastName,
                            "Date Of Birth": formattedDOB,
                            Gender: gender,
                            "Belt Rank": p.belt || p.user?.belt || 'White',
                            Club: clubName,
                            Court: category.court || '',
                            "Event Type": eventType,
                            "Team ID": teamId,
                            type: category.type
                        })
                    }
                })
            })

            // Process Kyorugi Matches
            category.matches.forEach(match => {
                const p1Name = match.player1
                const p2Name = match.player2

                const p1Info = playerMap.get(p1Name)
                const p2Info = playerMap.get(p2Name)

                const p1Id = p1Info?.id || ''
                const p2Id = p2Info?.id || ''
                const p1Club = p1Info?.club || ''
                const p2Club = p2Info?.club || ''

                let winnerToSlot = null
                if (match.nextMatchSlot) {
                    winnerToSlot = match.nextMatchSlot === 'player1' ? 'Player 1' :
                        (match.nextMatchSlot === 'player2' ? 'Player 2' : null)
                }

                matchesList.push({
                    id: match.id,
                    matchId: match.matchId,
                    category: category.name,
                    round: match.round,
                    scheduledDay: match.scheduledDay ?? null,
                    player1: p1Name,
                    player1Id: p1Id,
                    player1Club: p1Club,
                    player2: p2Name,
                    player2Id: p2Id,
                    player2Club: p2Club,
                    winner: match.winner || '',
                    nextMatchId: match.nextMatchId,
                    nextMatchSlot: winnerToSlot,
                    court: match.court,
                    r1_blue_score: match.r1_blue_score,
                    r1_red_score: match.r1_red_score,
                    r2_blue_score: match.r2_blue_score,
                    r2_red_score: match.r2_red_score,
                    r3_blue_score: match.r3_blue_score,
                    r3_red_score: match.r3_red_score,
                    total_blue_score: match.total_blue_score,
                    total_red_score: match.total_red_score,
                    blue_gam_jeom: match.blue_gam_jeom,
                    red_gam_jeom: match.red_gam_jeom,
                    blue_rounds_won: match.blue_rounds_won,
                    red_rounds_won: match.red_rounds_won
                })
            })

            // Process Poomsae Matches
            // displayName and memberIds are stored directly on PoomsaeMatch for TEAM/PAIR
            category.poomsaeMatches.forEach(match => {
                // Resolve player name for INDIVIDUAL (from relation)
                let playerName = ""
                if (match.player) {
                    playerName = match.player.user?.name || match.player.name
                }

                poomsaeMatchesList.push({
                    id: match.id,
                    matchId: match.matchId,
                    nextMatchId: match.nextMatchId,
                    category: category.name,
                    subtype: category.subtype || "INDIVIDUAL",
                    round: match.round,
                    scheduledDay: match.scheduledDay ?? null,
                    performanceNumber: match.performanceNumber,
                    playerId: match.playerId,
                    player: playerName,
                    displayName: match.displayName,
                    memberIds: match.memberIds,
                    memberNames: match.memberNames,
                    assignedForms: match.assignedForms,
                    targetRank: match.targetRank,
                    accuracy: match.accuracy,
                    presentation: match.presentation,
                    totalScore: match.totalScore,
                    rank: match.rank,
                    status: match.status,
                    court: match.court
                })
            })
        })

        // Sort by Match_ID so export is in sequential order (1, 2, 3...)
        matchesList.sort((a: any, b: any) => a.id - b.id)
        poomsaeMatchesList.sort((a: any, b: any) => a.matchId - b.matchId)

        return NextResponse.json({
            success: true,
            tournament: {
                id: tournament.id,
                name: tournament.name
            },
            matches: matchesList,
            poomsaeMatches: poomsaeMatchesList,
            masterList: masterList
        })

    } catch (error) {
        console.error('Download API Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
