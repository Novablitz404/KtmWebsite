'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Calendar, MapPin, Search, Filter, Info, ChevronRight, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { Tournament, Player as PrismaPlayer } from '@prisma/client'

// Extended Player type with enriched fields
type Player = PrismaPlayer & {
    club: { name: string; logoUrl: string | null } | null
    imageUrl?: string
}

interface PublicTournamentViewProps {
    tournament: Tournament
    players: Player[]
    guidelinesContent?: string | null
    currentUserId?: string
}


export default function PublicTournamentView(props: PublicTournamentViewProps) {
    const { tournament, players } = props
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

    // Tab State
    const [activeTab, setActiveTab] = useState<'overview' | 'guidelines'>('overview')

    return (
        <div className="space-y-8">
            {/* Header Actions: Back & Registration Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <Link
                    href="/"
                    className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors hover:bg-gray-100 px-3 py-1.5 rounded-lg -ml-3"
                >
                    <ChevronRight className="w-4 h-4 mr-1.5 rotate-180" />
                    Back
                </Link>

                {/* Registration Action / Status */}
                <div>
                    {(() => {
                        const now = new Date()
                        const regStart = tournament.registrationStart ? new Date(tournament.registrationStart) : null
                        const regEnd = tournament.registrationEnd ? new Date(tournament.registrationEnd) : null
                        const isRegistered = props.currentUserId && players.some(p => p.userId === props.currentUserId)

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
                                href={`/tournament/${tournament.id}/register`}
                                className="inline-flex items-center px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition-all active:scale-95"
                            >
                                Register Now
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </a>
                        )
                    })()}
                </div>
            </div>

            {/* Tournament Banner */}
            {tournament.headerImageUrl && (
                <div className="relative w-full aspect-[3/1] rounded-2xl overflow-hidden shadow-lg bg-gray-100">
                    <img
                        src={tournament.headerImageUrl}
                        alt={tournament.name}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 md:p-10">

                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div className="flex flex-wrap gap-4 text-sm sm:text-base text-white/95 font-medium">
                                <span className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
                                    📅 {new Date(tournament.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                </span>
                                {tournament.venue && (
                                    <span className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
                                        📍 {tournament.venue}
                                    </span>
                                )}
                            </div>

                            {/* Registration Button */}

                        </div>
                    </div>
                </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex items-center gap-4 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'overview'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Overview
                </button>
                {props.guidelinesContent && (
                    <button
                        onClick={() => setActiveTab('guidelines')}
                        className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'guidelines'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Guidelines
                    </button>
                )}
            </div>

            {/* CONTENT: Overview */}
            {activeTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    {/* Stats Cards */}
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
            )}

            {/* CONTENT: Guidelines */}
            {activeTab === 'guidelines' && props.guidelinesContent && (
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 animate-in fade-in duration-300">
                    <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                        <h3 className="text-2xl font-bold text-gray-900">
                            Tournament Guidelines
                        </h3>
                        <Link
                            href={`/tournament/${tournament.id}/guidelines`}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors text-sm font-medium"
                        >
                            <FileText className="w-4 h-4" />
                            View Full Page / Download PDF
                        </Link>
                    </div>

                    <div className="prose prose-indigo max-w-none text-gray-600">
                        {props.guidelinesContent.split('\n').map((line, i) => (
                            line.trim() !== '' ?
                                <p key={i} className="mb-4 leading-relaxed">{line}</p>
                                : <div key={i} className="h-4" />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
