import { prisma } from '@/lib/prisma'

interface ClubTournamentSectionProps {
    clubName: string | null
}

export default async function ClubTournamentSection({ clubName }: ClubTournamentSectionProps) {
    if (!clubName) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-900">Club Tournaments</h2>
                </div>
                <div className="px-6 py-12 text-center text-gray-500">
                    <p>No club associated with your account.</p>
                </div>
            </div>
        )
    }

    // Find all players from this club and their tournaments
    const clubPlayers = await prisma.player.findMany({
        where: {
            club: {
                name: clubName
            }
        },
        include: {
            category: {
                include: {
                    tournament: true
                }
            }
        },
        orderBy: {
            category: {
                tournament: {
                    startDate: 'desc'
                }
            }
        }
    })

    // Group by tournament
    const tournamentMap = new Map<string, {
        tournament: { id: string; name: string; startDate: Date; venue: string | null };
        playerCount: number;
        categories: Set<string>;
    }>()

    clubPlayers.forEach(player => {
        const tournament = player.category.tournament
        if (!tournamentMap.has(tournament.id)) {
            tournamentMap.set(tournament.id, {
                tournament,
                playerCount: 0,
                categories: new Set()
            })
        }
        const data = tournamentMap.get(tournament.id)!
        data.playerCount++
        data.categories.add(player.category.name)
    })

    const tournaments = Array.from(tournamentMap.values())

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Club Tournaments</h2>
                    <p className="text-sm text-gray-500">{clubName}</p>
                </div>
                {/* Placeholder for future medal stats */}
                <div className="flex gap-3 text-center">
                    <div className="px-3 py-1 bg-yellow-100 rounded-lg">
                        <span className="text-lg">🥇</span>
                        <p className="text-xs text-gray-600">0</p>
                    </div>
                    <div className="px-3 py-1 bg-gray-100 rounded-lg">
                        <span className="text-lg">🥈</span>
                        <p className="text-xs text-gray-600">0</p>
                    </div>
                    <div className="px-3 py-1 bg-orange-100 rounded-lg">
                        <span className="text-lg">🥉</span>
                        <p className="text-xs text-gray-600">0</p>
                    </div>
                </div>
            </div>
            <div className="divide-y divide-gray-200">
                {tournaments.length === 0 ? (
                    <div className="px-6 py-12 text-center text-gray-500">
                        <p className="mb-2">Your club hasn't entered any tournaments yet.</p>
                        <a href="/club" className="text-indigo-600 hover:text-indigo-500 font-medium">
                            Register Athletes →
                        </a>
                    </div>
                ) : (
                    tournaments.map(({ tournament, playerCount, categories }) => (
                        <div key={tournament.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                            <div>
                                <p className="font-medium text-gray-900">{tournament.name}</p>
                                <p className="text-sm text-gray-500">
                                    {playerCount} athlete{playerCount !== 1 ? 's' : ''} • {categories.size} categor{categories.size !== 1 ? 'ies' : 'y'}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-500">
                                    {new Date(tournament.startDate).toLocaleDateString()}
                                </p>
                                {tournament.venue && (
                                    <p className="text-xs text-gray-400">{tournament.venue}</p>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
