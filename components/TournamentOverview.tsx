'use client'

import { useMemo } from 'react'
import { Category, Match, Player, Tournament } from '@prisma/client'
import { Users, Trophy, ClipboardList, Calendar, TrendingUp, CheckCircle2, Clock, XCircle } from 'lucide-react'

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
    players: PlayerWithClub[]
    totalPlayersCount: number
    stats?: TournamentStats
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; gradient: string; text: string }> = {
    UPCOMING:    { label: 'Upcoming',    dot: 'bg-blue-400',    gradient: 'from-blue-600 to-blue-500',    text: 'text-blue-100'    },
    ONGOING:     { label: 'Ongoing',     dot: 'bg-emerald-400', gradient: 'from-emerald-600 to-green-500', text: 'text-emerald-100' },
    COMPLETED:   { label: 'Completed',   dot: 'bg-slate-400',   gradient: 'from-slate-700 to-slate-500',  text: 'text-slate-200'   },
    CANCELLED:   { label: 'Cancelled',   dot: 'bg-red-400',     gradient: 'from-red-700 to-red-500',      text: 'text-red-100'     },
    RESCHEDULED: { label: 'Rescheduled', dot: 'bg-amber-400',   gradient: 'from-amber-600 to-yellow-500', text: 'text-amber-100'   },
}

export default function TournamentOverview({
    tournament, players, totalPlayersCount, stats
}: TournamentOverviewProps) {
    const approvedCount  = stats?.approved ?? players.filter(p => p.registrationStatus === 'APPROVED').length
    const pendingCount   = stats?.pending  ?? players.filter(p => p.registrationStatus === 'PENDING').length
    const rejectedCount  = stats?.rejected ?? players.filter(p => p.registrationStatus === 'REJECTED').length
    const kyorugiPlayers = stats?.kyorugi  ?? players.filter(p => (p.category as any)?.type === 'KYORUGI').length
    const poomsaePlayers = stats?.poomsae  ?? players.filter(p => (p.category as any)?.type === 'POOMSAE').length
    const kyukpaPlayers  = stats?.kyukpa   ?? players.filter(p => (p.category as any)?.type === 'KYUKPA').length

    const totalCategories    = tournament.categories.length
    const kyorugiCategories  = tournament.categories.filter(c => (c as any).type === 'KYORUGI').length
    const poomsaeCategories  = tournament.categories.filter(c => (c as any).type === 'POOMSAE').length
    const kyukpaCategories   = tournament.categories.filter(c => (c as any).type === 'KYUKPA').length

    const daysUntil = Math.max(0, Math.ceil(
        (new Date(tournament.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    ))
    const isPast = new Date(tournament.startDate) < new Date()

    const approvalPct = totalPlayersCount > 0 ? Math.round((approvedCount / totalPlayersCount) * 100) : 0
    const pendingPct  = totalPlayersCount > 0 ? Math.round((pendingCount / totalPlayersCount) * 100) : 0

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

    const statusCfg = STATUS_CONFIG[tournament.status] || STATUS_CONFIG.UPCOMING

    const disciplineRows = [
        {
            label: 'Kyorugi',
            sub: 'Sparring',
            players: kyorugiPlayers,
            categories: kyorugiCategories,
            color: 'text-red-600',
            barColor: 'bg-red-500',
            bg: 'bg-red-50',
            border: 'border-red-100',
        },
        {
            label: 'Poomsae',
            sub: 'Forms',
            players: poomsaePlayers,
            categories: poomsaeCategories,
            color: 'text-blue-600',
            barColor: 'bg-blue-500',
            bg: 'bg-blue-50',
            border: 'border-blue-100',
        },
        {
            label: 'Kyukpa',
            sub: 'Breaking',
            players: kyukpaPlayers,
            categories: kyukpaCategories,
            color: 'text-purple-600',
            barColor: 'bg-purple-500',
            bg: 'bg-purple-50',
            border: 'border-purple-100',
        },
    ].filter(d => d.players > 0)

    return (
        <div className="space-y-6 animate-in fade-in duration-300">

            {/* ── Header ─────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Overview</h1>
                    <p className="text-sm text-gray-500 mt-1">At-a-glance participation and performance.</p>
                </div>
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r ${statusCfg.gradient} shadow-md`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot} ${tournament.status === 'ONGOING' ? 'animate-pulse' : ''}`} />
                    <span className={`text-xs font-black uppercase tracking-widest ${statusCfg.text}`}>
                        {statusCfg.label}
                    </span>
                </div>
            </div>

            {/* ── Top stat cards ──────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={Users}
                    iconBg="bg-red-50"
                    iconColor="text-red-600"
                    label="Total Athletes"
                    value={totalPlayersCount}
                    sub={`${approvedCount} approved · ${pendingCount} pending`}
                />
                <StatCard
                    icon={ClipboardList}
                    iconBg="bg-indigo-50"
                    iconColor="text-indigo-600"
                    label="Categories"
                    value={totalCategories}
                    sub={[
                        kyorugiCategories > 0 && `${kyorugiCategories} Kyorugi`,
                        poomsaeCategories > 0 && `${poomsaeCategories} Poomsae`,
                        kyukpaCategories  > 0 && `${kyukpaCategories} Kyukpa`,
                    ].filter(Boolean).join(' · ') || 'None yet'}
                />
                <StatCard
                    icon={TrendingUp}
                    iconBg="bg-emerald-50"
                    iconColor="text-emerald-600"
                    label="Clubs"
                    value={clubStats.length}
                    sub="Participating clubs"
                />

                {/* Countdown card — dark */}
                <div className="relative bg-gray-900 rounded-2xl p-5 overflow-hidden shadow-md">
                    <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/5 blur-2xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-red-600/10 blur-2xl pointer-events-none" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
                                <Calendar size={16} className="text-white/80" />
                            </div>
                            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">
                                {isPast ? 'Event Date' : 'Countdown'}
                            </span>
                        </div>
                        {isPast ? (
                            <>
                                <p className="text-base font-black text-white leading-tight">
                                    {new Date(tournament.startDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                                </p>
                                <p className="text-xs text-white/30 mt-1.5 font-medium">
                                    {(tournament as any).venue || 'No venue set'}
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="text-4xl font-black text-white">{daysUntil}</p>
                                <p className="text-xs text-white/40 mt-1 font-medium">Days until event</p>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Registration breakdown ──────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Registration</p>
                        <h3 className="text-3xl font-black text-gray-900">
                            {approvalPct}%
                            <span className="text-base font-semibold text-gray-400 ml-2">approved</span>
                        </h3>
                    </div>
                    <div className="flex items-center gap-5">
                        <LegendDot color="bg-emerald-500" label={`${approvedCount} Approved`} />
                        <LegendDot color="bg-amber-400"   label={`${pendingCount} Pending`} />
                        <LegendDot color="bg-red-200"     label={`${rejectedCount} Rejected`} />
                    </div>
                </div>

                {/* Stacked progress bar */}
                <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden flex gap-px">
                    {totalPlayersCount > 0 ? (
                        <>
                            <div
                                className="h-full bg-emerald-500 rounded-l-full transition-all duration-700"
                                style={{ width: `${approvalPct}%` }}
                            />
                            <div
                                className="h-full bg-amber-400 transition-all duration-700"
                                style={{ width: `${pendingPct}%` }}
                            />
                            <div className="h-full flex-1 rounded-r-full bg-red-100" />
                        </>
                    ) : (
                        <div className="h-full w-full rounded-full bg-gray-100" />
                    )}
                </div>

                {/* Stat trinkets */}
                <div className="grid grid-cols-3 divide-x divide-gray-100 mt-5">
                    <BreakdownStat icon={CheckCircle2} color="text-emerald-600" label="Approved" value={approvedCount} />
                    <BreakdownStat icon={Clock}        color="text-amber-600"   label="Pending"  value={pendingCount}  />
                    <BreakdownStat icon={XCircle}      color="text-red-400"     label="Rejected" value={rejectedCount} />
                </div>
            </div>

            {/* ── Discipline breakdown ────────────────────────────── */}
            {disciplineRows.length > 0 && (
                <div className={`grid gap-4 grid-cols-1 ${disciplineRows.length === 3 ? 'md:grid-cols-3' : disciplineRows.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-1 max-w-sm'}`}>
                    {disciplineRows.map(d => {
                        const pct = totalPlayersCount > 0 ? Math.round((d.players / totalPlayersCount) * 100) : 0
                        return (
                            <div key={d.label} className={`bg-white rounded-2xl border ${d.border} shadow-sm p-5 hover:shadow-md transition-shadow`}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`w-9 h-9 ${d.bg} rounded-xl flex items-center justify-center`}>
                                        <Trophy size={15} className={d.color} />
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${d.color}`}>{d.label}</span>
                                </div>
                                <p className="text-3xl font-black text-gray-900">{d.players}</p>
                                <p className="text-xs text-gray-400 font-medium mt-1">
                                    {d.categories} {d.categories === 1 ? 'category' : 'categories'} · {d.sub}
                                </p>
                                <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${d.barColor} rounded-full transition-all duration-700`}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                                <p className="text-[10px] text-gray-400 font-medium mt-1.5">{pct}% of total athletes</p>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* ── Clubs table ─────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-gray-900">Participating Clubs</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {clubStats.length} {clubStats.length === 1 ? 'club' : 'clubs'} · {totalPlayersCount} athletes
                        </p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[540px]">
                        <thead>
                            <tr className="bg-gray-50/80">
                                {['#', 'Club / Team', 'Registered', 'Approved', 'Pending', 'Share'].map(h => (
                                    <th
                                        key={h}
                                        className={`px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest ${h !== '#' && h !== 'Club / Team' && h !== 'Share' ? 'text-center' : ''}`}
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {clubStats.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">
                                        No clubs have registered athletes yet.
                                    </td>
                                </tr>
                            ) : (
                                clubStats.map((club, i) => {
                                    const sharePercent = totalPlayersCount > 0 ? (club.count / totalPlayersCount) * 100 : 0
                                    return (
                                        <tr key={i} className="border-t border-gray-50 hover:bg-gray-50/60 transition-colors">
                                            <td className="px-6 py-3.5 text-xs font-bold text-gray-300">{i + 1}</td>
                                            <td className="px-6 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    {club.logoUrl ? (
                                                        <img
                                                            src={club.logoUrl}
                                                            alt=""
                                                            className="w-8 h-8 rounded-xl object-cover border border-gray-100 shadow-sm"
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-xs font-black text-gray-500">
                                                            {club.name.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <span className="text-sm font-semibold text-gray-900">{club.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5 text-center">
                                                <span className="text-sm font-bold text-gray-900">{club.count}</span>
                                            </td>
                                            <td className="px-6 py-3.5 text-center">
                                                <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
                                                    {club.approved}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3.5 text-center">
                                                <span className={`text-sm font-semibold ${club.pending > 0 ? 'text-amber-600' : 'text-gray-300'}`}>
                                                    {club.pending}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-red-500 rounded-full transition-all duration-500"
                                                            style={{ width: `${sharePercent}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-bold text-gray-400 w-8 text-right">
                                                        {Math.round(sharePercent)}%
                                                    </span>
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

// ─── Sub-components ──────────────────────────────────────────

function StatCard({
    icon: Icon, iconBg, iconColor, label, value, sub
}: {
    icon: React.ElementType
    iconBg: string
    iconColor: string
    label: string
    value: number
    sub: string
}) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center`}>
                    <Icon size={16} className={iconColor} />
                </div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-right max-w-[80px] leading-tight">
                    {label}
                </span>
            </div>
            <p className="text-3xl font-black text-gray-900">{value}</p>
            <p className="text-xs text-gray-400 font-medium mt-1.5 leading-snug">{sub}</p>
        </div>
    )
}

function LegendDot({ color, label }: { color: string; label: string }) {
    return (
        <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${color} flex-shrink-0`} />
            <span className="text-xs text-gray-500 font-medium">{label}</span>
        </div>
    )
}

function BreakdownStat({
    icon: Icon, color, label, value
}: {
    icon: React.ElementType
    color: string
    label: string
    value: number
}) {
    return (
        <div className="px-4 first:pl-0 last:pr-0 flex items-center gap-3">
            <Icon size={16} className={`${color} flex-shrink-0`} />
            <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{label}</p>
                <p className={`text-lg font-black ${color}`}>{value}</p>
            </div>
        </div>
    )
}
