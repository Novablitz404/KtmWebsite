import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import TournamentBackButton from '@/components/TournamentBackButton'
import TournamentTabs from '@/components/TournamentTabs'

import { currentUser, clerkClient } from '@clerk/nextjs/server'
import PublicTournamentView from '@/components/PublicTournamentView'
import DeleteTournamentButton from '@/components/DeleteTournamentButton'


export default async function TournamentDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const user = await currentUser()
    let currentUserId = undefined

    if (user) {
        const dbUser = await prisma.user.findUnique({
            where: { clerkId: user.id },
            select: { id: true }
        })
        currentUserId = dbUser?.id
    }

    // Optimized query: include relations but only select needed fields where possible
    const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: {
            categories: {
                include: {
                    matches: {
                        orderBy: { round: 'asc' }
                    },
                    _count: {
                        select: { players: true }
                    }
                },
                orderBy: { name: 'asc' }
            },
            guidelineTemplate: true,
            managers: true
        }
    })

    if (!tournament) return notFound()

    // Auto-Start Logic: If today >= startDate and status is UPCOMING, update to ONGOING
    // This allows manual override (e.g. Cancelled/Completed won't be touched)
    // But keeps it automatic for the normal flow.
    if (tournament.status === 'UPCOMING' && new Date() >= new Date(tournament.startDate)) {
        await prisma.tournament.update({
            where: { id: tournament.id },
            data: { status: 'ONGOING' }
        })
        // Update local object to reflect change immediately
        tournament.status = 'ONGOING'
    }

    // Pass data to client component with managers and currentUserId
    const tournamentWithData = {
        ...tournament,
        currentUserId
    }

    // Fetch players - use select for nested relations
    // Count total players for pagination
    const totalPlayersCount = await prisma.player.count({
        where: {
            category: {
                tournamentId: id
            }
        }
    })

    // Fetch players - use select for nested relations - LIMIT TO 30
    const playersFetch = await prisma.player.findMany({
        where: {
            category: {
                tournamentId: id
            }
        },
        include: {
            category: {
                select: { id: true, name: true, type: true, tournamentId: true, court: true }
            },
            club: {
                select: { id: true, name: true, logoUrl: true }
            },
            user: {
                select: { clerkId: true }
            }
        },
        orderBy: {
            category: {
                name: 'asc'
            }
        },
        take: 30
    })

    // Type assertion or cleaner casting for the component props
    const players = playersFetch as any



    // Fetch pending manager invites
    const pendingManagerInvites = await prisma.tournamentManagerInvite.findMany({
        where: { tournamentId: id },
        orderBy: { createdAt: 'desc' }
    })

    // Determine permissions
    const isOrganizer = user && tournament.organizerId === currentUserId
    const isManager = user && tournament.managers.some(m => m.id === currentUserId)
    let isAdmin = false
    if (user && currentUserId) {
        const dbUser = await prisma.user.findUnique({ where: { id: currentUserId }, select: { role: true } })
        isAdmin = dbUser?.role === 'ADMIN'
    }

    // Fallback: If currentUserId was already fetched at top, use it.
    // wait, I fetched dbUser at top but didn't save role.
    // Let's refactor the top user fetch slightly to get role if needed, or re-fetch.
    // Actually, I can just use line 13's `dbUser` if I hoist it out or re-query efficiently.
    // Line 13 logic:
    /*
    if (user) {
        const dbUser = await prisma.user.findUnique(...)
        currentUserId = dbUser?.id
    }
    */
    // I will just re-fetch for simplicity or update the variable scope in a cleaner edit if possible, 
    // but the tool restricts me to a block. 
    // I'll just do a quick check here. It's properly awaited.

    // Better: Update the initial user fetch to include role.

    const canManage = isOrganizer || isManager || isAdmin

    // If public view, fetch user images from Clerk
    let enrichedPlayers = players
    if (!canManage) {
        try {
            const clerkIds = players.map((p: any) => p.user?.clerkId).filter(Boolean) as string[]
            // Deduplicate
            const uniqueids = Array.from(new Set(clerkIds))

            // Clerk API limit is 100 usually. For now assuming < 100 or partial.
            // If > 100, we might need batching.
            if (uniqueids.length > 0) {
                const client = await clerkClient() // Await the client Promise
                const clerkUsers = await client.users.getUserList({ userId: uniqueids, limit: 100 })

                const imageMap = new Map<string, string>()
                clerkUsers.data.forEach(u => {
                    imageMap.set(u.id, u.imageUrl)
                })

                enrichedPlayers = players.map((p: any) => ({
                    ...p,
                    imageUrl: p.user?.clerkId ? imageMap.get(p.user.clerkId) : undefined
                }))
            }
        } catch (e) {
            console.error('Failed to fetch clerk images', e)
        }
    }

    return (
        <main className="min-h-screen bg-gray-50 pb-20">
            <div className="max-w-[95%] mx-auto px-4 sm:px-6 lg:px-8 py-10">
                {canManage && (
                    <header className="mb-8">
                        <div className="mb-6">
                            <TournamentBackButton />
                        </div>
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                                    {tournament.name}
                                </h1>
                                <p className="mt-2 text-lg text-gray-600">
                                    {new Date(tournament.startDate).toLocaleDateString()}
                                </p>
                                {tournament.guidelineTemplate && (
                                    <p className="mt-1 text-sm text-indigo-600">
                                        📋 {tournament.guidelineTemplate.name}
                                    </p>
                                )}
                            </div>

                            {/* Registration & Actions */}
                            <div className="flex flex-col items-end gap-3">
                                <div className="flex items-center gap-3">
                                    {canManage && (
                                        <DeleteTournamentButton
                                            tournamentId={tournament.id}
                                            tournamentName={tournament.name}
                                        />
                                    )}
                                    {(() => {
                                        const now = new Date()
                                        const regStart = tournament.registrationStart ? new Date(tournament.registrationStart) : null
                                        const regEnd = tournament.registrationEnd ? new Date(tournament.registrationEnd) : null
                                        const isRegistered = currentUserId && players.some((p: any) => p.userId === currentUserId)

                                        if (isRegistered) {
                                            return (
                                                <button disabled className="px-6 py-2 bg-green-100 text-green-700 font-semibold rounded-lg shadow-sm border border-green-200 cursor-default">
                                                    ✅ Already Registered
                                                </button>
                                            )
                                        }

                                        if (regEnd && now > regEnd) {
                                            return (
                                                <button disabled className="px-6 py-2 bg-gray-100 text-gray-500 font-semibold rounded-lg border border-gray-200 cursor-not-allowed">
                                                    🚫 Registration Closed
                                                </button>
                                            )
                                        }

                                        if (regStart && now < regStart) {
                                            return (
                                                <button disabled className="px-6 py-2 bg-blue-50 text-blue-600 font-semibold rounded-lg border border-blue-100 cursor-default">
                                                    ⏳ Opens {regStart.toLocaleDateString()}
                                                </button>
                                            )
                                        }

                                        return (
                                            <a
                                                href={`/tournament/${id}/register`}
                                                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition-colors"
                                            >
                                                Register Now →
                                            </a>
                                        )

                                    })()}
                                </div>
                            </div>
                        </div>
                    </header>
                )}

                {canManage ? (
                    <TournamentTabs
                        tournament={tournamentWithData}
                        players={players}
                        totalPlayersCount={totalPlayersCount}
                        pendingManagerInvites={pendingManagerInvites}
                        publicView={false}
                    />
                ) : (
                    <PublicTournamentView
                        tournament={tournament}
                        players={enrichedPlayers}
                        guidelinesContent={
                            tournament.guidelineTemplate?.content
                                ? tournament.guidelineTemplate.content
                                    .replace(/{{Tournament Name}}/g, tournament.name)
                                    .replace(/{{Date}}/g, new Date(tournament.startDate).toLocaleDateString())
                                    .replace(/{{Venue}}/g, tournament.venue || 'TBA')
                                : null
                        }
                        currentUserId={currentUserId}
                    />
                )}
            </div>
        </main>
    )
}
