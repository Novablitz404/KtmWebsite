'use client'

interface Player {
    id: string
    belt: string | null
    category: {
        id: string
        name: string
        tournament: {
            id: string
            name: string
            startDate: Date
        }
    }
}

interface MyEventsViewProps {
    players: Player[]
}

export default function MyEventsView({ players }: MyEventsViewProps) {
    // Group by tournament
    const tournamentMap = new Map<string, { tournament: Player['category']['tournament'], entries: Player[] }>()

    players.forEach(player => {
        const tournamentId = player.category.tournament.id
        if (!tournamentMap.has(tournamentId)) {
            tournamentMap.set(tournamentId, {
                tournament: player.category.tournament,
                entries: []
            })
        }
        tournamentMap.get(tournamentId)!.entries.push(player)
    })

    // Sort by date (most recent first)
    const tournaments = Array.from(tournamentMap.values())
        .sort((a, b) => new Date(b.tournament.startDate).getTime() - new Date(a.tournament.startDate).getTime())

    return (
        <div>
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
                <h1 className="text-xl font-bold text-gray-900">My Events</h1>
                <p className="text-sm text-gray-500 mt-0.5">Your registered tournaments</p>
            </div>

            {/* Events List */}
            {tournaments.length === 0 ? (
                <div className="p-8 text-center">
                    <p className="text-4xl mb-4">📋</p>
                    <p className="text-gray-900 font-medium mb-1">No events yet</p>
                    <p className="text-gray-500 text-sm">Register for upcoming tournaments to see them here.</p>
                </div>
            ) : (
                <div className="divide-y divide-gray-200">
                    {tournaments.map(({ tournament, entries }) => {
                        const eventDate = new Date(tournament.startDate)
                        const isUpcoming = eventDate >= new Date()

                        // Format date
                        const formattedDate = eventDate.toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        })

                        return (
                            <div
                                key={tournament.id}
                                className="px-4 py-3 flex items-center justify-between"
                            >
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-sm font-semibold text-gray-900 truncate">
                                        {tournament.name}
                                    </h2>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {formattedDate} • {entries.length} {entries.length === 1 ? 'category' : 'categories'}
                                    </p>
                                </div>
                                {isUpcoming ? (
                                    <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                                        Upcoming
                                    </span>
                                ) : (
                                    <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                                        Completed
                                    </span>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
