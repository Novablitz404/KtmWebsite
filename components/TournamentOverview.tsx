'use client'

import { useMemo } from 'react'
import { Category, Match, Player, Tournament } from '@prisma/client'
import { Users, Trophy, ClipboardList, Calendar, MapPin, TrendingUp } from 'lucide-react'

type TournamentWithData = Tournament & {
    categories: (Category & { matches: Match[], poomsaeMatches: any[], _count?: { players: number } })[]
}

type PlayerWithClub = Player & {
    category: { id: string; name: string; type: string }
    club: { id: string; name: string; logoUrl?: string | null } | null
}

type TournamentStats = {
    total: number
    approved: number
    pending: number
    rejected: number
    kyorugi: number
    poomsae: number
    kyukpa: number
    clubs: { name: string; logoUrl: string | null; count: number; approved: number; pending: number }[]
}

interface TournamentOverviewProps {
    tournament: TournamentWithData
    players: PlayerWithClub[]  // still passed but only used as fallback
    totalPlayersCount: number
    stats?: TournamentStats
}

export default function TournamentOverview({ tournament, players, totalPlayersCount, stats }: TournamentOverviewProps) {
    // ─── Use pre-aggregated stats when available, fall back to client-side derivation ───
    const approvedCount    = stats?.approved    ?? players.filter(p => p.registrationStatus === 'APPROVED').length
    const pendingCount     = stats?.pending     ?? players.filter(p => p.registrationStatus === 'PENDING').length
    const rejectedCount    = stats?.rejected    ?? players.filter(p => p.registrationStatus === 'REJECTED').length
    const kyorugiPlayers   = stats?.kyorugi     ?? players.filter(p => (p.category as any)?.type === 'KYORUGI').length
    const poomsaePlayers   = stats?.poomsae     ?? players.filter(p => (p.category as any)?.type === 'POOMSAE').length
    const kyukpaPlayers    = stats?.kyukpa      ?? players.filter(p => (p.category as any)?.type === 'KYUKPA').length

    // ─── Category breakdowns (from tournament.categories — always complete) ───
    const totalCategories  = tournament.categories.length
    const kyorugiCategories = tournament.categories.filter(c => (c as any).type === 'KYORUGI').length
    const poomsaeCategories = tournament.categories.filter(c => (c as any).type === 'POOMSAE').length
    const kyukpaCategories  = tournament.categories.filter(c => (c as any).type === 'KYUKPA').length

    const daysUntil = Math.max(0, Math.ceil((new Date(tournament.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    const isPast    = new Date(tournament.startDate) < new Date()

    // ─── Club stats: use pre-aggregated if available, derive from players as fallback ───
    const clubStats = useMemo(() => {
        if (stats?.clubs) return stats.clubs

        const map = new Map<string, { name: string; logoUrl: string | null; count: number; approved: number; pending: number }>()
        players.forEach(player => {
            const clubName = player.club?.name || 'Unaffiliated'
            const clubKey  = player.club?.id || clubName
            const existing = map.get(clubKey)
            if (existing) {
                existing.count++
                if (player.registrationStatus === 'APPROVED') existing.approved++
                if (player.registrationStatus === 'PENDING')  existing.pending++
            } else {
                map.set(clubKey, {
                    name: typeof clubName === 'string' ? clubName : 'Unaffiliated',
                    logoUrl: player.club?.logoUrl || null,
                    count: 1,
                    approved: player.registrationStatus === 'APPROVED' ? 1 : 0,
                    pending:  player.registrationStatus === 'PENDING'  ? 1 : 0,
                })
            }
        })
        return Array.from(map.values()).sort((a, b) => b.count - a.count)
    }, [players, stats])

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Tournament Overview</h1>
                    <p className="text-gray-500 font-medium pt-1">At a glance tournament performance and participation.</p>
                </div>
                <div className="flex items-center gap-2 px-6 py-2 bg-gray-900 rounded-full shadow-lg">
                    <div className={`w-2 h-2 rounded-full ${tournament.status === 'ONGOING' ? 'bg-green-400' : tournament.status === 'COMPLETED' ? 'bg-blue-400' : 'bg-amber-400'} animate-pulse`} />
                    <span className="text-xs font-black text-white uppercase tracking-[0.2em]">{tournament.status}</span>
                </div>
            </div>

            {/* ─── Stats Grid ─── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Athletes */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                            <Users className="w-5 h-5 text-red-600" />
                        </div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Athletes</span>
                    </div>
                    <p className="text-3xl font-black text-gray-900">{totalPlayersCount}</p>
                    <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-green-600 font-semibold">{approvedCount} approved</span>
                        <span className="text-xs text-amber-600 font-semibold">{pendingCount} pending</span>
                    </div>
                </div>

                {/* Categories */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                            <ClipboardList className="w-5 h-5 text-indigo-600" />
                        </div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Categories</span>
                    </div>
                    <p className="text-3xl font-black text-gray-900">{totalCategories}</p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {kyorugiCategories > 0 && <span className="text-xs text-red-600 font-semibold">{kyorugiCategories} Kyorugi</span>}
                        {poomsaeCategories > 0 && <span className="text-xs text-blue-600 font-semibold">{poomsaeCategories} Poomsae</span>}
                        {kyukpaCategories > 0 && <span className="text-xs text-purple-600 font-semibold">{kyukpaCategories} Kyukpa</span>}
                    </div>
                </div>

                {/* Clubs */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-emerald-600" />
                        </div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Clubs</span>
                    </div>
                    <p className="text-3xl font-black text-gray-900">{clubStats.length}</p>
                    <p className="text-xs text-gray-500 mt-2 font-medium">Participating clubs / teams</p>
                </div>

                {/* Countdown / Date */}
                <div className="bg-gray-900 p-5 rounded-2xl shadow-lg relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                {isPast ? 'Event Date' : 'Countdown'}
                            </span>
                        </div>
                        {isPast ? (
                            <>
                                <p className="text-lg font-black text-white">
                                    {new Date(tournament.startDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                                </p>
                                <p className="text-xs text-gray-500 mt-2 font-medium">{tournament.venue || 'No venue set'}</p>
                            </>
                        ) : (
                            <>
                                <p className="text-3xl font-black text-white">{daysUntil}</p>
                                <p className="text-xs text-gray-500 mt-2 font-medium">Days until the event</p>
                            </>
                        )}
                    </div>
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
                </div>
            </div>

            {/* ─── Discipline Athlete Breakdown ─── */}
            {(kyorugiPlayers > 0 || poomsaePlayers > 0 || kyukpaPlayers > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Kyorugi */}
                    {kyorugiPlayers > 0 && (
                        <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                                    <Trophy className="w-5 h-5 text-red-600" />
                                </div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kyorugi</span>
                            </div>
                            <p className="text-3xl font-black text-gray-900">{kyorugiPlayers}</p>
                            <p className="text-xs text-gray-500 mt-2 font-medium">
                                {kyorugiCategories} {kyorugiCategories === 1 ? 'category' : 'categories'} · Sparring
                            </p>
                        </div>
                    )}

                    {/* Poomsae */}
                    {poomsaePlayers > 0 && (
                        <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                                    <Users className="w-5 h-5 text-blue-600" />
                                </div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Poomsae</span>
                            </div>
                            <p className="text-3xl font-black text-gray-900">{poomsaePlayers}</p>
                            <p className="text-xs text-gray-500 mt-2 font-medium">
                                {poomsaeCategories} {poomsaeCategories === 1 ? 'category' : 'categories'} · Forms
                            </p>
                        </div>
                    )}

                    {/* Kyukpa */}
                    {kyukpaPlayers > 0 && (
                        <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                                    <TrendingUp className="w-5 h-5 text-purple-600" />
                                </div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kyukpa</span>
                            </div>
                            <p className="text-3xl font-black text-gray-900">{kyukpaPlayers}</p>
                            <p className="text-xs text-gray-500 mt-2 font-medium">
                                {kyukpaCategories} {kyukpaCategories === 1 ? 'category' : 'categories'} · Breaking
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* ─── Tournament Details ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Event Details</p>
                    <div className="space-y-4">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</p>
                            <p className="text-sm font-bold text-gray-900 mt-0.5">{new Date(tournament.startDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Venue</p>
                            <p className="text-sm font-bold text-gray-900 mt-0.5">{tournament.venue || 'TBA'}</p>
                        </div>
                        {tournament.registrationStart && (
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Registration Window</p>
                                <p className="text-sm font-bold text-gray-900 mt-0.5">
                                    {new Date(tournament.registrationStart).toLocaleDateString()} — {tournament.registrationEnd ? new Date(tournament.registrationEnd).toLocaleDateString() : 'Open'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Approval Rate */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Registration Breakdown</p>
                            <h3 className="text-2xl font-black text-gray-900">
                                {totalPlayersCount > 0 ? Math.round((approvedCount / totalPlayersCount) * 100) : 0}% Approved
                            </h3>
                        </div>
                    </div>
                    <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex mb-4">
                        {totalPlayersCount > 0 && (
                            <>
                                <div
                                    className="h-full bg-green-500 transition-all duration-700"
                                    style={{ width: `${(approvedCount / totalPlayersCount) * 100}%` }}
                                />
                                <div
                                    className="h-full bg-amber-400 transition-all duration-700"
                                    style={{ width: `${(pendingCount / totalPlayersCount) * 100}%` }}
                                />
                            </>
                        )}
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Approved</p>
                            <p className="text-lg font-bold text-green-600">{approvedCount}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Pending</p>
                            <p className="text-lg font-bold text-amber-600">{pendingCount}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Rejected</p>
                            <p className="text-lg font-bold text-red-600">{rejectedCount}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Participating Clubs Table ─── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-gray-900">Participating Clubs</h3>
                        <p className="text-xs text-gray-400 mt-0.5">{clubStats.length} clubs · {totalPlayersCount} total athletes</p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[500px]">
                        <thead>
                            <tr className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                <th className="px-6 py-3">#</th>
                                <th className="px-6 py-3">Club / Team</th>
                                <th className="px-6 py-3 text-center">Registered</th>
                                <th className="px-6 py-3 text-center">Approved</th>
                                <th className="px-6 py-3 text-center">Pending</th>
                                <th className="px-6 py-3">Share</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {clubStats.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                                        No clubs have registered athletes yet.
                                    </td>
                                </tr>
                            ) : (
                                clubStats.map((club, i) => {
                                    const sharePercent = totalPlayersCount > 0 ? (club.count / totalPlayersCount) * 100 : 0
                                    return (
                                        <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-3.5 text-xs font-medium text-gray-400">{i + 1}</td>
                                            <td className="px-6 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    {club.logoUrl ? (
                                                        <img src={club.logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover border border-gray-200" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                                                            {club.name.charAt(0)}
                                                        </div>
                                                    )}
                                                    <span className="font-semibold text-gray-900 text-sm">{club.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5 text-center">
                                                <span className="text-sm font-bold text-gray-900">{club.count}</span>
                                            </td>
                                            <td className="px-6 py-3.5 text-center">
                                                <span className="text-sm font-semibold text-green-600">{club.approved}</span>
                                            </td>
                                            <td className="px-6 py-3.5 text-center">
                                                <span className="text-sm font-semibold text-amber-600">{club.pending}</span>
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-[80px]">
                                                        <div className="h-full bg-red-500 rounded-full transition-all duration-500" style={{ width: `${sharePercent}%` }} />
                                                    </div>
                                                    <span className="text-xs font-medium text-gray-500 w-10 text-right">{Math.round(sharePercent)}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
