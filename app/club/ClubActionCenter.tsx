import { submitClubDecision } from '@/app/actions'
import { AlertCircle, Check, X, ShieldAlert, Users, Split, Merge, ArrowRight, Clock, Trophy } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface ClubActionCenterModalProps {
    isOpen: boolean
    onClose: () => void
    clubId: string
    proposals: any[]
    onRefresh: () => void
}

const ITEMS_PER_PAGE = 10

export default function ClubActionCenterModal({ isOpen, onClose, clubId, proposals, onRefresh }: ClubActionCenterModalProps) {
    const [page, setPage] = useState(1)

    if (!isOpen) return null

    const hasProposals = proposals && proposals.length > 0;
    const totalPages = Math.ceil(proposals.length / ITEMS_PER_PAGE)

    // Get current page items
    const currentProposals = proposals.slice(
        (page - 1) * ITEMS_PER_PAGE,
        page * ITEMS_PER_PAGE
    )

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`bg-white rounded-2xl shadow-2xl w-full flex flex-col h-[85vh] overflow-hidden transition-all ${hasProposals ? 'max-w-7xl' : 'max-w-md h-auto'}`}>
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                            Action Center
                            {hasProposals && <span className="bg-red-100 text-red-600 text-sm px-2.5 py-0.5 rounded-full font-bold">{proposals.length}</span>}
                        </h2>
                        <p className="text-gray-500 mt-1">Manage requests and decisions for upcoming tournaments.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto bg-gray-50 flex flex-col">
                    {hasProposals ? (
                        <>
                            <div className="min-w-[1000px] flex-1">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-100/50 sticky top-0 z-10 border-b border-gray-200 text-gray-500 font-semibold text-xs uppercase tracking-wider shadow-sm">
                                        <tr>
                                            <th className="px-8 py-4 w-48 bg-gray-50">Type</th>
                                            <th className="px-6 py-4 w-64 bg-gray-50">Tournament</th>
                                            <th className="px-6 py-4 bg-gray-50">Details</th>
                                            <th className="px-6 py-4 w-40 text-center bg-gray-50">Status</th>
                                            <th className="px-8 py-4 w-80 text-right bg-gray-50">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                        {currentProposals.map((proposal: any) => (
                                            <ClubProposalRow
                                                key={proposal.id}
                                                proposal={proposal}
                                                clubId={clubId}
                                                onVoted={onRefresh}
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
                            <div className="inline-flex items-center justify-center w-24 h-24 bg-green-50 rounded-full mb-6 ring-8 ring-green-50/50">
                                <Check size={48} className="text-green-600" strokeWidth={3} />
                            </div>
                            <h4 className="text-gray-900 font-bold text-2xl mb-2">All Caught Up!</h4>
                            <p className="text-gray-500 max-w-sm text-center leading-relaxed mb-8">
                                You have no pending actions. We'll notify you when an organizer needs your input on a tournament matter.
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

function ClubProposalRow({ proposal, clubId, onVoted }: { proposal: any, clubId: string, onVoted: () => void }) {
    const [loading, setLoading] = useState(false)
    const [showMoveUpConfirm, setShowMoveUpConfirm] = useState(false)
    const data = JSON.parse(proposal.data)
    const myVote = proposal.myVote

    const handleVote = async (vote: string) => {
        setLoading(true)
        try {
            await submitClubDecision(proposal.id, clubId, vote)
            toast.success("Response recorded")
            onVoted()
        } catch (e) {
            toast.error("Failed to submit response")
        } finally {
            setLoading(false)
        }
    }

    // Colors and Labels helpters
    const getBadgeInfo = () => {
        switch (proposal.type) {
            case 'UNCONTESTED':
                return { label: 'Uncontested', icon: ShieldAlert, color: 'text-yellow-700 bg-yellow-50 border-yellow-200' }
            case 'MERGE':
                return { label: 'Merge Proposal', icon: Merge, color: 'text-purple-700 bg-purple-50 border-purple-200' }
            case 'SPLIT':
                return { label: 'Split Proposal', icon: Split, color: 'text-blue-700 bg-blue-50 border-blue-200' }
            default:
                return { label: 'Notice', icon: AlertCircle, color: 'text-gray-700 bg-gray-50 border-gray-200' }
        }
    }

    const { label, icon: Icon, color } = getBadgeInfo()

    return (
        <tr className="hover:bg-gray-50/80 transition-colors group">
            {/* Type Column */}
            <td className="px-8 py-4 align-top">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border uppercase tracking-wide ${color}`}>
                    <Icon size={12} />
                    {label}
                </span>
            </td>

            {/* Tournament Column */}
            <td className="px-6 py-4 align-top max-w-[200px]">
                <div className="group/tooltip relative w-fit max-w-full">
                    <div className="font-bold text-gray-900 text-sm truncate cursor-help">
                        {proposal.tournament.name}
                    </div>
                    {/* Custom Tooltip */}
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover/tooltip:block w-max max-w-[250px] bg-gray-900 text-white text-xs rounded-lg px-3 py-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200 pointer-events-none">
                        {proposal.tournament.name}
                        {/* Arrow */}
                        <div className="absolute left-4 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-900"></div>
                    </div>
                </div>
            </td>

            {/* Details Column */}
            <td className="px-6 py-4 align-top">
                {proposal.type === 'UNCONTESTED' && (
                    <div className="space-y-1.5">
                        <p className="text-gray-900 font-semibold text-sm">{data.playerName || 'Unknown Athlete'}</p>
                        {data.sourceCategoryName && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-medium truncate max-w-[160px]" title={data.sourceCategoryName}>
                                    {data.sourceCategoryName}
                                </span>
                                {data.targetCategoryName ? (
                                    <>
                                        <ArrowRight size={12} className="text-gray-400 flex-shrink-0" />
                                        <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded font-bold truncate max-w-[160px]" title={data.targetCategoryName}>
                                            {data.targetCategoryName}
                                        </span>
                                        <span className="text-[10px] text-gray-400 italic">if Move Up</span>
                                    </>
                                ) : (
                                    <span className="text-[10px] text-amber-600 italic">No heavier category available</span>
                                )}
                            </div>
                        )}
                    </div>
                )}
                {proposal.type === 'MERGE' && (
                    <div>
                        <p className="text-gray-900 font-medium text-sm">Category Merger</p>
                    </div>
                )}
                {proposal.type === 'SPLIT' && (
                    <div>
                        <p className="text-gray-900 font-medium text-sm">Category Split</p>
                    </div>
                )}
            </td>

            {/* Status Column */}
            <td className="px-6 py-4 align-top text-center">
                {myVote ? (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${myVote === 'AGREE' || myVote === 'MOVE_UP' || myVote === 'WALKOVER'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                        }`}>
                        <Check size={12} strokeWidth={3} />
                        Completed
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 animate-pulse">
                        <Clock size={12} />
                        Pending
                    </span>
                )}
            </td>

            {/* Actions Column */}
            <td className="px-8 py-4 align-top text-right">
                {!myVote ? (
                    <div className="flex justify-end gap-2">
                        {proposal.type === 'UNCONTESTED' && (
                            <>
                                <button
                                    onClick={() => setShowMoveUpConfirm(true)}
                                    disabled={loading}
                                    className="px-3 py-1.5 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded-lg text-xs font-bold transition"
                                >
                                    Move Up
                                </button>

                                {/* Move Up Confirmation Dialog */}
                                {showMoveUpConfirm && (
                                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="p-2 bg-yellow-100 rounded-xl">
                                                    <ArrowRight size={20} className="text-yellow-700" />
                                                </div>
                                                <h3 className="text-lg font-bold text-gray-900">Confirm Move Up</h3>
                                            </div>

                                            <p className="text-sm text-gray-600 mb-5 leading-relaxed">
                                                <span className="font-semibold text-gray-900">{data.playerName}</span> will be moved to a heavier category.
                                            </p>

                                            {/* Source → Target */}
                                            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-6">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">From</p>
                                                    <p className="text-sm font-semibold text-gray-700 truncate" title={data.sourceCategoryName}>
                                                        {data.sourceCategoryName || 'Current Category'}
                                                    </p>
                                                </div>
                                                <ArrowRight size={18} className="text-gray-400 flex-shrink-0" />
                                                <div className="flex-1 min-w-0 text-right">
                                                    <p className="text-[10px] text-green-600 uppercase font-bold tracking-wider mb-0.5">To</p>
                                                    <p className="text-sm font-bold text-green-700 truncate" title={data.targetCategoryName}>
                                                        {data.targetCategoryName || 'Next Category'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => setShowMoveUpConfirm(false)}
                                                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={() => { setShowMoveUpConfirm(false); handleVote('MOVE_UP') }}
                                                    disabled={loading}
                                                    className="flex-1 px-4 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-sm font-bold text-white transition shadow-sm disabled:opacity-50"
                                                >
                                                    Proceed
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <button
                                    onClick={() => handleVote('WALKOVER')}
                                    disabled={loading}
                                    className="px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-xs font-bold transition"
                                >
                                    Walkover
                                </button>
                                <button
                                    onClick={() => handleVote('WITHDRAW')}
                                    disabled={loading}
                                    className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-xs font-bold transition"
                                >
                                    Withdraw
                                </button>
                            </>
                        )}
                        {(proposal.type === 'MERGE' || proposal.type === 'SPLIT') && (
                            <>
                                <button
                                    onClick={() => handleVote('AGREE')}
                                    disabled={loading}
                                    className="px-4 py-1.5 bg-gray-900 text-white hover:bg-gray-800 rounded-lg text-xs font-bold transition"
                                >
                                    Agree
                                </button>
                                <button
                                    onClick={() => handleVote('DISAGREE')}
                                    disabled={loading}
                                    className="px-4 py-1.5 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-bold transition"
                                >
                                    Disagree
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="text-sm font-medium text-gray-900">
                        Voted: <span className="font-bold">{myVote}</span>
                    </div>
                )}
            </td>
        </tr>
    )
}
