'use client'

import { useState, useTransition } from 'react'
import { Category, Match, PoomsaeMatch } from '@prisma/client'
import BracketView from './BracketView'
import PoomsaeBracketView from './PoomsaeBracketView'
import { generateAllBrackets, getTournamentAlerts, initiateSmartProposal, forceExecuteSmartAction, bulkSendUncontestedProposals } from '@/app/actions'
import {
    Trophy, Medal, Wand2, Loader2, AlertCircle, Search,
    ShieldAlert, Split, Merge, Users, X, ChevronDown, Zap, ArrowRight, Clock, Send, ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useQueryClient } from '@tanstack/react-query'

interface BracketListProps {
    categories: (Category & { matches: Match[], poomsaeMatches?: (PoomsaeMatch & { player: { name: string; club?: { name: string } | null } })[] })[]
    tournamentName?: string
    publicView?: boolean
}

export default function BracketList({ categories, tournamentName, publicView = false }: BracketListProps) {
    const [activeTab, setActiveTab] = useState<'kyorugi' | 'poomsae' | 'kyukpa'>('kyorugi')
    const [isPending, startTransition] = useTransition()
    const [searchQuery, setSearchQuery] = useState('')
    const [alertFilter, setAlertFilter] = useState<'all' | 'uncontested' | 'merge' | 'split' | 'cross_division'>('all')
    const [sendingAll, setSendingAll] = useState(false)
    const [sendingClub, setSendingClub] = useState<string | null>(null)
    const [clubDropdownOpen, setClubDropdownOpen] = useState(false)

    const tournamentId = categories[0]?.tournamentId

    const queryClient = useQueryClient()
    const { data: alertData } = useQuery({
        queryKey: ['tournament-smart-alerts', tournamentId],
        queryFn: () => getTournamentAlerts(tournamentId),
        enabled: !!tournamentId && !publicView,
        staleTime: 1000 * 30
    })

    const alerts = alertData?.alerts || []
    const proposals = alertData?.proposals || []

    const alertsByCategory = new Map<string, any[]>()
    for (const alert of alerts) {
        const existing = alertsByCategory.get(alert.categoryId) || []
        existing.push(alert)
        alertsByCategory.set(alert.categoryId, existing)
    }

    if (categories.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                    <Trophy size={24} className="text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-500">No categories yet</p>
                <p className="text-xs text-gray-400 mt-1">Add categories to generate matches.</p>
            </div>
        )
    }

    const kyorugiCategories = categories.filter(c => c.type === 'KYORUGI' || !c.type)
    const poomsaeCategories = categories.filter(c => c.type === 'POOMSAE')
    const kyukpaCategories  = categories.filter(c => c.type === 'KYUKPA')

    const displayedCategories = activeTab === 'kyorugi' ? kyorugiCategories
        : activeTab === 'poomsae' ? poomsaeCategories : kyukpaCategories

    const q = searchQuery.toLowerCase().trim()
    let filteredCategories = q
        ? displayedCategories.filter(c => c.name.toLowerCase().includes(q))
        : displayedCategories

    if (alertFilter !== 'all') {
        const targetType = alertFilter === 'uncontested' ? 'UNCONTESTED'
            : alertFilter === 'merge'          ? 'MERGE_SUGGESTION'
            : alertFilter === 'split'          ? 'SPLIT_SUGGESTION'
            : 'CROSS_DIVISION'
        filteredCategories = filteredCategories.filter(c => {
            const catAlerts = alertsByCategory.get(c.id)
            return catAlerts?.some(a => a.type === targetType)
        })
    }

    const handleGenerateAll = () => {
        if (!confirm(`Regenerate ALL ${activeTab} matches? This will overwrite existing brackets.`)) return
        startTransition(async () => {
            try {
                const targetType = activeTab === 'kyorugi' ? 'KYORUGI' : activeTab === 'poomsae' ? 'POOMSAE' : 'KYUKPA'
                const result = await generateAllBrackets(tournamentId, targetType)
                if (result?.success) toast.success(`Generated matches for ${result.count} categories!`)
                else toast.error(result?.message || 'Failed to generate matches.')
            } catch {
                toast.error('An error occurred while generating matches.')
            }
        })
    }

    const uncontestedCount  = alerts.filter(a => a.type === 'UNCONTESTED').length
    const mergeCount         = alerts.filter(a => a.type === 'MERGE_SUGGESTION').length
    const splitCount         = alerts.filter(a => a.type === 'SPLIT_SUGGESTION').length
    const crossDivCount      = alerts.filter(a => a.type === 'CROSS_DIVISION').length
    const totalAlerts        = uncontestedCount + mergeCount + splitCount + crossDivCount


    // Discipline tab config
    const discTabs = [
        { id: 'kyorugi', label: 'Kyorugi', icon: Trophy, count: kyorugiCategories.length },
        { id: 'poomsae', label: 'Poomsae', icon: Medal,  count: poomsaeCategories.length },
        { id: 'kyukpa',  label: 'Kyukpa',  icon: Wand2,  count: kyukpaCategories.length  },
    ]

    return (
        <div className="space-y-5">

            {/* ── Alert Strip ─────────────────────────────────────── */}
            {totalAlerts > 0 && !publicView && (() => {
                // Build per-club map from uncontested alerts
                const clubsWithUncontested = new Map<string, { id: string; name: string; logoUrl: string | null; count: number }>()
                for (const a of alerts) {
                    if (a.type !== 'UNCONTESTED') continue
                    const cid  = a.details?.clubId  || 'unaffiliated'
                    const name = a.details?.clubName || 'Unaffiliated'
                    const logo = a.details?.clubLogoUrl || null
                    const cur  = clubsWithUncontested.get(cid)
                    if (cur) cur.count++
                    else clubsWithUncontested.set(cid, { id: cid, name, logoUrl: logo, count: 1 })
                }
                const clubList = Array.from(clubsWithUncontested.values()).sort((a, b) => a.name.localeCompare(b.name))

                const handleSendAll = async () => {
                    setSendingAll(true)
                    try {
                        const r = await bulkSendUncontestedProposals(tournamentId)
                        if (r.sent > 0) toast.success(`Sent ${r.sent} proposal${r.sent !== 1 ? 's' : ''} to clubs`)
                        else toast.info(r.alreadyPending > 0 ? 'All uncontested proposals already sent' : 'No uncontested alerts to send')
                        queryClient.invalidateQueries({ queryKey: ['tournament-smart-alerts', tournamentId] })
                    } catch { toast.error('Failed to send proposals') }
                    finally { setSendingAll(false) }
                }

                const handleSendClub = async (clubId: string, clubName: string) => {
                    setSendingClub(clubId)
                    setClubDropdownOpen(false)
                    try {
                        const r = await bulkSendUncontestedProposals(tournamentId, clubId)
                        if (r.sent > 0) toast.success(`Sent ${r.sent} proposal${r.sent !== 1 ? 's' : ''} to ${clubName}`)
                        else toast.info(`No new uncontested proposals for ${clubName}`)
                        queryClient.invalidateQueries({ queryKey: ['tournament-smart-alerts', tournamentId] })
                    } catch { toast.error('Failed to send proposals') }
                    finally { setSendingClub(null) }
                }

                return (
                    <div className="relative rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 px-5 py-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-amber-200/40 blur-2xl pointer-events-none" />

                        {/* Row 1: label + filter pills */}
                        <div className="flex items-center gap-4 flex-wrap relative">
                            <div className="flex items-center gap-2.5 flex-shrink-0">
                                <div className="p-2 bg-amber-100 rounded-xl">
                                    <AlertCircle size={16} className="text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-amber-900 uppercase tracking-wide">
                                        {totalAlerts} Alert{totalAlerts !== 1 ? 's' : ''} Pending
                                    </p>
                                    <p className="text-[10px] text-amber-600 font-medium">
                                        Resolve before generating brackets
                                    </p>
                                </div>
                            </div>

                            <div className="h-5 w-px bg-amber-200 hidden sm:block" />

                            <div className="flex items-center gap-2 flex-wrap">
                                {uncontestedCount > 0 && (
                                    <button
                                        onClick={() => setAlertFilter(alertFilter === 'uncontested' ? 'all' : 'uncontested')}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all border ${
                                            alertFilter === 'uncontested'
                                                ? 'bg-yellow-400 text-yellow-900 border-yellow-400 shadow-sm scale-105'
                                                : 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200'
                                        }`}
                                    >
                                        <ShieldAlert size={10} />
                                        {uncontestedCount} Uncontested
                                    </button>
                                )}
                                {mergeCount > 0 && (
                                    <button
                                        onClick={() => setAlertFilter(alertFilter === 'merge' ? 'all' : 'merge')}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all border ${
                                            alertFilter === 'merge'
                                                ? 'bg-purple-500 text-white border-purple-500 shadow-sm scale-105'
                                                : 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200'
                                        }`}
                                    >
                                        <Merge size={10} />
                                        {mergeCount} Merge
                                    </button>
                                )}
                                {splitCount > 0 && (
                                    <button
                                        onClick={() => setAlertFilter(alertFilter === 'split' ? 'all' : 'split')}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all border ${
                                            alertFilter === 'split'
                                                ? 'bg-blue-500 text-white border-blue-500 shadow-sm scale-105'
                                                : 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200'
                                        }`}
                                    >
                                        <Split size={10} />
                                        {splitCount} Split
                                    </button>
                                )}
                                {crossDivCount > 0 && (
                                    <button
                                        onClick={() => setAlertFilter(alertFilter === 'cross_division' ? 'all' : 'cross_division')}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all border ${
                                            alertFilter === 'cross_division'
                                                ? 'bg-orange-500 text-white border-orange-500 shadow-sm scale-105'
                                                : 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200'
                                        }`}
                                    >
                                        <ArrowRight size={10} />
                                        {crossDivCount} Cross Div
                                    </button>
                                )}
                                {alertFilter !== 'all' && (
                                    <button
                                        onClick={() => setAlertFilter('all')}
                                        className="text-amber-700 text-[11px] font-semibold hover:underline px-1"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Row 2: bulk send actions (uncontested only) */}
                        {uncontestedCount > 0 && (
                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-amber-200/60 flex-wrap">
                                <p className="text-[10px] font-black text-amber-800 uppercase tracking-wider mr-1">Send Uncontested:</p>

                                {/* Send All */}
                                <button
                                    onClick={handleSendAll}
                                    disabled={sendingAll || !!sendingClub}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black bg-amber-600 hover:bg-amber-700 text-white transition-all shadow-sm shadow-amber-300 disabled:opacity-50 active:scale-95"
                                >
                                    {sendingAll ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                                    Send All ({uncontestedCount})
                                </button>

                                {/* Per Club dropdown */}
                                {clubList.length > 1 && (
                                    <div className="relative">
                                        <button
                                            onClick={() => setClubDropdownOpen(o => !o)}
                                            disabled={sendingAll || !!sendingClub}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black bg-white hover:bg-amber-50 border border-amber-300 text-amber-800 transition-all shadow-sm disabled:opacity-50 active:scale-95"
                                        >
                                            {sendingClub ? <Loader2 size={11} className="animate-spin" /> : <Users size={11} />}
                                            Per Club
                                            <ChevronDown size={11} className={`transition-transform ${clubDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {clubDropdownOpen && (
                                            <div className="absolute left-0 top-full mt-1.5 z-50 bg-white rounded-2xl border border-gray-200 shadow-xl shadow-amber-100/50 min-w-[220px] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 pt-3 pb-1.5">Clubs with Uncontested Athletes</p>
                                                {clubList.map(club => (
                                                    <button
                                                        key={club.id}
                                                        onClick={() => handleSendClub(club.id, club.name)}
                                                        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-amber-50 transition-colors text-left group"
                                                    >
                                                        {club.logoUrl ? (
                                                            <img src={club.logoUrl} alt="" className="w-6 h-6 rounded-full object-cover ring-1 ring-gray-200 flex-shrink-0" />
                                                        ) : (
                                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-[9px] font-black text-white flex-shrink-0">
                                                                {club.name[0]}
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-bold text-gray-900 truncate">{club.name}</p>
                                                            <p className="text-[10px] text-gray-400">{club.count} uncontested athlete{club.count !== 1 ? 's' : ''}</p>
                                                        </div>
                                                        <ChevronRight size={12} className="text-gray-300 group-hover:text-amber-500 flex-shrink-0" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )
            })()}

            {/* ── Toolbar Card ────────────────────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

                {/* Top row */}
                <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-gray-100">
                    {/* Discipline tabs */}
                    <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                        {discTabs.map(({ id, label, icon: Icon, count }) => (
                            <button
                                key={id}
                                onClick={() => setActiveTab(id as any)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                    activeTab === id
                                        ? 'bg-white text-red-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
                                }`}
                            >
                                <Icon size={14} />
                                {label}
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                    activeTab === id ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-500'
                                }`}>
                                    {count}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Search + Generate */}
                    <div className="flex items-center gap-3">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                            <input
                                type="text"
                                placeholder="Search categories..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-8 pr-8 py-2 text-sm font-medium bg-gray-50 border border-gray-200 rounded-xl w-52 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 focus:bg-white transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>

                        {!publicView && (
                            <>
                                <div className="h-6 w-px bg-gray-200" />
                                {totalAlerts > 0 && (
                                    <span className="text-xs text-amber-600 font-semibold max-w-[140px] leading-tight hidden lg:block">
                                        Resolve {totalAlerts} alert{totalAlerts !== 1 ? 's' : ''} first
                                    </span>
                                )}
                                <button
                                    onClick={handleGenerateAll}
                                    disabled={isPending || displayedCategories.length === 0 || totalAlerts > 0}
                                    title={totalAlerts > 0 ? `Resolve ${totalAlerts} alert(s) first` : undefined}
                                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white transition-all
                                        bg-gradient-to-br from-red-600 to-red-700
                                        shadow-md shadow-red-500/20
                                        hover:shadow-lg hover:shadow-red-500/30 hover:-translate-y-0.5
                                        disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0"
                                >
                                    {isPending ? (
                                        <><Loader2 size={15} className="animate-spin" /> Generating...</>
                                    ) : (
                                        <><Zap size={15} /> Generate All</>
                                    )}
                                </button>
                            </>
                        )}
                    </div>
                </div>

            </div>

            {/* ── Category List ────────────────────────────────────── */}
            <div className="space-y-2">
                {filteredCategories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200 text-center">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                            <AlertCircle size={20} className="text-gray-300" />
                        </div>
                        <p className="text-sm font-semibold text-gray-500">
                            {searchQuery || alertFilter !== 'all'
                                ? 'No categories match your filter.'
                                : `No ${activeTab} categories found.`}
                        </p>
                        {(searchQuery || alertFilter !== 'all') && (
                            <button
                                onClick={() => { setSearchQuery(''); setAlertFilter('all') }}
                                className="text-red-600 text-xs font-semibold mt-2 hover:underline"
                            >
                                Clear all filters
                            </button>
                        )}
                    </div>
                ) : (
                    filteredCategories.map((cat) => (
                        <CollapsibleBracket
                            key={cat.id}
                            category={cat}
                            isPoomsae={activeTab === 'poomsae'}
                            tournamentName={tournamentName}
                            alerts={alertsByCategory.get(cat.id) || []}
                            proposals={proposals}
                            tournamentId={tournamentId}
                            publicView={publicView}
                            onAlertResolved={() => queryClient.invalidateQueries({ queryKey: ['tournament-smart-alerts', tournamentId] })}
                        />
                    ))
                )}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────
// CollapsibleBracket
// ─────────────────────────────────────────────
function CollapsibleBracket({
    category, isPoomsae = false, tournamentName,
    alerts, proposals, tournamentId, publicView, onAlertResolved
}: {
    category: Category & { matches: Match[], poomsaeMatches?: (PoomsaeMatch & { player: { name: string; club?: { name: string } | null } })[] },
    isPoomsae?: boolean, tournamentName?: string, alerts: any[], proposals: any[],
    tournamentId: string, publicView?: boolean, onAlertResolved: () => void
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [isAlertOpen, setIsAlertOpen] = useState(false)
    const matchCount = isPoomsae ? (category.poomsaeMatches?.length || 0) : category.matches.length

    const hasAlert  = alerts.some(a => a.type === 'UNCONTESTED')
    const hasMerge  = alerts.some(a => a.type === 'MERGE_SUGGESTION')
    const hasSplit  = alerts.some(a => a.type === 'SPLIT_SUGGESTION')
    const hasAnAlert = alerts.length > 0

    // Left accent colour
    const accentClass = hasAlert  ? 'bg-gradient-to-b from-amber-400 to-yellow-500'
        : hasMerge ? 'bg-gradient-to-b from-purple-400 to-violet-600'
        : hasSplit  ? 'bg-gradient-to-b from-blue-400 to-blue-600'
        : 'bg-gray-200'

    const borderClass = hasAlert  ? 'border-amber-200 hover:border-amber-300'
        : hasMerge ? 'border-purple-200 hover:border-purple-300'
        : hasSplit  ? 'border-blue-200 hover:border-blue-300'
        : 'border-gray-200 hover:border-gray-300'

    return (
        <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-200 ${borderClass}`}>
            <div className="flex">
                {/* Left accent bar */}
                <div className={`w-1 flex-shrink-0 ${accentClass}`} />

                {/* Header */}
                <div
                    className="flex-1 flex items-center gap-3 px-4 py-3.5 cursor-pointer select-none hover:bg-gray-50/50 transition-colors"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {/* Chevron */}
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                        isOpen ? 'bg-red-50 border border-red-100' : 'bg-gray-100 border border-gray-200'
                    }`}>
                        <ChevronDown
                            size={13}
                            className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-red-500' : 'text-gray-400'}`}
                        />
                    </div>

                    {/* Category info */}
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-gray-900 truncate">{category.name}</h3>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {/* Match count */}
                            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                                {matchCount} Matches
                            </span>

                            {/* Court */}
                            {category.court && (
                                <span className="text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-md uppercase">
                                    Court {category.court}
                                </span>
                            )}

                            {/* Alert pills + inline proposal status */}
                            {!publicView && alerts.map((alert: any, i: number) => {
                                // Match the proposal for this specific alert
                                const matchedProposal = proposals.find((p: any) => {
                                    try {
                                        const d = JSON.parse(p.data)
                                        if (p.type === 'UNCONTESTED' && alert.type === 'UNCONTESTED')
                                            return d.playerId === alert.details?.playerId
                                        if (p.type === 'CROSS_DIVISION' && alert.type === 'CROSS_DIVISION')
                                            return d.playerId === alert.details?.playerId
                                        if (p.type === 'MERGE' && alert.type === 'MERGE_SUGGESTION')
                                            return d.sourceCategoryId === alert.categoryId
                                        if (p.type === 'SPLIT' && alert.type === 'SPLIT_SUGGESTION')
                                            return d.categoryId === alert.categoryId
                                    } catch { return false }
                                    return false
                                })

                                const isPending  = matchedProposal?.status === 'PENDING'
                                const votes: { clubId: string; vote: string }[] = matchedProposal?.votes || []
                                const hasVotes   = votes.length > 0

                                // Vote summary helpers
                                const moveUp   = votes.filter(v => v.vote === 'MOVE_UP').length
                                const walkover = votes.filter(v => v.vote === 'WALKOVER').length
                                const withdraw = votes.filter(v => v.vote === 'WITHDRAW').length
                                const agrees   = votes.filter(v => v.vote === 'AGREE').length
                                const disagrees = votes.filter(v => v.vote === 'DISAGREE').length

                                return (
                                    <span key={`${alert.type}-${i}`} className="inline-flex items-center gap-1 flex-wrap">
                                        {/* Alert type pill — clickable to open panel */}
                                        <button
                                            onClick={e => { e.stopPropagation(); setIsAlertOpen(!isAlertOpen) }}
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all hover:scale-105 ${
                                                alert.type === 'UNCONTESTED'
                                                    ? 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'
                                                    : alert.type === 'CROSS_DIVISION'
                                                    ? 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
                                                    : alert.type === 'MERGE_SUGGESTION'
                                                    ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                                                    : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                            }`}
                                        >
                                            {alert.type === 'UNCONTESTED'     && <ShieldAlert size={9} />}
                                            {alert.type === 'CROSS_DIVISION'  && <ArrowRight size={9} />}
                                            {alert.type === 'MERGE_SUGGESTION' && <Merge size={9} />}
                                            {alert.type === 'SPLIT_SUGGESTION' && <Split size={9} />}
                                            {alert.type === 'UNCONTESTED'     ? 'Uncontested'
                                                : alert.type === 'CROSS_DIVISION'  ? 'Cross Div'
                                                : alert.type === 'MERGE_SUGGESTION' ? 'Merge' : 'Split'}
                                        </button>

                                        {/* Inline proposal status — shown only when a proposal exists */}
                                        {isPending && !hasVotes && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 animate-pulse">
                                                <Clock size={8} /> Awaiting Club
                                            </span>
                                        )}
                                        {isPending && hasVotes && (alert.type === 'UNCONTESTED' || alert.type === 'CROSS_DIVISION') && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-gray-200 text-gray-600">
                                                {moveUp   > 0 && <span className="text-amber-700">{moveUp}↑ Move Up</span>}
                                                {walkover > 0 && <span className="text-emerald-700">{walkover} Walkover</span>}
                                                {withdraw > 0 && <span className="text-red-700">{withdraw} Withdraw</span>}
                                            </span>
                                        )}
                                        {isPending && hasVotes && (alert.type === 'MERGE_SUGGESTION' || alert.type === 'SPLIT_SUGGESTION') && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-gray-200 text-gray-600">
                                                {agrees > 0    && <span className="text-emerald-700">{agrees} Agree</span>}
                                                {disagrees > 0 && <span className="text-red-700">{disagrees} Disagree</span>}
                                            </span>
                                        )}
                                    </span>
                                )
                            })}
                        </div>
                    </div>

                    {/* Right: match count + status dot */}
                    <div className="flex items-center gap-3 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <div className="text-right hidden sm:block">
                            <div className="text-lg font-black text-gray-800 leading-none">{matchCount}</div>
                            <div className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">matches</div>
                        </div>
                        {matchCount > 0 ? (
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                            </span>
                        ) : (
                            <span className="h-2.5 w-2.5 rounded-full bg-gray-300 flex-shrink-0" />
                        )}
                    </div>
                </div>
            </div>

            {/* Inline Alert Panel */}
            {isAlertOpen && hasAnAlert && !publicView && (
                <div className="border-t border-amber-100 bg-gradient-to-b from-amber-50/60 to-transparent animate-in fade-in slide-in-from-top-1 duration-200">
                    {alerts.map((alert: any, idx: number) => (
                        <InlineAlertPanel
                            key={`${alert.categoryId}-${alert.type}-${idx}`}
                            alert={alert}
                            proposals={proposals}
                            tournamentId={tournamentId}
                            onResolved={onAlertResolved}
                        />
                    ))}
                </div>
            )}

            {/* Bracket content */}
            {isOpen && (
                <div className="border-t border-gray-100 bg-white p-6 animate-in fade-in duration-200">
                    <div className="overflow-x-auto">
                        {isPoomsae ? (
                            <PoomsaeBracketView
                                matches={category.poomsaeMatches || []}
                                tournamentName={tournamentName}
                                categoryName={category.name}
                            />
                        ) : (
                            <BracketView
                                matches={category.matches}
                                tournamentName={tournamentName}
                                categoryName={category.name}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────
// InlineAlertPanel
// ─────────────────────────────────────────────
function InlineAlertPanel({ alert, proposals, tournamentId, onResolved }: {
    alert: any, proposals: any[], tournamentId: string, onResolved: () => void
}) {
    const [loading, setLoading] = useState(false)

    const proposal = proposals.find((p: any) => {
        const data = JSON.parse(p.data)
        if (p.type === 'UNCONTESTED'    && alert.type === 'UNCONTESTED')    return data.playerId === alert.details?.playerId
        if (p.type === 'CROSS_DIVISION' && alert.type === 'CROSS_DIVISION') return data.playerId === alert.details?.playerId
        if (p.type === 'MERGE'          && alert.type === 'MERGE_SUGGESTION') return data.sourceCategoryId === alert.categoryId
        if (p.type === 'SPLIT'          && alert.type === 'SPLIT_SUGGESTION') return data.categoryId === alert.categoryId
        return false
    })

    const isPending  = proposal?.status === 'PENDING'
    const votes: { clubId: string, vote: string }[] = proposal?.votes || []
    const voteCount  = votes.length

    const voteLabel: Record<string, { text: string, color: string }> = {
        MOVE_UP:  { text: 'Move Up',  color: 'text-amber-700 bg-amber-100' },
        WALKOVER: { text: 'Walkover', color: 'text-emerald-700 bg-emerald-100' },
        WITHDRAW: { text: 'Withdraw', color: 'text-red-700 bg-red-100' },
        AGREE:    { text: 'Agree',    color: 'text-emerald-700 bg-emerald-100' },
        DISAGREE: { text: 'Disagree', color: 'text-gray-700 bg-gray-100' },
    }

    async function handleAction() {
        setLoading(true)
        try {
            if (isPending && proposal) {
                const result = await forceExecuteSmartAction(proposal.id)
                if (result?.error) toast.error(result.error)
                else { toast.success('Action executed'); onResolved() }
            } else {
                if (alert.type === 'UNCONTESTED') {
                    await initiateSmartProposal(tournamentId, 'UNCONTESTED', {
                        playerId: alert.details.playerId,
                        playerName: alert.details.playerName,
                        sourceCategoryId: alert.categoryId,
                        sourceCategoryName: alert.details.sourceCategoryName || alert.categoryName,
                        targetCategoryId: alert.details.targetCategoryId || null,
                        targetCategoryName: alert.details.targetCategoryName || null,
                    })
                } else if (alert.type === 'CROSS_DIVISION') {
                    await initiateSmartProposal(tournamentId, 'CROSS_DIVISION', {
                        playerId: alert.details.playerId,
                        playerName: alert.details.playerName,
                        sourceCategoryId: alert.categoryId,
                        sourceCategoryName: alert.details.sourceCategoryName || alert.categoryName,
                        targetCategoryId: alert.details.targetCategoryId,
                        targetCategoryName: alert.details.targetCategoryName,
                        clubId: alert.details.clubId || null,
                        clubName: alert.details.clubName || null,
                    })
                } else if (alert.type === 'MERGE_SUGGESTION') {
                    await initiateSmartProposal(tournamentId, 'MERGE', {
                        sourceCategoryId: alert.categoryId,
                        targetCategoryId: alert.details.targetCategoryId
                    })
                } else if (alert.type === 'SPLIT_SUGGESTION') {
                    await initiateSmartProposal(tournamentId, 'SPLIT', { categoryId: alert.categoryId })
                }
                toast.success('Proposal sent to clubs')
                onResolved()
            }
        } catch {
            toast.error('Action failed')
        } finally {
            setLoading(false)
        }
    }

    const details = alert.details || {}
    const players  = details.players || (details.playerName
        ? [{ name: details.playerName, clubName: details.clubName, clubLogoUrl: details.clubLogoUrl }]
        : [])

    const alertColor = alert.type === 'UNCONTESTED'
        ? { bg: 'bg-amber-100',  text: 'text-amber-700',  btn: 'bg-amber-500 hover:bg-amber-600',   btnPending: 'bg-gray-900 hover:bg-gray-800' }
        : alert.type === 'CROSS_DIVISION'
        ? { bg: 'bg-orange-100', text: 'text-orange-700', btn: 'bg-orange-500 hover:bg-orange-600', btnPending: 'bg-gray-900 hover:bg-gray-800' }
        : alert.type === 'MERGE_SUGGESTION'
        ? { bg: 'bg-purple-100', text: 'text-purple-700', btn: 'bg-purple-600 hover:bg-purple-700', btnPending: 'bg-gray-900 hover:bg-gray-800' }
        : { bg: 'bg-blue-100',   text: 'text-blue-700',   btn: 'bg-blue-600 hover:bg-blue-700',     btnPending: 'bg-gray-900 hover:bg-gray-800' }

    return (
        <div className="px-5 py-4 border-b border-amber-100/80 last:border-b-0">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                {/* Left: alert info */}
                <div className="flex-1 min-w-0">
                    {/* Tag row */}
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${alertColor.bg} ${alertColor.text}`}>
                            {alert.type === 'UNCONTESTED'     && <ShieldAlert size={9} />}
                            {alert.type === 'CROSS_DIVISION'  && <ArrowRight size={9} />}
                            {alert.type === 'MERGE_SUGGESTION' && <Merge size={9} />}
                            {alert.type === 'SPLIT_SUGGESTION' && <Split size={9} />}
                            {alert.type === 'UNCONTESTED'      ? 'Uncontested'
                                : alert.type === 'CROSS_DIVISION'   ? 'Cross Division'
                                : alert.type === 'MERGE_SUGGESTION' ? 'Merge Suggestion'
                                : 'Split Suggestion'}
                        </span>

                        {/* Vote state badges */}
                        {isPending && voteCount === 0 && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-full animate-pulse">
                                Awaiting Club Response
                            </span>
                        )}
                        {isPending && voteCount > 0 && (alert.type === 'UNCONTESTED' || alert.type === 'CROSS_DIVISION') && votes.map((v, i) => {
                            const vl = voteLabel[v.vote] || { text: v.vote, color: 'text-gray-700 bg-gray-100' }
                            return (
                                <span key={i} className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${vl.color}`}>
                                    Club voted: {vl.text}
                                </span>
                            )
                        })}
                        {isPending && voteCount > 0 && (alert.type === 'MERGE_SUGGESTION' || alert.type === 'SPLIT_SUGGESTION') && (() => {
                            const agrees    = votes.filter(v => v.vote === 'AGREE').length
                            const disagrees = votes.filter(v => v.vote === 'DISAGREE').length
                            return (
                                <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                                    {agrees} Agree · {disagrees} Disagree
                                </span>
                            )
                        })()}
                    </div>

                    <p className="text-sm text-gray-700 font-medium leading-relaxed">{alert.message}</p>

                    {/* Athletes */}
                    {players.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                            <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider flex items-center gap-1">
                                <Users size={9} /> Affected Athletes
                            </div>
                            {players.map((p: any, i: number) => (
                                <div key={i} className="flex items-center gap-2.5 px-3 py-2 bg-white rounded-xl border border-gray-100 shadow-sm">
                                    {p.clubLogoUrl ? (
                                        <img src={p.clubLogoUrl} alt="" className="w-5 h-5 rounded-full object-cover ring-1 ring-gray-200" />
                                    ) : (
                                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-[8px] font-black text-white">
                                            {(p.clubName || '?')[0]}
                                        </div>
                                    )}
                                    <span className="text-sm font-semibold text-gray-900">{p.name}</span>
                                    <span className="text-gray-300">·</span>
                                    <span className="text-xs text-gray-500">{p.clubName}</span>
                                </div>
                            ))}
                            {details.playerCount && details.playerCount > players.length && (
                                <p className="text-xs text-gray-400 pl-3">
                                    + {details.playerCount - players.length} more athletes
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Right: action button */}
                <div className="flex-shrink-0 self-start">
                    <button
                        onClick={handleAction}
                        disabled={loading}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 ${
                            isPending ? alertColor.btnPending : alertColor.btn
                        }`}
                    >
                        {loading && <Loader2 size={12} className="animate-spin" />}
                        {isPending ? 'Force Execute'
                            : alert.type === 'UNCONTESTED'     ? 'Request Resolution'
                            : alert.type === 'CROSS_DIVISION'  ? 'Send Cross Div Proposal'
                            : alert.type === 'MERGE_SUGGESTION' ? 'Propose Merge'
                            : 'Propose Split'}
                    </button>
                </div>
            </div>
        </div>
    )
}
