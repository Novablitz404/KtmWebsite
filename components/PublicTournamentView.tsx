'use client'

import { useState } from 'react'
import { Tournament, Player as PrismaPlayer } from '@prisma/client'

// Extended Player type with enriched fields
type Player = PrismaPlayer & {
    club: { name: string; logoUrl: string | null } | null
    imageUrl?: string
}

interface PublicTournamentViewProps {
    tournament: Tournament
    players: Player[]
}

export default function PublicTournamentView({ tournament, players }: PublicTournamentViewProps) {
    // Participating Teams (Unique Clubs)
    const clubMap = new Map<string, string | null>()
    players.forEach(p => {
        if (p.club?.name) {
            // Store logo if not already set or overwrite if current is null (though consistent data preferred)
            if (!clubMap.has(p.club.name) || p.club.logoUrl) {
                clubMap.set(p.club.name, p.club.logoUrl || null)
            }
        }
    })

    const teams = Array.from(clubMap.keys()).sort()

    // Pagination for Athletes
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 50
    const totalPages = Math.ceil(players.length / itemsPerPage)
    const displayedPlayers = players.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    return (
        <div className="space-y-12">
            {/* Tournament Details Header - (Already in Page, but we can add Description/Stats here) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
                    <span className="text-4xl font-bold text-indigo-600 block mb-1">{teams.length}</span>
                    <span className="text-sm text-gray-500 font-medium uppercase tracking-wider">Participating Teams</span>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
                    <span className="text-4xl font-bold text-indigo-600 block mb-1">{players.length}</span>
                    <span className="text-sm text-gray-500 font-medium uppercase tracking-wider">Registered Athletes</span>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center flex flex-col justify-center">
                    <span className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-2">Venue</span>
                    <span className="text-lg font-semibold text-gray-900">{tournament.venue || 'TBA'}</span>
                </div>
            </div>

            {/* Participating Teams */}
            <section>
                <h3 className="text-xl font-bold text-gray-900 mb-6">
                    Participating Teams
                </h3>
                {teams.length === 0 ? (
                    <div className="text-gray-500 italic">No teams registered yet.</div>
                ) : (
                    <div className="flex flex-wrap gap-3">
                        {teams.map((teamName, idx) => {
                            const logoUrl = clubMap.get(teamName)
                            return (
                                <span key={idx} className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 text-gray-700 font-medium flex items-center gap-2 pr-6">
                                    {logoUrl ? (
                                        <div className="w-8 h-8 rounded-md bg-white border border-gray-100 p-0.5 shadow-sm overflow-hidden flex-shrink-0">
                                            <img src={logoUrl} alt={teamName} className="w-full h-full object-contain" />
                                        </div>
                                    ) : (
                                        <span className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center text-xs text-gray-400 font-bold border border-gray-200">
                                            {teamName.substring(0, 2).toUpperCase()}
                                        </span>
                                    )}
                                    <span>{teamName}</span>
                                </span>
                            )
                        })}
                    </div>
                )}
            </section>

            {/* Athletes Grid */}
            <section>
                <div className="flex justify-between items-end mb-6">
                    <h3 className="text-xl font-bold text-gray-900">
                        Registered Athletes
                    </h3>
                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 text-sm font-medium rounded-md text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Prev
                            </button>
                            <span className="px-2 py-1 text-sm text-gray-500 self-center">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 text-sm font-medium rounded-md text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>

                {players.length === 0 ? (
                    <div className="text-gray-500 italic">No athletes registered yet.</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {displayedPlayers.map((player) => {
                            const initials = player.name
                                .split(' ')
                                .map(n => n[0])
                                .slice(0, 2)
                                .join('')
                                .toUpperCase();

                            return (
                                <div key={player.id} className="group bg-white rounded-xl p-3 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 flex flex-col items-center text-center relative overflow-hidden">

                                    {/* Top Background Decoration */}
                                    <div className="absolute top-0 left-0 w-full h-12 bg-gradient-to-b from-gray-50 to-white z-0" />

                                    {/* Avatar */}
                                    <div className="relative z-10 mb-2">
                                        <div className="p-0.5 bg-white rounded-full shadow-sm">
                                            {player.imageUrl ? (
                                                <img
                                                    src={player.imageUrl}
                                                    alt={player.name}
                                                    className="w-14 h-14 rounded-full object-cover bg-gray-100"
                                                />
                                            ) : (
                                                <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center text-lg font-bold border border-indigo-100">
                                                    {initials}
                                                </div>
                                            )}
                                        </div>
                                        {/* Belt Indicator (if exists) */}
                                        {player.belt && (
                                            <div className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border shadow-sm ${player.belt === 'Black' ? 'bg-black text-white border-gray-800' :
                                                    player.belt === 'Red' ? 'bg-red-600 text-white border-red-700' :
                                                        player.belt === 'Brown' ? 'bg-amber-800 text-white border-amber-900' :
                                                            player.belt === 'Blue' ? 'bg-blue-600 text-white border-blue-700' :
                                                                player.belt === 'Yellow' ? 'bg-yellow-400 text-yellow-900 border-yellow-500' :
                                                                    'bg-white text-gray-700 border-gray-200'
                                                    }`}>
                                                    {player.belt}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="relative z-10 w-full mt-1">
                                        <h3 className="font-bold text-gray-900 text-sm truncate px-1" title={player.name}>
                                            {player.name}
                                        </h3>
                                        <div className="flex items-center justify-center gap-1.5 mt-0.5 px-2">
                                            {player.club?.logoUrl && (
                                                <img
                                                    src={player.club.logoUrl}
                                                    alt="Club"
                                                    className="w-4 h-4 object-contain rounded-sm"
                                                />
                                            )}
                                            <p className="text-xs text-gray-500 truncate max-w-[120px]">
                                                {player.club?.name || 'Independent'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </section>
        </div>
    )
}
