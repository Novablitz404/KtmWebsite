import { currentUser, clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import ClubDashboard from './ClubDashboard'

// Revalidate every 30 seconds for faster page loads
export const revalidate = 30

export default async function ClubPage() {
    const clerkUser = await currentUser()

    if (!clerkUser) {
        redirect('/sign-in')
    }

    // Get user with minimal data needed
    const dbUser = await prisma.user.findUnique({
        where: { clerkId: clerkUser.id },
        select: {
            id: true,
            role: true,
            clubName: true,
            club: {
                select: {
                    id: true,
                    name: true,
                    logoUrl: true,
                    address: true,
                    phone: true
                }
            }
        }
    })

    if (!dbUser) {
        redirect('/onboarding')
    }

    // Check if user is a club master or assistant
    let targetClub = dbUser.club
    if (!targetClub && dbUser.role === 'ASSISTANT_CLUB_MASTER' && dbUser.clubName) {
        targetClub = await prisma.club.findFirst({
            where: { name: dbUser.clubName },
            select: {
                id: true,
                name: true,
                logoUrl: true,
                address: true,
                phone: true
            }
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

    // Run ALL queries in parallel for maximum speed
    const [pendingPlayers, approvedPlayers, participatingTournaments] = await Promise.all([
        // Pending players - only select needed fields
        prisma.player.findMany({
            where: {
                clubId: targetClub.id,
                registrationStatus: 'PENDING'
            },
            select: {
                id: true,
                name: true,
                gender: true,
                belt: true,
                weight: true,
                height: true,
                skillLevel: true,
                registrationStatus: true,
                category: {
                    select: {
                        name: true,
                        tournament: {
                            select: {
                                name: true,
                                startDate: true
                            }
                        }
                    }
                },
                user: {
                    select: {
                        name: true,
                        email: true,
                        clerkId: true
                    }
                }
            },
            orderBy: {
                category: {
                    tournament: {
                        startDate: 'asc'
                    }
                }
            }
        }),

        // Approved players - only select needed fields
        prisma.player.findMany({
            where: {
                clubId: targetClub.id,
                registrationStatus: 'APPROVED'
            },
            select: {
                id: true,
                name: true,
                gender: true,
                belt: true,
                weight: true,
                height: true,
                skillLevel: true,
                registrationStatus: true,
                category: {
                    select: {
                        name: true,
                        tournament: {
                            select: {
                                name: true,
                                startDate: true
                            }
                        }
                    }
                },
                user: {
                    select: {
                        name: true,
                        email: true,
                        clerkId: true
                    }
                }
            },
            orderBy: {
                category: {
                    tournament: {
                        startDate: 'desc'
                    }
                }
            },
            take: 20
        }),

        // Tournament stats - simplified query
        prisma.tournament.findMany({
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
            select: {
                id: true,
                name: true,
                startDate: true,
                categories: {
                    select: {
                        players: {
                            where: {
                                clubId: targetClub.id,
                                registrationStatus: 'APPROVED'
                            },
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        matches: {
                            where: {
                                winner: { not: null }
                            },
                            select: {
                                player1: true,
                                player2: true,
                                winner: true,
                                nextMatchId: true,
                                id: true
                            }
                        }
                    }
                }
            },
            orderBy: { startDate: 'desc' },
            take: 10 // Limit to last 10 tournaments for speed
        })
    ])

    // Fetch avatars in parallel with a small batch
    const allPlayers = [...pendingPlayers, ...approvedPlayers]
    const clerkIds = [...new Set(
        allPlayers
            .map(p => p.user?.clerkId)
            .filter((id): id is string => !!id)
    )]

    let avatars: Record<string, string> = {}
    if (clerkIds.length > 0 && clerkIds.length <= 50) {
        try {
            const users = await (await clerkClient()).users.getUserList({
                userId: clerkIds,
                limit: 50
            })
            users.data.forEach(user => {
                avatars[user.id] = user.imageUrl
            })
        } catch (error) {
            console.error('Failed to fetch Clerk users:', error)
        }
    }

    // Calculate stats for each tournament (simplified)
    const clubTournaments = participatingTournaments.map(tournament => {
        let gold = 0
        let silver = 0
        let bronze = 0
        let athleteCount = 0

        const clubAthleteNames = new Set<string>()

        tournament.categories.forEach(category => {
            athleteCount += category.players.length
            category.players.forEach(p => clubAthleteNames.add(p.name))

            // Finals: matches with no nextMatchId
            const finals = category.matches.filter(m => !m.nextMatchId)

            finals.forEach(finalMatch => {
                if (finalMatch.winner && clubAthleteNames.has(finalMatch.winner)) {
                    gold++
                }
                if (finalMatch.winner) {
                    const loser = finalMatch.winner === finalMatch.player1 ? finalMatch.player2 : finalMatch.player1
                    if (clubAthleteNames.has(loser)) {
                        silver++
                    }
                }
            })

            // Semi-finals: matches whose nextMatch is a final
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
                    clubLogo={targetClub.logoUrl}
                    clubAddress={targetClub.address}
                    clubPhone={targetClub.phone}
                    userRole={dbUser.role}
                    avatars={avatars}
                    clubTournaments={clubTournaments}
                />
            </div>
        </main>
    )
}
