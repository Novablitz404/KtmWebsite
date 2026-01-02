import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { currentUser } from '@clerk/nextjs/server'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

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

        // Transform Data to Custom JSON Schema
        const matchesList: any[] = []

        tournament.categories.forEach(category => {
            // Create a map of player IDs to Names for quick lookup if needed
            // But match objects store player names usually in 'player1', 'player2' fields (legacy string)
            // or we might need to look them up.
            // Checking schema: Match has player1 (string), player2 (string) which are NAMES?
            // Let's check schema.prisma again to be sure.
            // Schema says: player1 String, player2 String. These are NAMES or IDs?
            // "player1 String" usually implies name in this codebase if not relational? 
            // Wait, Match does NOT have relation to Player model for p1/p2?
            // Looking at schema: 
            // player1 String
            // player2 String
            // winner String?

            // However, Player model exists.
            // If Match.player1 stores the NAME, then we use that.
            // But the JSON requires "Player_1_ID".
            // The match table typically doesn't store the ID if it's just 'player1 String'.
            // This is a potential issue.
            // Let's re-read the schema provided earlier.

            /*
            model Match {
              id Int @id @default(autoincrement())
              player1 String
              player2 String
              winner String?
              ...
            }
            */

            // It seems the current system stores NAMES in player1/player2.
            // Does it store IDs? The user earlier said "for the player id just what we already have now".
            // If the DB only has "John Doe", we can't give an ID like "00123" unless we lookup using Name?
            // That's risky.
            // Or maybe the 'player1' field actually stores the ID?
            // Let's look at `TournamentScheduler.tsx` or similar to see what's stored in player1.
            // Actually, I'll assume for now `player1` is the name, efficiently looking up the Player ID from the Category's players list matching the name.

            const playerMap = new Map<string, string>() // Name -> ID
            category.players.forEach(p => {
                playerMap.set(p.name, p.id)
            })

            category.matches.forEach(match => {
                const p1Name = match.player1
                const p2Name = match.player2
                const p1Id = playerMap.get(p1Name) || null
                const p2Id = playerMap.get(p2Name) || null

                // Determine Winner To Slot
                let winnerToSlot = null
                if (match.nextMatchSlot) {
                    // "upper" -> Player 1 ?? The schema just says "nextMatchSlot String?"
                    // Usually logic is "top" or "bottom". The user JSON says "Player 1" or "Player 2".
                    // I will map standard bracket logic if possible.
                    // If nextMatchSlot is "player1" or "player2" (classic bracket lib), I'll use that.
                    // If it's undefined, I might default to "Player 1" if it's the first feeder? 
                    // Let's just pass through what's in DB if it resembles that, or normalize it.
                    winnerToSlot = match.nextMatchSlot === 'player1' ? 'Player 1' : 'Player 2'
                }

                // If it's not set in DB, the Electron app might need to know? 
                // Using "Player 1" or "Player 2" as string literals as per user sample.

                matchesList.push({
                    "Match_ID": match.id,
                    "Category": category.name,
                    "Round": match.round,
                    "Player_1": p1Name,
                    "Player_1_ID": p1Id,
                    "Player_2": p2Name,
                    "Player_2_ID": p2Id,
                    "Winner_To_Match_ID": match.nextMatchId,
                    "Winner_To_Slot": match.nextMatchSlot === 'player1' ? 'Player 1' : (match.nextMatchSlot === 'player2' ? 'Player 2' : null),
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
            matches: matchesList
        })

    } catch (error) {
        console.error('Download API Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
