'use client'

import { useState, useTransition } from 'react'
import { Category, Match, PoomsaeMatch } from '@prisma/client'
import BracketView from './BracketView'
import PoomsaeBracketView from './PoomsaeBracketView'
import { generateAllBrackets, getTournamentAlerts, initiateSmartProposal, forceExecuteSmartAction } from '@/app/actions'
import { Trophy, Medal, Wand2, Loader2, AlertCircle, Search, ShieldAlert, Split, Merge, ChevronDown, Users, X } from 'lucide-react'
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
    const [alertFilter, setAlertFilter] = useState<'all' | 'uncontested' | 'merge' | 'split'>('all')

    const tournamentId = categories[0]?.tournamentId

    // Fetch smart alerts client-side
    const queryClient = useQueryClient()
    const { data: alertData } = useQuery({
        queryKey: ['tournament-smart-alerts', tournamentId],
        queryFn: () => getTournamentAlerts(tournamentId),
        enabled: !!tournamentId && !publicView,
        staleTime: 1000 * 30
    })

    const alerts = alertData?.alerts || []
    const proposals = alertData?.proposals || []

    // Build a map: categoryId -> alerts for that category
    const alertsByCategory = new Map<string, any[]>()
    for (const alert of alerts) {
        const existing = alertsByCategory.get(alert.categoryId) || []
        existing.push(alert)
        alertsByCategory.set(alert.categoryId, existing)
    }

    if (categories.length === 0) {
        return <p className="text-gray-500">Add categories to generate matches.</p>
    }

    // Filter categories based on tab
    const kyorugiCategories = categories.filter(c => c.type === 'KYORUGI' || !c.type)
    const poomsaeCategories = categories.filter(c => c.type === 'POOMSAE')
    const kyukpaCategories = categories.filter(c => c.type === 'KYUKPA')

    const displayedCategories = activeTab === 'kyorugi' ? kyorugiCategories : activeTab === 'poomsae' ? poomsaeCategories : kyukpaCategories

    // Apply search
    const q = searchQuery.toLowerCase().trim()
    let filteredCategories = q
        ? displayedCategories.filter(c => c.name.toLowerCase().includes(q))
        : displayedCategories

    // Apply alert filter
    if (alertFilter !== 'all') {
        const targetType = alertFilter === 'uncontested' ? 'UNCONTESTED' : alertFilter === 'merge' ? 'MERGE_SUGGESTION' : 'SPLIT_SUGGESTION'
        filteredCategories = filteredCategories.filter(c => {
            const catAlerts = alertsByCategory.get(c.id)
            return catAlerts?.some(a => a.type === targetType)
        })
    }

    const handleGenerateAll = () => {
        if (!confirm(`Are you sure you want to regenerate ALL ${activeTab} matches? This will overwrite existing brackets.`)) return;

        startTransition(async () => {
            try {
                const targetType = activeTab === 'kyorugi' ? 'KYORUGI' : activeTab === 'poomsae' ? 'POOMSAE' : 'KYUKPA'
                const result = await generateAllBrackets(tournamentId, targetType)
                if (result?.success) {
                    toast.success(`Generated matches for ${result.count} categories!`)
                } else {
                    toast.error(result?.message || "Failed to generate matches.")
                }
            } catch (error) {
                console.error(error)
                toast.error("An error occurred while generating matches.")
            }
        })
    }

    // Alert counts for summary
    const uncontestedCount = alerts.filter(a => a.type === 'UNCONTESTED').length
    const mergeCount = alerts.filter(a => a.type === 'MERGE_SUGGESTION').length
    const splitCount = alerts.filter(a => a.type === 'SPLIT_SUGGESTION').length
    const totalAlerts = uncontestedCount + mergeCount + splitCount

    return (
        <div className="space-y-4">
            {/* Alert Summary Banner */}
            {totalAlerts > 0 && !publicView && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="p-1.5 bg-amber-100 rounded-lg">
                        <AlertCircle size={18} className="text-amber-600" />
                    </div>
                    <div className="flex items-center gap-3 flex-wrap text-sm font-medium">
                        <span className="text-amber-800 font-bold">{totalAlerts} Alert{totalAlerts !== 1 ? 's' : ''}</span>
                        <span className="text-amber-300">|</span>
                        {uncontestedCount > 0 && (
                            <button
                                onClick={() => setAlertFilter(alertFilter === 'uncontested' ? 'all' : 'uncontested')}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold transition-all cursor-pointer ${alertFilter === 'uncontested' ? 'bg-yellow-200 text-yellow-800 ring-1 ring-yellow-400' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'}`}
                            >
                                <ShieldAlert size={10} />
                                {uncontestedCount} Uncontested
                            </button>
                        )}
                        {mergeCount > 0 && (
                            <button
                                onClick={() => setAlertFilter(alertFilter === 'merge' ? 'all' : 'merge')}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold transition-all cursor-pointer ${alertFilter === 'merge' ? 'bg-purple-200 text-purple-800 ring-1 ring-purple-400' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}
                            >
                                <Merge size={10} />
                                {mergeCount} Merge
                            </button>
                        )}
                        {splitCount > 0 && (
                            <button
                                onClick={() => setAlertFilter(alertFilter === 'split' ? 'all' : 'split')}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold transition-all cursor-pointer ${alertFilter === 'split' ? 'bg-blue-200 text-blue-800 ring-1 ring-blue-400' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                            >
                                <Split size={10} />
                                {splitCount} Split
                            </button>
                        )}
                        {alertFilter !== 'all' && (
                            <button onClick={() => setAlertFilter('all')} className="text-amber-600 hover:text-amber-800 text-xs font-medium underline ml-1">
                                Clear Filter
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Header Controls */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                {/* Tab Switcher */}
                <div className="flex p-1 bg-gray-100 rounded-lg w-fit">
                    <button
                        onClick={() => setActiveTab('kyorugi')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'kyorugi'
                            ? 'bg-white text-red-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Trophy size={16} />
                        Kyorugi
                    </button>
                    <button
                        onClick={() => setActiveTab('poomsae')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'poomsae'
                            ? 'bg-white text-red-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Medal size={16} />
                        Poomsae
                    </button>
                    <button
                        onClick={() => setActiveTab('kyukpa')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'kyukpa'
                            ? 'bg-white text-red-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Wand2 size={16} />
                        Kyukpa
                    </button>
                </div>

                {/* Search + Actions */}
                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    <div className="relative flex-1 xl:flex-none xl:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input
                            type="text"
                            placeholder="Search categories..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    {!publicView && (
                        <div className="flex items-center gap-3">
                            {totalAlerts > 0 && (
                                <span className="text-xs text-amber-600 font-medium max-w-[180px] leading-tight">
                                    Resolve {totalAlerts} alert{totalAlerts !== 1 ? 's' : ''} before generating
                                </span>
                            )}
                            <button
                                onClick={handleGenerateAll}
                                disabled={isPending || displayedCategories.length === 0 || totalAlerts > 0}
                                title={totalAlerts > 0 ? `Resolve ${totalAlerts} smart alert(s) first` : undefined}
                                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-white transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${isPending ? 'bg-red-400' : 'bg-red-600 hover:bg-red-700'
                                    }`}
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Wand2 size={18} />
                                        Generate All
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Category List */}
            <div className="space-y-3">
                {filteredCategories.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
                            <AlertCircle className="text-gray-400" size={24} />
                        </div>
                        <p className="text-gray-500 font-medium">
                            {searchQuery || alertFilter !== 'all' ? 'No categories match your filter.' : `No ${activeTab} categories found.`}
                        </p>
                        {(searchQuery || alertFilter !== 'all') && (
                            <button onClick={() => { setSearchQuery(''); setAlertFilter('all') }} className="text-red-600 text-sm font-medium mt-2 hover:underline">
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

function CollapsibleBracket({
    category,
    isPoomsae = false,
    tournamentName,
    alerts,
    proposals,
    tournamentId,
    publicView,
    onAlertResolved
}: {
    category: Category & { matches: Match[], poomsaeMatches?: (PoomsaeMatch & { player: { name: string; club?: { name: string } | null } })[] },
    isPoomsae?: boolean,
    tournamentName?: string,
    alerts: any[],
    proposals: any[],
    tournamentId: string,
    publicView?: boolean,
    onAlertResolved: () => void
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [isAlertOpen, setIsAlertOpen] = useState(false)
    const matchCount = isPoomsae ? (category.poomsaeMatches?.length || 0) : category.matches.length

    return (
        <div className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-colors ${alerts.length > 0 ? 'border-amber-200 hover:border-amber-300' : 'border-gray-200 hover:border-red-200'}`}>
            {/* Category Header */}
            <div
                className="p-5 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center cursor-pointer select-none"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <button className="text-gray-400 group-hover:text-red-500 transition-colors focus:outline-none bg-white p-1.5 rounded-md border border-gray-200 shadow-sm flex-shrink-0">
                        <svg className={`w-4 h-4 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    <div className="flex flex-col min-w-0">
                        <h3 className="font-bold text-lg text-gray-800 truncate">{category.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-full">
                                {matchCount} Matches
                            </span>

                            {category.court && (
                                <span className="text-[10px] font-bold text-orange-700 bg-orange-50 uppercase tracking-wide px-2 py-0.5 rounded border border-orange-100">
                                    Court {category.court}
                                </span>
                            )}

                            {/* Alert Pills */}
                            {!publicView && alerts.map((alert: any, i: number) => (
                                <button
                                    key={`${alert.type}-${i}`}
                                    onClick={(e) => { e.stopPropagation(); setIsAlertOpen(!isAlertOpen) }}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border transition-all hover:scale-105 cursor-pointer ${
                                        alert.type === 'UNCONTESTED' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100' :
                                        alert.type === 'MERGE_SUGGESTION' ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' :
                                        'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                    }`}
                                >
                                    {alert.type === 'UNCONTESTED' && <ShieldAlert size={10} />}
                                    {alert.type === 'MERGE_SUGGESTION' && <Merge size={10} />}
                                    {alert.type === 'SPLIT_SUGGESTION' && <Split size={10} />}
                                    {alert.type === 'UNCONTESTED' ? 'Uncontested' : alert.type === 'MERGE_SUGGESTION' ? 'Merge' : 'Split'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                    {matchCount > 0 ? (
                        <span className="flex h-2.5 w-2.5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                        </span>
                    ) : (
                        <span className="h-2.5 w-2.5 rounded-full bg-gray-300"></span>
                    )}
                </div>
            </div>

            {/* Inline Alert Panel */}
            {isAlertOpen && alerts.length > 0 && !publicView && (
                <div className="border-b border-amber-100 bg-amber-50/30 animate-in fade-in slide-in-from-top-1 duration-200">
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

            {/* Bracket Content */}
            {isOpen && (
                <div className="p-6 border-t border-gray-100 bg-white">
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

function InlineAlertPanel({ alert, proposals, tournamentId, onResolved }: {
    alert: any,
    proposals: any[],
    tournamentId: string,
    onResolved: () => void
}) {
    const [loading, setLoading] = useState(false)

    // Find matching proposal
    const proposal = proposals.find((p: any) => {
        const data = JSON.parse(p.data)
        if (p.type === 'UNCONTESTED' && alert.type === 'UNCONTESTED') return data.playerId === alert.details?.playerId
        if (p.type === 'MERGE' && alert.type === 'MERGE_SUGGESTION') return data.sourceCategoryId === alert.categoryId
        if (p.type === 'SPLIT' && alert.type === 'SPLIT_SUGGESTION') return data.categoryId === alert.categoryId
        return false
    })

    const isPending = proposal?.status === 'PENDING'

    async function handleAction() {
        setLoading(true)
        try {
            if (isPending && proposal) {
                const result = await forceExecuteSmartAction(proposal.id)
                if (result?.error) {
                    toast.error(result.error)
                } else {
                    toast.success("Action executed")
                    onResolved()
                }
            } else {
                if (alert.type === 'UNCONTESTED') {
                    await initiateSmartProposal(tournamentId, 'UNCONTESTED', { playerId: alert.details.playerId, playerName: alert.details.playerName })
                } else if (alert.type === 'MERGE_SUGGESTION') {
                    await initiateSmartProposal(tournamentId, 'MERGE', { sourceCategoryId: alert.categoryId, targetCategoryId: alert.details.targetCategoryId })
                } else if (alert.type === 'SPLIT_SUGGESTION') {
                    await initiateSmartProposal(tournamentId, 'SPLIT', { categoryId: alert.categoryId })
                }
                toast.success("Proposal sent to clubs")
                onResolved()
            }
        } catch {
            toast.error("Action failed")
        } finally {
            setLoading(false)
        }
    }

    const details = alert.details || {}
    const players = details.players || (details.playerName ? [{ name: details.playerName, clubName: details.clubName, clubLogoUrl: details.clubLogoUrl }] : [])

    return (
        <div className="px-6 py-4 border-b border-amber-100 last:border-b-0">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                {/* Alert Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                            alert.type === 'UNCONTESTED' ? 'bg-yellow-100 text-yellow-700' :
                            alert.type === 'MERGE_SUGGESTION' ? 'bg-purple-100 text-purple-700' :
                            'bg-blue-100 text-blue-700'
                        }`}>
                            {alert.type === 'UNCONTESTED' && <ShieldAlert size={10} />}
                            {alert.type === 'MERGE_SUGGESTION' && <Merge size={10} />}
                            {alert.type === 'SPLIT_SUGGESTION' && <Split size={10} />}
                            {alert.type === 'UNCONTESTED' ? 'Uncontested' : alert.type === 'MERGE_SUGGESTION' ? 'Merge Suggestion' : 'Split Suggestion'}
                        </span>
                        {isPending && (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full animate-pulse">
                                Pending Club Response
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-700 font-medium">{alert.message}</p>

                    {/* Athletes List */}
                    {players.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                            <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider flex items-center gap-1">
                                <Users size={10} /> Affected Athletes
                            </div>
                            {players.map((p: any, i: number) => (
                                <div key={i} className="flex items-center gap-2.5 px-3 py-1.5 bg-white rounded-lg border border-gray-100">
                                    {p.clubLogoUrl ? (
                                        <img src={p.clubLogoUrl} alt="" className="w-5 h-5 rounded-full object-cover ring-1 ring-gray-200" />
                                    ) : (
                                        <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[8px] font-bold text-gray-500">
                                            {(p.clubName || '?')[0]}
                                        </div>
                                    )}
                                    <span className="text-sm font-medium text-gray-900">{p.name}</span>
                                    <span className="text-xs text-gray-400">•</span>
                                    <span className="text-xs text-gray-500">{p.clubName}</span>
                                </div>
                            ))}
                            {details.playerCount && details.playerCount > players.length && (
                                <div className="text-xs text-gray-400 pl-3">
                                    + {details.playerCount - players.length} more athletes
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Action Button */}
                <div className="flex-shrink-0 self-start">
                    <button
                        onClick={handleAction}
                        disabled={loading}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50 ${
                            isPending
                                ? 'bg-gray-900 text-white hover:bg-gray-800'
                                : alert.type === 'UNCONTESTED'
                                    ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                                    : alert.type === 'MERGE_SUGGESTION'
                                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                    >
                        {loading ? <Loader2 size={12} className="animate-spin" /> : null}
                        {isPending ? 'Force Execute' : alert.type === 'UNCONTESTED' ? 'Request Resolution' : alert.type === 'MERGE_SUGGESTION' ? 'Propose Merge' : 'Propose Split'}
                    </button>
                </div>
            </div>
        </div>
    )
}
