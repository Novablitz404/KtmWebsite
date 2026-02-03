import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import TournamentTabs from '@/components/TournamentTabs'

import { currentUser, clerkClient } from '@clerk/nextjs/server'
import PublicTournamentView from '@/components/PublicTournamentView'


export default async function TournamentDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const user = await currentUser()
    let currentUserId = undefined
    let dbUserRole = undefined

    if (user) {
        const dbUser = await prisma.user.findUnique({
            where: { clerkId: user.id },
            select: { id: true, role: true }
        })
        currentUserId = dbUser?.id
        dbUserRole = dbUser?.role
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
                    poomsaeMatches: {
                        orderBy: { round: 'asc' },
                        include: {
                            player: {
                                include: { club: true }
                            }
                        }
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

    // Fetch Poomsae Team Players for Bracket Display (Members list)
    // We fetch only minimal info needed for display
    const poomsaeTeamPlayers = await prisma.player.findMany({
        where: {
            category: {
                tournamentId: id,
                type: 'POOMSAE',
                subtype: { in: ['PAIR', 'TEAM'] } // Only relevant subcategories
            }
        },
        select: {
            name: true,
            teamId: true,
            clubId: true,
            categoryId: true
        }
    })

    // Group users by "Category-Club-TeamID" to find peers
    const poomsaeTeamMap = new Map<string, { name: string }[]>()
    poomsaeTeamPlayers.forEach(p => {
        if (!p.teamId || !p.clubId) return
        const key = `${p.categoryId}-${p.clubId}-${p.teamId}`
        if (!poomsaeTeamMap.has(key)) poomsaeTeamMap.set(key, [])
        poomsaeTeamMap.get(key)!.push({ name: p.name })
    })

    // Enrich tournament categories with team members
    // We need to cast or clone because Prisma return types are strict
    const enrichedCategories = tournament.categories.map(cat => {
        if (cat.type !== 'POOMSAE' || !cat.poomsaeMatches) return cat

        const enrichedMatches = cat.poomsaeMatches.map((match: any) => {
            if (match.player?.teamId && match.player.club?.id) {
                const key = `${cat.id}-${match.player.club.id}-${match.player.teamId}`
                const members = poomsaeTeamMap.get(key)
                if (members) {
                    return { ...match, teamMembers: members }
                }
            }
            return match
        })

        return { ...cat, poomsaeMatches: enrichedMatches }
    })

    // Pass data to client component with managers and currentUserId
    const tournamentWithData = {
        ...tournament,
        categories: enrichedCategories,
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
    const isAdmin = dbUserRole === 'ADMIN'

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
        <main className="min-h-screen bg-gray-50">
            {canManage ? (
                <TournamentTabs
                    tournament={tournamentWithData}
                    players={players}
                    totalPlayersCount={totalPlayersCount}
                    pendingManagerInvites={pendingManagerInvites}
                    publicView={false}
                    userRole={dbUserRole}
                />
            ) : (
                <div className="max-w-[95%] mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <PublicTournamentView
                        tournament={tournament}
                        players={enrichedPlayers}
                        guidelinesContent={
                            tournament.guidelinesText || (tournament.guidelineTemplate?.content
                                ? tournament.guidelineTemplate.content
                                    .replace(/{{Tournament Name}}/g, tournament.name)
                                    .replace(/{{Date}}/g, new Date(tournament.startDate).toLocaleDateString())
                                    .replace(/{{Venue}}/g, tournament.venue || 'TBA')
                                : null)
                        }
                        currentUserId={currentUserId}
                    />
                </div>
            )}
        </main>
    )
}
