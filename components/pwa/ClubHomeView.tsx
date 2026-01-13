'use client'

import Link from 'next/link'
import PullToRefresh from '@/components/ui/PullToRefresh'

interface TournamentStats {
    id: string
    name: string
    startDate: Date
    athleteCount: number
    gold: number
    silver: number
    bronze: number
}

interface SimplePlayer {
    id: string
    name: string
    category: {
        name: string
        tournament: {
            name: string
        }
    }
}

interface ClubHomeViewProps {
    clubName?: string
    clubMasterName?: string
    clubLogo?: string | null
    clubAddress?: string | null
    totalMembers: number
    totalMedals: { gold: number; silver: number; bronze: number }
    pendingPlayers: SimplePlayer[]
    upcomingTournaments: TournamentStats[]
    onNavigateToMembers?: () => void
    onNavigateToTournaments?: () => void
    onApprove?: (playerId: string) => void
}

export default function ClubHomeView({
    clubName,
    clubMasterName,
    clubLogo,
    clubAddress,
    totalMembers,
    totalMedals,
    pendingPlayers,
    upcomingTournaments,
    onNavigateToMembers,
    onNavigateToTournaments,
    onApprove
}: ClubHomeViewProps) {
    const totalMedalCount = totalMedals.gold + totalMedals.silver + totalMedals.bronze

    return (
        <main className="min-h-[calc(100vh-64px)] bg-gray-50 flex flex-col">
            <PullToRefresh className="flex-1" mode="overlay">
                {/* Hero Section with Club Logo */}
                <div className="bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-500 pt-6 pb-14 px-4 flex-shrink-0">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center mb-3 shadow-lg">
                            {clubLogo ? (
                                <img
                                    src={clubLogo}
                                    alt={clubName || 'Club'}
                                    className="w-full h-full rounded-full object-contain bg-white p-1"
                                />
                            ) : (
                                <span className="text-4xl">🥋</span>
                            )}
                        </div>
                        <h1 className="text-2xl font-bold text-white">
                            {clubName || 'My Club'}
                        </h1>
                        <p className="text-white/80 text-base mt-1">
                            {clubMasterName || 'Club Master'}
                        </p>
                        {clubAddress && (
                            <span className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white shadow-sm truncate max-w-[250px]">
                                📍 {clubAddress}
                            </span>
                        )}
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="px-4 -mt-8 flex-shrink-0">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
                            <div className="text-2xl font-bold text-gray-900">{totalMembers}</div>
                            <div className="text-xs text-gray-500 mt-0.5">Members</div>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
                            <div className="text-2xl font-bold text-amber-500">{totalMedalCount}</div>
                            <div className="text-xs text-gray-500 mt-0.5">Medals</div>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
                            <div className="text-2xl font-bold text-indigo-600">{pendingPlayers.length}</div>
                            <div className="text-xs text-gray-500 mt-0.5">Pending</div>
                        </div>
                    </div>
                </div>

                {/* In Review / Inbox Section */}
                <div className="px-4 mt-4 flex-shrink-0">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Pending Approval</h2>
                    {pendingPlayers.length > 0 ? (
                        <div className="space-y-2">
                            {pendingPlayers.slice(0, 2).map(player => (
                                <div
                                    key={player.id}
                                    className="w-full flex items-center gap-3 bg-white rounded-xl shadow-sm border border-gray-100 p-3"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-xl flex-shrink-0">
                                        🥋
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-gray-900 truncate">{player.name}</h3>
                                        <p className="text-xs text-gray-500 truncate">
                                            {player.category.name} • {player.category.tournament.name}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => onApprove?.(player.id)}
                                        className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 active:scale-95 transition-all text-center flex-shrink-0"
                                    >
                                        Approve
                                    </button>
                                </div>
                            ))}
                            {pendingPlayers.length > 2 && (
                                <button
                                    onClick={onNavigateToTournaments}
                                    className="w-full text-center text-xs text-gray-500 font-medium py-1"
                                >
                                    View {pendingPlayers.length - 2} more pending...
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="w-full flex items-center gap-3 bg-white rounded-xl shadow-sm border border-gray-100 p-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-xl text-gray-400">
                                ✓
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-900">All caught up</h3>
                                <p className="text-sm text-gray-500">No players to approve</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Upcoming Tournament */}
                <div className="px-4 mt-4 flex-shrink-0">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Upcoming Tournament</h2>
                    {upcomingTournaments.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
                            <div className="text-3xl mb-1">🏆</div>
                            <p className="text-gray-500 text-sm">No upcoming tournament</p>
                        </div>
                    ) : (
                        <div>
                            {upcomingTournaments.slice(0, 1).map(tournament => (
                                <div
                                    key={tournament.id}
                                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-3"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-gray-900 truncate">{tournament.name}</h3>
                                            <p className="text-sm text-gray-500">
                                                {new Date(tournament.startDate).toLocaleDateString(undefined, {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                        <span className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                                            {tournament.athleteCount} athletes
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="px-4 mt-4 pb-20 flex-shrink-0">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Quick Actions</h2>
                    <div className="space-y-2">
                        <button
                            onClick={onNavigateToMembers}
                            className="w-full flex items-center gap-3 bg-white rounded-xl shadow-sm border border-gray-100 p-3 active:scale-[0.98] transition-all text-left"
                        >
                            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-xl">
                                👥
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-900">Manage Members</h3>
                                <p className="text-sm text-gray-500">View registered members</p>
                            </div>
                            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>

                        <Link
                            href="/tournaments"
                            className="flex items-center gap-3 bg-white rounded-xl shadow-sm border border-gray-100 p-3 active:scale-[0.98] transition-all"
                        >
                            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-xl">
                                🏆
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-900">Register Athletes</h3>
                                <p className="text-sm text-gray-500">Browse upcoming tournaments</p>
                            </div>
                            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                    </div>
                </div>
            </PullToRefresh>
        </main>
    )
}
