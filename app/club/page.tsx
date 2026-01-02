import { currentUser, clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import ClubDashboard from './ClubDashboard'

export default async function ClubPage() {
    const clerkUser = await currentUser()

    if (!clerkUser) {
        redirect('/sign-in')
    }

    // Get user and check role
    const dbUser = await prisma.user.findUnique({
        where: { clerkId: clerkUser.id },
        include: {
            club: true
        }
    })

    if (!dbUser) {
        redirect('/onboarding')
    }

    // Check if user is a club master or assistant
    let targetClub = dbUser.club
    if (!targetClub && dbUser.role === 'ASSISTANT_CLUB_MASTER' && dbUser.clubName) {
        targetClub = await prisma.club.findFirst({
            where: { name: dbUser.clubName }
        })
    }

    if ((dbUser.role !== 'CLUB_MASTER' && dbUser.role !== 'ASSISTANT_CLUB_MASTER') || !targetClub) {
        return (
            <main className="min-h-[calc(100vh-4rem)] bg-gray-50 pb-20">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                        <p className="text-4xl mb-4">🏫</p>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Club Management Access Only</h1>
                        <p className="text-gray-600">
                            This page is only accessible to Club Masters and Assistants.
                        </p>
                        <a href="/profile" className="mt-4 inline-block text-indigo-600 hover:text-indigo-500">
                            Go to Profile →
                        </a>
                    </div>
                </div>
            </main>
        )
    }

    // Get pending registrations for this club
    const pendingPlayers = await prisma.player.findMany({
        where: {
            clubId: targetClub.id,
            registrationStatus: 'PENDING'
        },
        include: {
            category: {
                include: {
                    tournament: true
                }
            },
            user: true
        },
        orderBy: {
            category: {
                tournament: {
                    startDate: 'asc'
                }
            }
        }
    })

    // Get approved registrations
    const approvedPlayers = await prisma.player.findMany({
        where: {
            clubId: targetClub.id,
            registrationStatus: 'APPROVED'
        },
        include: {
            category: {
                include: {
                    tournament: true
                }
            },
            user: true
        },
        orderBy: {
            category: {
                tournament: {
                    startDate: 'desc'
                }
            }
        },
        take: 20
    })

    // Get clerk IDs for all players to fetch avatars
    const allPlayers = [...pendingPlayers, ...approvedPlayers]
    const clerkIds = allPlayers
        .map(p => p.user?.clerkId)
        .filter((id): id is string => !!id)

    // Fetch user details from Clerk
    // We fetch in chunks if needed, but for now we'll just fetch by ID list if supported,
    // or we might need to rely on the fact that we can't easily fetch a list by IDs in one go efficiently without potentially hitting limits if many.
    // However, getUserList supports `userId` array.

    let avatars: Record<string, string> = {}
    if (clerkIds.length > 0) {
        try {
            // Deduplicate IDs
            const uniqueIds = Array.from(new Set(clerkIds))
            const users = await (await clerkClient()).users.getUserList({
                userId: uniqueIds,
                limit: 100
            })

            users.data.forEach(user => {
                avatars[user.id] = user.imageUrl
            })
        } catch (error) {
            console.error('Failed to fetch Clerk users:', error)
        }
    }

    // Get all tournaments the club is participating in (via approved players)
    const participatingTournaments = await prisma.tournament.findMany({
        where: {
            categories: {
                some: {
                    players: {
                        some: {
                            clubId: targetClub.id,
                            registrationStatus: 'APPROVED'
                        }
                    }
                }
            }
        },
        include: {
            categories: {
                include: {
                    players: {
                        where: {
                            clubId: targetClub.id,
                            registrationStatus: 'APPROVED'
                        }
                    },
                    matches: {
                        include: {
                            nextMatch: true
                        }
                    }
                }
            }
        },
        orderBy: { startDate: 'desc' }
    })

    // Calculate stats for each tournament
    const clubTournaments = participatingTournaments.map(tournament => {
        let gold = 0
        let silver = 0
        let bronze = 0
        let athleteCount = 0

        // Get all club athlete names for this tournament to match against match results
        const clubAthleteNames = new Set<string>()

        tournament.categories.forEach(category => {
            // Count athletes
            athleteCount += category.players.length
            category.players.forEach(p => clubAthleteNames.add(p.name))

            // Calculate medals from matches
            // We need to identify Finals and Semi-Finals
            const finals = category.matches.filter(m => !m.nextMatchId)

            finals.forEach(finalMatch => {
                // Gold: Winner is club athlete
                if (finalMatch.winner && clubAthleteNames.has(finalMatch.winner)) {
                    gold++
                }
                // Silver: Loser is club athlete (Game must be finished/have a winner)
                if (finalMatch.winner) {
                    const loser = finalMatch.winner === finalMatch.player1 ? finalMatch.player2 : finalMatch.player1
                    if (clubAthleteNames.has(loser)) {
                        silver++
                    }
                }
            })

            // Bronze: Losers of matches that feed into the Final (Semi-Finals)
            // A semi-final is any match whose `nextMatch` is a Final.
            const semiFinals = category.matches.filter(m =>
                m.nextMatchId && finals.some(f => f.id === m.nextMatchId)
            )

            semiFinals.forEach(semi => {
                if (semi.winner) {
                    const loser = semi.winner === semi.player1 ? semi.player2 : semi.player1
                    if (clubAthleteNames.has(loser)) {
                        bronze++
                    }
                }
            })
        })

        return {
            id: tournament.id,
            name: tournament.name,
            startDate: tournament.startDate,
            athleteCount,
            gold,
            silver,
            bronze
        }
    })

    return (
        <main className="min-h-[calc(100vh-4rem)] bg-gray-50 pb-2">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">

                <ClubDashboard
                    pendingPlayers={pendingPlayers}
                    approvedPlayers={approvedPlayers}
                    clubId={targetClub.id}
                    avatars={avatars}
                    clubTournaments={clubTournaments}
                />
            </div>
        </main>
    )
}
