'use client'

import React, { useMemo, useState } from 'react'
import { Category, Match, Player, Tournament } from '@prisma/client'
import { Users, Trophy, ClipboardList, Calendar, TrendingUp, CheckCircle2, Clock, XCircle, FileDown, Loader2, Eye, EyeOff, ChevronDown, ShieldAlert, ArrowLeftRight, X, Check, Trash2 } from 'lucide-react'
import { getClubRosterForTournament, ClubRosterPlayer, getTournamentAlerts, movePlayerToCategory, removePlayerFromTournament } from '@/app/actions'
import { downloadClubRosterPdf } from '@/lib/club-roster-pdf'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

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
    clubs: { id?: string | null; name: string; logoUrl: string | null; count: number; approved: number; pending: number }[]
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
    const [downloadingClub, setDownloadingClub] = useState<string | null>(null)
    const [viewingClub,    setViewingClub]    = useState<string | null>(null)
    const [loadingView,    setLoadingView]    = useState<string | null>(null)
    const [rosterCache,    setRosterCache]    = useState<Record<string, ClubRosterPlayer[]>>({})
    const [movingPlayer,   setMovingPlayer]   = useState<string | null>(null)  // playerId being moved
    const [moveSearch,     setMoveSearch]     = useState('')
    const [movingLoading,  setMovingLoading]  = useState(false)
    const [deletingPlayer, setDeletingPlayer] = useState<string | null>(null)  // playerId confirm-delete
    const [deleteLoading,  setDeleteLoading]  = useState(false)

    const tournamentId = tournament.id

    // Fetch smart alerts — same source as the Brackets tab
    const { data: alertData } = useQuery({
        queryKey: ['tournament-smart-alerts', tournamentId],
        queryFn:  () => getTournamentAlerts(tournamentId),
        staleTime: 1000 * 30,
    })

    async function handleViewRoster(clubId: string) {
        if (viewingClub === clubId) { setViewingClub(null); return }
        setViewingClub(clubId)
        if (rosterCache[clubId]) return
        setLoadingView(clubId)
        try {
            const data = await getClubRosterForTournament(tournament.id, clubId)
            setRosterCache(prev => ({ ...prev, [clubId]: data.players }))
        } finally {
            setLoadingView(null)
        }
    }

    async function handleDeletePlayer(p: ClubRosterPlayer, clubId: string) {
        setDeleteLoading(true)
        try {
            const result = await removePlayerFromTournament(p.id, tournament.id)
            if ('error' in result) {
                toast.error(result.error)
            } else {
                toast.success(
                    result.bracketsRegenerated
                        ? `${result.playerName} removed · ${result.disciplineRegenerated} brackets regenerated`
                        : `${result.playerName} removed`
                )
                setDeletingPlayer(null)
                // Refresh roster cache for this club
                const data = await getClubRosterForTournament(tournament.id, clubId)
                setRosterCache(prev => ({ ...prev, [clubId]: data.players }))
            }
        } finally {
            setDeleteLoading(false)
        }
    }
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

    // Compute uncontested per club from smart alerts (same source as Brackets tab).
    // Also tracks whether a proposal has already been sent for each player.
    const uncontestedByClub = useMemo(() => {
        const alerts    = alertData?.alerts    || []
        const proposals = alertData?.proposals || []

        // Build set of playerIds that already have a pending UNCONTESTED proposal
        const sentPlayerIds = new Set<string>()
        for (const p of proposals) {
            if (p.type !== 'UNCONTESTED' && p.type !== 'CROSS_DIVISION') continue
            try {
                const d = JSON.parse(p.data)
                if (d.playerId) sentPlayerIds.add(d.playerId)
            } catch { /* ignore */ }
        }

        const map = new Map<string, { total: number; sent: number }>()
        for (const a of alerts) {
            if (a.type !== 'UNCONTESTED' && a.type !== 'CROSS_DIVISION') continue
            const clubKey = a.details?.clubId || 'Unaffiliated'
            const cur     = map.get(clubKey) || { total: 0, sent: 0 }
            cur.total++
            if (sentPlayerIds.has(a.details?.playerId)) cur.sent++
            map.set(clubKey, cur)
        }
        return map
    }, [alertData])

    const clubStats = useMemo(() => {
        if (stats?.clubs) return stats.clubs
        const map = new Map<string, { id: string | null; name: string; logoUrl: string | null; count: number; approved: number; pending: number }>()
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
                    id: player.club?.id || null,
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
                    <table className="w-full text-left min-w-[580px]">
                        <thead>
                            <tr className="bg-gray-50/80">
                                {['#', 'Club / Team', 'Registered', 'Approved', 'Pending', 'Uncontested', 'Share', ''].map(h => (
                                    <th
                                        key={h}
                                        className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest ${
                                            h === 'Uncontested' ? 'text-center text-amber-500'
                                            : h !== '#' && h !== 'Club / Team' && h !== '' ? 'text-center text-gray-400'
                                            : 'text-gray-400'
                                        }`}
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {clubStats.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-400">
                                        No clubs have registered athletes yet.
                                    </td>
                                </tr>
                            ) : (
                                clubStats.map((club, i) => {
                                    const sharePercent     = totalPlayersCount > 0 ? (club.count / totalPlayersCount) * 100 : 0
                                    const isExpanded       = viewingClub === club.id
                                    const isLoadingThis    = loadingView === club.id
                                    const rosterPlayers    = club.id ? (rosterCache[club.id] ?? null) : null
                                    const clubKey          = club.id || club.name
                                    const uncontestedData  = uncontestedByClub.get(clubKey)
                                    const uncontestedCount = uncontestedData?.total || 0
                                    const sentCount        = uncontestedData?.sent  || 0

                                    // Group by category for the inline view
                                    const groupedRoster = rosterPlayers
                                        ? rosterPlayers.reduce((acc, p) => {
                                            if (!acc[p.categoryName]) acc[p.categoryName] = { type: p.categoryType, players: [] }
                                            acc[p.categoryName].players.push(p)
                                            return acc
                                          }, {} as Record<string, { type: string; players: ClubRosterPlayer[] }>)
                                        : null

                                    const TYPE_COLOR: Record<string, string> = {
                                        KYORUGI: 'bg-red-500',
                                        POOMSAE: 'bg-blue-500',
                                        KYUKPA:  'bg-purple-500',
                                    }
                                    const STATUS_STYLE: Record<string, string> = {
                                        APPROVED: 'text-emerald-600 font-bold',
                                        PENDING:  'text-amber-600 font-bold',
                                        REJECTED: 'text-red-500 font-bold',
                                    }

                                    return (
                                        <>
                                            <tr
                                                key={`row-${i}`}
                                                className={`border-t border-gray-50 transition-colors ${
                                                    isExpanded ? 'bg-indigo-50/60' : 'hover:bg-gray-50/60'
                                                }`}
                                            >
                                                <td className="px-6 py-3.5 text-xs font-bold text-gray-300">{i + 1}</td>
                                                <td className="px-6 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        {club.logoUrl ? (
                                                            <img src={club.logoUrl} alt="" className="w-8 h-8 rounded-xl object-cover border border-gray-100 shadow-sm" />
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
                                                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">{club.approved}</span>
                                                </td>
                                                <td className="px-6 py-3.5 text-center">
                                                    <span className={`text-sm font-semibold ${club.pending > 0 ? 'text-amber-600' : 'text-gray-300'}`}>
                                                        {club.pending}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3.5 text-center">
                                                    {uncontestedCount > 0 ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-700 border border-amber-200">
                                                            <ShieldAlert size={9} />
                                                            {uncontestedCount}
                                                            {sentCount > 0 && (
                                                                <span className="ml-1 text-[9px] font-bold text-amber-500">
                                                                    ({sentCount} sent)
                                                                </span>
                                                            )}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-200 text-sm font-bold">—</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-red-500 rounded-full transition-all duration-500" style={{ width: `${sharePercent}%` }} />
                                                        </div>
                                                        <span className="text-xs font-bold text-gray-400 w-8 text-right">{Math.round(sharePercent)}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <div className="flex items-center gap-1.5">
                                                        {/* View athletes */}
                                                        <button
                                                            type="button"
                                                            disabled={!club.id}
                                                            onClick={() => club.id && handleViewRoster(club.id)}
                                                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-colors ${
                                                                isExpanded
                                                                    ? 'bg-indigo-600 text-white'
                                                                    : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                                                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                                                        >
                                                            {isLoadingThis
                                                                ? <Loader2 size={11} className="animate-spin" />
                                                                : isExpanded
                                                                ? <EyeOff size={11} />
                                                                : <Eye size={11} />}
                                                            View
                                                        </button>
                                                        {/* PDF */}
                                                        <button
                                                            type="button"
                                                            title={`Download ${club.name} roster PDF`}
                                                            disabled={!club.id || downloadingClub === club.id}
                                                            onClick={async () => {
                                                                if (!club.id) return
                                                                setDownloadingClub(club.id)
                                                                try {
                                                                    const data = await getClubRosterForTournament(tournament.id, club.id)
                                                                    downloadClubRosterPdf(data)
                                                                } finally {
                                                                    setDownloadingClub(null)
                                                                }
                                                            }}
                                                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black text-gray-500 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                        >
                                                            {downloadingClub === club.id ? <Loader2 size={11} className="animate-spin" /> : <FileDown size={11} />}
                                                            PDF
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* ── Inline roster panel ── */}
                                            {isExpanded && (
                                                <tr key={`roster-${i}`}>
                                                    <td colSpan={8} className="px-0 py-0 bg-gray-50/80 border-t border-indigo-100">
                                                        <div className="px-6 py-5">
                                                            {isLoadingThis || !groupedRoster ? (
                                                                <div className="flex items-center justify-center py-8 gap-2 text-sm text-gray-400">
                                                                    <Loader2 size={14} className="animate-spin" />
                                                                    Loading roster…
                                                                </div>
                                                            ) : Object.keys(groupedRoster).length === 0 ? (
                                                                <p className="text-sm text-gray-400 text-center py-6">No athletes found for this club.</p>
                                                            ) : (
                                                                <div className="space-y-4">
                                                                    {Object.entries(groupedRoster).map(([catName, { type, players: catPlayers }]) => {
                                                                        // Determine which measurement this category uses
                                                                        const catLower = catName.toLowerCase()
                                                                        const isHeightBased = /supertoddler|super.?toddler|toddler|grade.?school|gradeschool/.test(catLower)
                                                                        const measureLabel = isHeightBased ? 'Height' : 'Weight'

                                                                        return (
                                                                        <div key={catName}>
                                                                            {/* Category header */}
                                                                            <div className={`flex items-center justify-between px-3 py-1.5 rounded-lg mb-1.5 ${
                                                                                type === 'KYORUGI' ? 'bg-red-500' :
                                                                                type === 'POOMSAE' ? 'bg-blue-500' : 'bg-purple-500'
                                                                            }`}>
                                                                                <span className="text-[11px] font-black text-white uppercase tracking-wide">{catName}</span>
                                                                                <span className="text-[10px] text-white/70 font-semibold">
                                                                                    {catPlayers.length} athlete{catPlayers.length !== 1 ? 's' : ''}
                                                                                </span>
                                                                            </div>
                                                                            {/* Athletes table */}
                                                                            <div className="overflow-x-auto rounded-xl border border-gray-100">
                                                                                <table className="w-full text-left min-w-[560px]">
                                                                                    <thead>
                                                                                        <tr className="bg-white border-b border-gray-100">
                                                                                            {['#','Name','Birthday','Age','Gender', measureLabel,'Belt','Status',''].map(h => (
                                                                                                <th key={h} className="px-3 py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                                                                                            ))}
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody>
                                                                                        {catPlayers.map((p, pi) => (
                                                                                            <React.Fragment key={pi}>
                                                                                            <tr className={`border-t border-gray-50 ${pi % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}`}>
                                                                                                <td className="px-3 py-2 text-[10px] text-gray-300 font-bold">{pi + 1}</td>
                                                                                                <td className="px-3 py-2 text-xs font-bold text-gray-900">{p.name}</td>
                                                                                                <td className="px-3 py-2 text-[11px] text-gray-500">
                                                                                                    {p.birthDate ? p.birthDate.split('-').slice(1).reverse().join('/') + '/' + p.birthDate.split('-')[0] : '—'}
                                                                                                </td>
                                                                                                <td className="px-3 py-2 text-[11px] text-gray-600">{p.age ?? '—'}</td>
                                                                                                <td className="px-3 py-2 text-[11px] text-gray-600">{p.gender ?? '—'}</td>
                                                                                                <td className="px-3 py-2 text-[11px] text-gray-600">
                                                                                                    {isHeightBased
                                                                                                        ? (p.height ? `${p.height}cm` : '—')
                                                                                                        : (p.weight ? `${p.weight}kg` : '—')
                                                                                                    }
                                                                                                </td>
                                                                                                <td className="px-3 py-2 text-[11px] text-gray-600">{p.belt ?? '—'}</td>
                                                                                                <td className="px-3 py-2">
                                                                                                    <span className={`text-[10px] ${
                                                                                                        p.registrationStatus === 'APPROVED' ? 'text-emerald-600 font-bold' :
                                                                                                        p.registrationStatus === 'PENDING'  ? 'text-amber-600 font-bold' :
                                                                                                        'text-red-500 font-bold'
                                                                                                    }`}>
                                                                                                        {p.registrationStatus.charAt(0) + p.registrationStatus.slice(1).toLowerCase()}
                                                                                                    </span>
                                                                                                </td>
                                                                                                <td className="px-3 py-2">
                                                                                                    <div className="flex items-center gap-1">
                                                                                                        <button
                                                                                                            onClick={() => {
                                                                                                                setMovingPlayer(movingPlayer === p.id ? null : p.id)
                                                                                                                setDeletingPlayer(null)
                                                                                                                setMoveSearch('')
                                                                                                            }}
                                                                                                            title="Change division"
                                                                                                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black transition-colors ${
                                                                                                                movingPlayer === p.id
                                                                                                                    ? 'bg-indigo-600 text-white'
                                                                                                                    : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                                                                                                            }`}
                                                                                                        >
                                                                                                            <ArrowLeftRight size={9} />
                                                                                                            Move
                                                                                                        </button>
                                                                                                        <button
                                                                                                            onClick={() => {
                                                                                                                setDeletingPlayer(deletingPlayer === p.id ? null : p.id)
                                                                                                                setMovingPlayer(null)
                                                                                                            }}
                                                                                                            title="Remove athlete"
                                                                                                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black transition-colors ${
                                                                                                                deletingPlayer === p.id
                                                                                                                    ? 'bg-red-600 text-white'
                                                                                                                    : 'bg-red-50 text-red-500 hover:bg-red-100'
                                                                                                            }`}
                                                                                                        >
                                                                                                            <Trash2 size={9} />
                                                                                                            Remove
                                                                                                        </button>
                                                                                                    </div>
                                                                                                </td>
                                                                                            </tr>
                                                                                            {/* Inline move picker */}
                                                                                            {movingPlayer === p.id && (() => {
                                                                                                const availableCats = tournament.categories
                                                                                                    .filter(c => (c as any).type === type && c.id !== p.categoryId)
                                                                                                    .filter(c => c.name.toLowerCase().includes(moveSearch.toLowerCase()))
                                                                                                    .sort((a, b) => a.name.localeCompare(b.name))
                                                                                                return (
                                                                                                    <tr className="border-t border-indigo-100 bg-indigo-50/40">
                                                                                                        <td colSpan={10} className="px-4 py-3">
                                                                                                            <div className="flex items-center gap-2 mb-2">
                                                                                                                <ArrowLeftRight size={11} className="text-indigo-500 flex-shrink-0" />
                                                                                                                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wide">Move {p.name} to:</span>
                                                                                                                <button onClick={() => setMovingPlayer(null)} className="ml-auto text-gray-400 hover:text-gray-600"><X size={12} /></button>
                                                                                                            </div>
                                                                                                            <input
                                                                                                                type="text"
                                                                                                                placeholder="Search category…"
                                                                                                                value={moveSearch}
                                                                                                                onChange={e => setMoveSearch(e.target.value)}
                                                                                                                className="w-full mb-2 px-3 py-1.5 text-xs border border-indigo-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                                                                                                autoFocus
                                                                                                            />
                                                                                                            <div className="max-h-48 overflow-y-auto space-y-0.5 rounded-lg border border-indigo-100 bg-white">
                                                                                                                {availableCats.length === 0 ? (
                                                                                                                    <p className="text-xs text-gray-400 text-center py-4">No categories found.</p>
                                                                                                                ) : availableCats.map(cat => (
                                                                                                                    <button
                                                                                                                        key={cat.id}
                                                                                                                        disabled={movingLoading}
                                                                                                                        onClick={async () => {
                                                                                                                            setMovingLoading(true)
                                                                                                                            try {
                                                                                                                                const result = await movePlayerToCategory(p.id, cat.id, tournament.id)
                                                                                                                                if ('error' in result) {
                                                                                                                                    toast.error(result.error)
                                                                                                                                } else {
                                                                                                                                    toast.success(
                                                                                                                                        result.bracketsRegenerated
                                                                                                                                            ? `${p.name} moved to ${cat.name} · All ${result.disciplineRegenerated} brackets regenerated`
                                                                                                                                            : `${p.name} moved to ${cat.name}`
                                                                                                                                    )
                                                                                                                                    setMovingPlayer(null)
                                                                                                                                    // Refresh roster cache for this club
                                                                                                                                    if (club.id) {
                                                                                                                                        setLoadingView(club.id)
                                                                                                                                        const data = await getClubRosterForTournament(tournament.id, club.id)
                                                                                                                                        setRosterCache(prev => ({ ...prev, [club.id!]: data.players }))
                                                                                                                                        setLoadingView(null)
                                                                                                                                    }
                                                                                                                                }
                                                                                                                            } finally {
                                                                                                                                setMovingLoading(false)
                                                                                                                            }
                                                                                                                        }}
                                                                                                                        className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-indigo-50 flex items-center justify-between group disabled:opacity-50"
                                                                                                                    >
                                                                                                                        <span>{cat.name}</span>
                                                                                                                        <Check size={11} className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                                                                    </button>
                                                                                                                ))}
                                                                                                            </div>
                                                                                                        </td>
                                                                                                    </tr>
                                                                                                )
                                                                                            })()}
                                                                                            {/* Inline delete confirmation */}
                                                                                            {deletingPlayer === p.id && (
                                                                                                <tr className="border-t border-red-100 bg-red-50/40">
                                                                                                    <td colSpan={10} className="px-4 py-3">
                                                                                                        <div className="flex items-center gap-3">
                                                                                                            <Trash2 size={12} className="text-red-500 flex-shrink-0" />
                                                                                                            <span className="text-[11px] font-black text-red-700">
                                                                                                                Remove <span className="underline">{p.name}</span> from this tournament?
                                                                                                            </span>
                                                                                                            <div className="ml-auto flex items-center gap-1.5">
                                                                                                                <button
                                                                                                                    onClick={() => setDeletingPlayer(null)}
                                                                                                                    disabled={deleteLoading}
                                                                                                                    className="px-3 py-1 text-[10px] font-black rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                                                                                                >
                                                                                                                    Cancel
                                                                                                                </button>
                                                                                                                <button
                                                                                                                    onClick={() => club.id && handleDeletePlayer(p, club.id)}
                                                                                                                    disabled={deleteLoading}
                                                                                                                    className="flex items-center gap-1 px-3 py-1 text-[10px] font-black rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                                                                                                                >
                                                                                                                    {deleteLoading
                                                                                                                        ? <Loader2 size={9} className="animate-spin" />
                                                                                                                        : <Trash2 size={9} />}
                                                                                                                    Confirm Remove
                                                                                                                </button>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </td>
                                                                                                </tr>
                                                                                            )}
                                                                                            </React.Fragment>
                                                                                        ))}
                                                                                    </tbody>
                                                                                </table>
                                                                            </div>
                                                                        </div>
                                                                        )
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
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
