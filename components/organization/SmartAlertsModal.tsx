'use client'

import { useState } from 'react'
import { X, Sparkles, ShieldAlert, Split, Merge, Trophy, Clock, Check, AlertCircle, Search } from 'lucide-react'
import { initiateSmartProposal, forceExecuteSmartAction } from '@/app/actions'
import { toast } from 'sonner'

interface SmartAlertsModalProps {
    isOpen: boolean
    onClose: () => void
    alerts: any[]
}

const ITEMS_PER_PAGE = 10

export default function SmartAlertsModal({ isOpen, onClose, alerts }: SmartAlertsModalProps) {
    const [page, setPage] = useState(1)
    const [searchQuery, setSearchQuery] = useState('')

    if (!isOpen) return null

    // Flatten alerts from all tournaments into a single list
    const allAlerts = alerts.flatMap((group: any) =>
        group.alerts.map((alert: any) => {
            const proposal = group.proposals.find((p: any) => {
                const data = JSON.parse(p.data)
                if (p.type === 'UNCONTESTED' && alert.type === 'UNCONTESTED') return data.playerId === alert.details.playerId
                if (p.type === 'MERGE' && alert.type === 'MERGE_SUGGESTION') return data.sourceCategoryId === alert.categoryId
                if (p.type === 'SPLIT' && alert.type === 'SPLIT_SUGGESTION') return data.categoryId === alert.categoryId
                return false
            })

            return {
                ...alert,
                tournamentName: group.tournamentName,
                tournamentId: group.tournamentId,
                proposal
            }
        })
    )

    // Filter by search query across all alerts (before pagination)
    const q = searchQuery.toLowerCase().trim()
    const filteredAlerts = q
        ? allAlerts.filter((a: any) =>
            a.tournamentName?.toLowerCase().includes(q) ||
            a.categoryName?.toLowerCase().includes(q) ||
            a.message?.toLowerCase().includes(q) ||
            a.type?.toLowerCase().includes(q)
        )
        : allAlerts

    const totalPages = Math.ceil(filteredAlerts.length / ITEMS_PER_PAGE)
    const currentAlerts = filteredAlerts.slice(
        (page - 1) * ITEMS_PER_PAGE,
        page * ITEMS_PER_PAGE
    )

    const hasAlerts = allAlerts.length > 0

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`bg-white rounded-2xl shadow-2xl w-full flex flex-col h-[85vh] overflow-hidden transition-all ${hasAlerts ? 'max-w-7xl' : 'max-w-md h-auto'}`}>

                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                            Optimization Suggestions
                            {hasAlerts && <span className="bg-indigo-100 text-indigo-700 text-sm px-2.5 py-0.5 rounded-full font-bold">{filteredAlerts.length}</span>}
                        </h2>
                        <p className="text-gray-500 mt-1">Review AI-driven recommendations to improve tournament quality.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Search Bar */}
                {hasAlerts && (
                    <div className="px-8 py-3 border-b border-gray-100 bg-white flex-shrink-0">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search suggestions by tournament, category, or type..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value)
                                    setPage(1)
                                }}
                                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                            />
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-auto bg-gray-50 flex flex-col">
                    {hasAlerts ? (
                        <>
                            <div className="min-w-[1000px] flex-1">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-100/50 sticky top-0 z-10 border-b border-gray-200 text-gray-500 font-semibold text-xs uppercase tracking-wider shadow-sm">
                                        <tr>
                                            <th className="px-8 py-4 w-48 bg-gray-50">Type</th>
                                            <th className="px-6 py-4 w-64 bg-gray-50">Tournament</th>
                                            <th className="px-6 py-4 bg-gray-50">Reason</th>
                                            <th className="px-6 py-4 w-40 text-center bg-gray-50">Status</th>
                                            <th className="px-8 py-4 w-64 text-right bg-gray-50">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                        {currentAlerts.map((alert: any, idx: number) => (
                                            <SmartAlertRow
                                                key={`${alert.tournamentId}-${alert.categoryId}-${idx}`}
                                                alert={alert}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="px-6 py-4 border-t border-gray-200 bg-white flex-shrink-0 flex items-center justify-between">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent transition-all"
                                    >
                                        Previous
                                    </button>
                                    <span className="text-sm font-semibold text-gray-500">
                                        Page {page} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent transition-all"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (

                        <div className="h-full flex flex-col items-center justify-center p-12">
                            <div className="inline-flex items-center justify-center w-24 h-24 bg-indigo-50 rounded-full mb-6 ring-8 ring-indigo-50/50">
                                <Check size={48} className="text-indigo-600" strokeWidth={3} />
                            </div>
                            <h4 className="text-gray-900 font-bold text-2xl mb-2">No Suggestions</h4>
                            <p className="text-gray-500 max-w-sm text-center leading-relaxed mb-8">
                                Everything looks optimized! We'll notify you if we find any potential improvements.
                            </p>
                            <button
                                onClick={onClose}
                                className="px-8 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all shadow-xl shadow-gray-200 active:scale-95"
                            >
                                Close Window
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function SmartAlertRow({ alert }: { alert: any }) {
    const [loading, setLoading] = useState(false)
    const { proposal, tournamentId } = alert
    const isPending = proposal?.status === 'PENDING'

    async function handlePropose(type: string, data: any) {
        setLoading(true)
        try {
            await initiateSmartProposal(tournamentId, type, data)
            toast.success("Action initiated successfully")
        } catch (e) {
            toast.error("Failed to initiate action")
        } finally {
            setLoading(false)
        }
    }

    async function handleForceExecute() {
        if (!proposal) return
        if (!confirm("Are you sure you want to force execute this action? This will override club decisions.")) return
        setLoading(true)
        try {
            await forceExecuteSmartAction(proposal.id)
            toast.success("Action executed successfully")
        } catch (e) {
            toast.error("Failed to execute action")
        } finally {
            setLoading(false)
        }
    }

    // Badge Helpers
    const getBadgeInfo = () => {
        switch (alert.type) {
            case 'UNCONTESTED':
                return { label: 'Uncontested', icon: ShieldAlert, color: 'text-yellow-700 bg-yellow-50 border-yellow-200' }
            case 'MERGE_SUGGESTION':
                return { label: 'Merge Suggestion', icon: Merge, color: 'text-purple-700 bg-purple-50 border-purple-200' }
            case 'SPLIT_SUGGESTION':
                return { label: 'Split Suggestion', icon: Split, color: 'text-blue-700 bg-blue-50 border-blue-200' }
            default:
                return { label: 'Suggestion', icon: AlertCircle, color: 'text-gray-700 bg-gray-50 border-gray-200' }
        }
    }

    const { label, icon: Icon, color } = getBadgeInfo()

    return (
        <tr className="hover:bg-gray-50/80 transition-colors group">
            {/* Type */}
            <td className="px-8 py-4 align-top">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border uppercase tracking-wide ${color}`}>
                    <Icon size={12} />
                    {label}
                </span>
            </td>

            {/* Tournament */}
            <td className="px-6 py-4 align-top max-w-[200px]">
                <div className="group/tooltip relative w-fit max-w-full">
                    <div className="font-bold text-gray-900 text-sm truncate cursor-help">
                        {alert.tournamentName}
                    </div>
                    {/* Custom Tooltip */}
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover/tooltip:block w-max max-w-[250px] bg-gray-900 text-white text-xs rounded-lg px-3 py-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200 pointer-events-none">
                        {alert.tournamentName}
                        {/* Arrow */}
                        <div className="absolute left-4 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-900"></div>
                    </div>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">Optimization</div>
            </td>

            {/* Reason */}
            <td className="px-6 py-4 align-top">
                <div className="text-sm text-gray-900 font-medium">
                    {alert.categoryName}
                </div>
                <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {alert.message}
                </div>
            </td>

            {/* Status */}
            <td className="px-6 py-4 align-top text-center">
                {isPending ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 animate-pulse">
                        <Clock size={12} />
                        Pending
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
                        <Sparkles size={12} />
                        New
                    </span>
                )}
            </td>

            {/* Actions */}
            <td className="px-8 py-4 align-top text-right">
                {!isPending ? (
                    <div className="flex justify-end">
                        {alert.type === 'UNCONTESTED' && (
                            <button
                                onClick={() => handlePropose('UNCONTESTED', { ...alert.details, playerId: alert.details.playerId })}
                                disabled={loading}
                                className="px-4 py-1.5 bg-yellow-600 text-white hover:bg-yellow-700 rounded-lg text-xs font-bold transition shadow-sm"
                            >
                                Resolve
                            </button>
                        )}
                        {alert.type === 'SPLIT_SUGGESTION' && (
                            <button
                                onClick={() => handlePropose('SPLIT', { categoryId: alert.categoryId })}
                                disabled={loading}
                                className="px-4 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-xs font-bold transition shadow-sm"
                            >
                                Split
                            </button>
                        )}
                        {alert.type === 'MERGE_SUGGESTION' && (
                            <button
                                onClick={() => handlePropose('MERGE', { sourceCategoryId: alert.categoryId, targetCategoryId: alert.details.targetCategoryId })}
                                disabled={loading}
                                className="px-4 py-1.5 bg-purple-600 text-white hover:bg-purple-700 rounded-lg text-xs font-bold transition shadow-sm"
                            >
                                Merge
                            </button>
                        )}
                    </div>
                ) : (
                    <button
                        onClick={handleForceExecute}
                        disabled={loading}
                        className="px-4 py-1.5 bg-gray-900 text-white hover:bg-gray-800 rounded-lg text-xs font-bold transition shadow-sm"
                    >
                        {loading ? 'Executing...' : 'Force Execute'}
                    </button>
                )}
            </td>
        </tr>
    )
}
