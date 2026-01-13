'use client'

import Link from 'next/link'

interface Tournament {
    id: string
    name: string
    startDate: Date | null
    venue: string | null
    status: string
    _count: {
        categories: number
    }
}

interface TournamentsListViewProps {
    tournaments: Tournament[]
    registeredTournamentIds: Set<string>
}

export default function TournamentsListView({ tournaments, registeredTournamentIds }: TournamentsListViewProps) {
    return (
        <div>
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
                <h1 className="text-xl font-bold text-gray-900">Register</h1>
                <p className="text-sm text-gray-500 mt-0.5">Browse upcoming tournaments</p>
            </div>

            {/* Tournament List */}
            {tournaments.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                    <p className="text-4xl mb-4">🏆</p>
                    <p className="text-gray-900 font-medium mb-1">No Upcoming Tournaments</p>
                    <p className="text-gray-500 text-sm">Check back soon for new events.</p>
                </div>
            ) : (
                <div className="divide-y divide-gray-200">
                    {tournaments.map(tournament => {
                        const isCancelled = tournament.status === 'CANCELLED'
                        const isRegistered = registeredTournamentIds.has(tournament.id)

                        // Mobile-friendly date format
                        const mobileDate = tournament.startDate?.toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                        })

                        return (
                            <div
                                key={tournament.id}
                                className={`px-4 py-4 ${isCancelled ? 'opacity-60' : ''}`}
                            >
                                {/* Tournament Info */}
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <h2 className={`text-base font-semibold ${isCancelled ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                            {tournament.name}
                                        </h2>
                                        <div className="flex items-center gap-2 mt-0.5 text-sm text-gray-500">
                                            <span>📅 {mobileDate}</span>
                                            {tournament.venue && (
                                                <>
                                                    <span className="text-gray-300">•</span>
                                                    <span className="truncate">{tournament.venue}</span>
                                                </>
                                            )}
                                        </div>
                                        <p className="mt-1 text-xs text-gray-400">
                                            {tournament._count.categories} categories
                                        </p>
                                    </div>
                                    {isCancelled && (
                                        <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                                            Cancelled
                                        </span>
                                    )}
                                </div>

                                {/* Action Button */}
                                <div className="mt-3">
                                    {isCancelled ? (
                                        <button
                                            disabled
                                            className="w-full py-2.5 bg-gray-100 text-gray-400 rounded-xl text-sm font-medium cursor-not-allowed"
                                        >
                                            Cancelled
                                        </button>
                                    ) : isRegistered ? (
                                        <div className="w-full py-2.5 bg-green-50 text-green-700 rounded-xl text-sm font-semibold text-center border border-green-200">
                                            ✓ Registered
                                        </div>
                                    ) : (
                                        <Link
                                            href={`/tournament/${tournament.id}/register`}
                                            className="block w-full py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold text-center hover:bg-red-700 active:scale-[0.98] transition-all"
                                        >
                                            Register
                                        </Link>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
