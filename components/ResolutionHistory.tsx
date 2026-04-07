'use client'

import { useQuery } from '@tanstack/react-query'
import { getResolutionHistory } from '@/app/actions'
import { Shield, ArrowRight, X, Loader2, ClipboardCheck, Merge, Split, AlertCircle } from 'lucide-react'

interface ResolutionHistoryProps {
    tournamentId: string
}

const TYPE_CONFIG = {
    UNCONTESTED: {
        icon: Shield,
        bgColor: 'bg-amber-50',
        iconColor: 'text-amber-600',
        borderColor: 'border-amber-100',
    },
    MERGE: {
        icon: Merge,
        bgColor: 'bg-purple-50',
        iconColor: 'text-purple-600',
        borderColor: 'border-purple-100',
    },
    SPLIT: {
        icon: Split,
        bgColor: 'bg-blue-50',
        iconColor: 'text-blue-600',
        borderColor: 'border-blue-100',
    },
}

const VOTE_BADGE: Record<string, { label: string; className: string }> = {
    MOVE_UP:  { label: 'Move Up',  className: 'bg-amber-100 text-amber-800' },
    WALKOVER: { label: 'Walkover', className: 'bg-green-100 text-green-800' },
    WITHDRAW: { label: 'Withdraw', className: 'bg-red-100 text-red-800' },
    AGREE:    { label: 'Agree',    className: 'bg-green-100 text-green-800' },
    DISAGREE: { label: 'Disagree', className: 'bg-gray-100 text-gray-700' },
    FORCE:    { label: 'Force Executed', className: 'bg-slate-100 text-slate-700' },
}

function formatDate(date: Date | string) {
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (diffHours < 48) return `Yesterday · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function ResolutionRow({ resolution }: { resolution: any }) {
    const data = JSON.parse(resolution.data || '{}')
    const votes: { clubId: string; vote: string; timestamp: string }[] = resolution.votes || []
    const config = TYPE_CONFIG[resolution.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.UNCONTESTED
    const Icon = config.icon

    // Determine the action label and details
    const primaryVote = votes[0]?.vote
    const voteBadge = VOTE_UP_LABEL(resolution.type, votes)

    return (
        <div className="flex items-start gap-4 px-6 py-4 border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-colors">
            {/* Icon */}
            <div className={`w-9 h-9 rounded-xl ${config.bgColor} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                <Icon size={15} className={config.iconColor} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                {/* Title row */}
                <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-sm text-gray-900">
                        {resolution.type === 'UNCONTESTED' && data.playerName
                            ? data.playerName
                            : resolution.type === 'MERGE'
                            ? 'Category Merge'
                            : 'Category Split'}
                    </span>

                    {/* Vote badge */}
                    {voteBadge && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${voteBadge.className}`}>
                            {voteBadge.label}
                        </span>
                    )}
                </div>

                {/* Detail row */}
                <div className="text-xs text-gray-500 space-y-0.5">
                    {/* Uncontested: category transition */}
                    {resolution.type === 'UNCONTESTED' && data.sourceCategoryName && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-gray-400">{data.sourceCategoryName}</span>
                            {data.targetCategoryName && (
                                <>
                                    <ArrowRight size={10} className="text-gray-400" />
                                    <span className="font-medium text-gray-600">{data.targetCategoryName}</span>
                                </>
                            )}
                        </div>
                    )}
                    {/* Merge: source → target */}
                    {resolution.type === 'MERGE' && data.sourceCategoryId && (
                        <div className="text-gray-400">Category restructured</div>
                    )}
                    {/* Vote record */}
                    {votes.length > 0 && (
                        <div className="text-gray-400">
                            {votes.length === 1
                                ? `1 club voted`
                                : `${votes.filter(v => v.vote === 'AGREE').length} Agree · ${votes.filter(v => v.vote === 'DISAGREE').length} Disagree`}
                        </div>
                    )}
                    {votes.length === 0 && (
                        <div className="text-gray-400 italic">Force executed by organizer</div>
                    )}
                </div>
            </div>

            {/* Timestamp */}
            <div className="text-[11px] text-gray-400 font-medium flex-shrink-0 whitespace-nowrap mt-0.5">
                {formatDate(resolution.updatedAt)}
            </div>
        </div>
    )
}

function VOTE_UP_LABEL(type: string, votes: { vote: string }[]): { label: string; className: string } | null {
    if (type === 'UNCONTESTED' && votes.length > 0) {
        return VOTE_BADGE[votes[0].vote] || null
    }
    if ((type === 'MERGE' || type === 'SPLIT') && votes.length > 0) {
        const agrees = votes.filter(v => v.vote === 'AGREE').length
        const total = votes.length
        if (agrees === total) return VOTE_BADGE.AGREE
        if (agrees === 0) return VOTE_BADGE.DISAGREE
        return { label: `${agrees}/${total} Agreed`, className: 'bg-amber-100 text-amber-800' }
    }
    if (votes.length === 0) return VOTE_BADGE.FORCE
    return null
}

export default function ResolutionHistory({ tournamentId }: ResolutionHistoryProps) {
    const { data, isLoading } = useQuery({
        queryKey: ['resolution-history', tournamentId],
        queryFn: () => getResolutionHistory(tournamentId),
        staleTime: 1000 * 60, // 1 min
    })

    const resolutions = data || []

    return (
        <div className="w-full animate-in fade-in duration-300">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Resolution History</h1>
                <p className="text-gray-500 mt-1">
                    Audit log of all smart alert resolutions. Each entry records the club's consent and timestamp.
                </p>
            </div>

            {/* Stats bar */}
            {!isLoading && resolutions.length > 0 && (
                <div className="grid grid-cols-3 gap-4 mb-6">
                    {[
                        {
                            label: 'Total Resolutions',
                            value: resolutions.length,
                            color: 'text-gray-900',
                            bg: 'bg-white',
                        },
                        {
                            label: 'Uncontested Resolved',
                            value: resolutions.filter(r => r.type === 'UNCONTESTED').length,
                            color: 'text-amber-700',
                            bg: 'bg-amber-50',
                        },
                        {
                            label: 'Merges & Splits',
                            value: resolutions.filter(r => r.type === 'MERGE' || r.type === 'SPLIT').length,
                            color: 'text-purple-700',
                            bg: 'bg-purple-50',
                        },
                    ].map(stat => (
                        <div key={stat.label} className={`${stat.bg} border border-gray-100 rounded-xl p-4`}>
                            <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
                            <div className="text-xs text-gray-500 font-medium mt-1">{stat.label}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Log card */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                {/* Card header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <ClipboardCheck size={15} className="text-gray-400" />
                        <span className="text-sm font-semibold text-gray-700">Audit Log</span>
                        {!isLoading && (
                            <span className="text-xs font-bold px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                                {resolutions.length} entries
                            </span>
                        )}
                    </div>
                    <span className="text-xs text-gray-400">Protected · Cannot be deleted</span>
                </div>

                {/* Log entries */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
                        <Loader2 size={18} className="animate-spin" />
                        <span className="text-sm font-medium">Loading history...</span>
                    </div>
                ) : resolutions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                            <AlertCircle size={22} className="text-gray-300" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-600">No resolutions yet</p>
                            <p className="text-xs text-gray-400 mt-1">
                                Resolved alerts will appear here with a full audit trail.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {resolutions.map((r) => (
                            <ResolutionRow key={r.id} resolution={r} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
