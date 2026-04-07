'use client'

import { submitClubDecision } from '@/app/actions'
import {
    AlertCircle, Check, X, ShieldAlert, Users, Split, Merge,
    ArrowRight, Clock, Trophy, ChevronLeft, ChevronRight, Zap
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface ClubActionCenterModalProps {
    isOpen: boolean
    onClose: () => void
    clubId: string
    proposals: any[]
    onRefresh: () => void
}

const ITEMS_PER_PAGE = 5

export default function ClubActionCenterModal({ isOpen, onClose, clubId, proposals, onRefresh }: ClubActionCenterModalProps) {
    const [page, setPage] = useState(1)

    if (!isOpen) return null

    const hasProposals = proposals && proposals.length > 0
    const totalPages   = Math.ceil(proposals.length / ITEMS_PER_PAGE)
    const currentItems = proposals.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`bg-white rounded-3xl shadow-2xl w-full flex flex-col overflow-hidden transition-all ${hasProposals ? 'max-w-3xl max-h-[90vh]' : 'max-w-md'}`}>

                {/* ── Header ──────────────────────────────────────────────── */}
                <div className="relative bg-gray-900 px-8 py-6 flex-shrink-0 overflow-hidden">
                    {/* Decorative glow */}
                    <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-red-600/20 blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 blur-2xl pointer-events-none" />

                    <div className="relative flex items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
                                    <Zap size={16} className="text-red-400" />
                                </div>
                                <h2 className="text-xl font-black text-white tracking-tight">Action Center</h2>
                                {hasProposals && (
                                    <span className="bg-red-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full shadow-lg shadow-red-500/30">
                                        {proposals.length}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-white/50 ml-12">
                                Review and respond to tournament proposals that require your decision.
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="flex-shrink-0 mt-0.5 w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                        >
                            <X size={16} className="text-white/70" />
                        </button>
                    </div>
                </div>

                {/* ── Content ─────────────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto bg-gray-50">
                    {hasProposals ? (
                        <div className="p-6 space-y-4">
                            {currentItems.map((proposal: any) => (
                                <ClubProposalCard
                                    key={proposal.id}
                                    proposal={proposal}
                                    clubId={clubId}
                                    onVoted={onRefresh}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 px-8">
                            <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mb-5 ring-8 ring-emerald-50/60 shadow-xl shadow-emerald-100">
                                <Check size={36} className="text-emerald-500" strokeWidth={2.5} />
                            </div>
                            <h4 className="text-gray-900 font-black text-2xl mb-2">All Caught Up!</h4>
                            <p className="text-gray-400 text-sm text-center max-w-xs leading-relaxed mb-8">
                                No pending actions. You'll be notified when an organizer needs your input.
                            </p>
                            <button
                                onClick={onClose}
                                className="px-8 py-3 bg-gray-900 text-white font-bold rounded-2xl hover:bg-gray-800 transition-all shadow-xl shadow-gray-300 active:scale-95 text-sm"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Pagination ──────────────────────────────────────────── */}
                {hasProposals && totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-100 bg-white flex-shrink-0 flex items-center justify-between">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-all"
                        >
                            <ChevronLeft size={15} /> Previous
                        </button>
                        <span className="text-sm font-black text-gray-400 tabular-nums">
                            {page} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-all"
                        >
                            Next <ChevronRight size={15} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Proposal Card
// ─────────────────────────────────────────────────────────────────────────────

function ClubProposalCard({ proposal, clubId, onVoted }: { proposal: any; clubId: string; onVoted: () => void }) {
    const [loading, setLoading]               = useState(false)
    const [showMoveConfirm, setShowMoveConfirm] = useState(false)

    const data    = JSON.parse(proposal.data)
    const myVote  = proposal.myVote

    const handleVote = async (vote: string) => {
        setLoading(true)
        try {
            await submitClubDecision(proposal.id, clubId, vote)
            toast.success('Response recorded')
            onVoted()
        } catch {
            toast.error('Failed to submit response')
        } finally {
            setLoading(false)
        }
    }

    // ── Badge config ──────────────────────────────────────────────────────────
    const BADGE: Record<string, { label: string; icon: React.ElementType; accent: string; headerBg: string; pillBg: string; pillText: string }> = {
        UNCONTESTED: {
            label: 'Uncontested Athlete',
            icon: ShieldAlert,
            accent: 'bg-amber-400',
            headerBg: 'bg-amber-50',
            pillBg: 'bg-amber-100',
            pillText: 'text-amber-800',
        },
        MERGE: {
            label: 'Merge Proposal',
            icon: Merge,
            accent: 'bg-purple-500',
            headerBg: 'bg-purple-50',
            pillBg: 'bg-purple-100',
            pillText: 'text-purple-800',
        },
        SPLIT: {
            label: 'Split Proposal',
            icon: Split,
            accent: 'bg-blue-500',
            headerBg: 'bg-blue-50',
            pillBg: 'bg-blue-100',
            pillText: 'text-blue-800',
        },
    }

    const cfg = BADGE[proposal.type] ?? {
        label: 'Notice', icon: AlertCircle, accent: 'bg-gray-400',
        headerBg: 'bg-gray-50', pillBg: 'bg-gray-100', pillText: 'text-gray-800',
    }
    const BadgeIcon = cfg.icon

    return (
        <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow ${myVote ? 'opacity-70' : ''}`}>

            {/* ── Card header ────────────────────────────────────── */}
            <div className={`${cfg.headerBg} px-5 py-3.5 flex items-center justify-between border-b border-gray-100`}>
                <div className="flex items-center gap-2.5">
                    <div className={`w-6 h-6 rounded-lg ${cfg.pillBg} flex items-center justify-center`}>
                        <BadgeIcon size={13} className={cfg.pillText} />
                    </div>
                    <span className={`text-xs font-black uppercase tracking-widest ${cfg.pillText}`}>
                        {cfg.label}
                    </span>
                </div>

                {/* Status badge */}
                {myVote ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-700">
                        <Check size={11} strokeWidth={3} /> Responded · {myVote.replace('_', ' ')}
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-700 animate-pulse">
                        <Clock size={11} /> Awaiting Response
                    </span>
                )}
            </div>

            {/* ── Card body ──────────────────────────────────────── */}
            <div className="px-5 py-4 space-y-4">

                {/* Tournament */}
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tournament</p>
                    <p className="text-sm font-bold text-gray-900">{proposal.tournament.name}</p>
                </div>

                {/* UNCONTESTED details */}
                {proposal.type === 'UNCONTESTED' && (
                    <>
                        {/* Athlete */}
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Athlete</p>
                            <p className="text-base font-black text-gray-900">{data.playerName || 'Unknown'}</p>
                            {data.clubName && (
                                <p className="text-xs text-gray-400 mt-0.5">{data.clubName}</p>
                            )}
                        </div>

                        {/* Current category */}
                        <div className="rounded-xl bg-gray-50 border border-gray-100 p-3.5">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Current Category</p>
                            <p className="text-sm font-bold text-gray-800 leading-snug">
                                {data.sourceCategoryName || '—'}
                            </p>
                            <p className="text-[11px] text-amber-600 font-semibold mt-1">
                                ⚠ Only athlete in this category — will receive walkover gold if no action is taken.
                            </p>
                        </div>

                        {/* Proposed move */}
                        {data.targetCategoryName ? (
                            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1.5">
                                    If Moved Up → Target Category
                                </p>
                                <p className="text-sm font-bold text-emerald-800 leading-snug">
                                    {data.targetCategoryName}
                                </p>
                                <p className="text-[11px] text-emerald-600 font-medium mt-1">
                                    Athlete will compete against existing registered athletes in this category.
                                </p>
                            </div>
                        ) : (
                            <div className="rounded-xl bg-gray-50 border border-dashed border-gray-200 p-3.5">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Move Up Option</p>
                                <p className="text-xs text-gray-500 italic">No heavier category available in the same division.</p>
                            </div>
                        )}
                    </>
                )}

                {/* MERGE details */}
                {proposal.type === 'MERGE' && (
                    <>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-xl bg-gray-50 border border-gray-100 p-3.5">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Source Category</p>
                                <p className="text-sm font-bold text-gray-800 leading-snug">
                                    {data.sourceCategoryName || '—'}
                                </p>
                                {data.players && (
                                    <p className="text-[11px] text-gray-500 mt-1">{data.players.length} athlete{data.players.length !== 1 ? 's' : ''}</p>
                                )}
                            </div>
                            <div className="rounded-xl bg-purple-50 border border-purple-200 p-3.5">
                                <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-1.5">Merge Into</p>
                                <p className="text-sm font-bold text-purple-800 leading-snug">
                                    {data.targetCategoryName || '—'}
                                </p>
                                {data.combinedCount && (
                                    <p className="text-[11px] text-purple-600 mt-1">Combined: {data.combinedCount} athletes</p>
                                )}
                            </div>
                        </div>
                        {data.players && data.players.length > 0 && (
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Athletes Affected</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {data.players.map((p: any) => (
                                        <span key={p.id} className="text-xs font-semibold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg">
                                            {p.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* SPLIT details */}
                {proposal.type === 'SPLIT' && (
                    <>
                        <div className="rounded-xl bg-blue-50 border border-blue-200 p-3.5">
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1.5">Category to Split</p>
                            <p className="text-sm font-bold text-blue-800 leading-snug">
                                {proposal.categoryName}
                            </p>
                            {data.playerCount && (
                                <p className="text-[11px] text-blue-600 mt-1">{data.playerCount} athletes — too many for a single bracket.</p>
                            )}
                        </div>
                        {data.players && data.players.length > 0 && (
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Athletes in This Category</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {data.players.map((p: any) => (
                                        <span key={p.id} className="text-xs font-semibold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg">
                                            {p.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── Actions footer ─────────────────────────────────── */}
            {!myVote && (
                <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2.5">
                    {proposal.type === 'UNCONTESTED' && (
                        <>
                            {data.targetCategoryName && (
                                <button
                                    onClick={() => setShowMoveConfirm(true)}
                                    disabled={loading}
                                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition-all shadow-sm shadow-amber-200 disabled:opacity-50 flex items-center gap-1.5"
                                >
                                    <ArrowRight size={13} /> Move Up
                                </button>
                            )}
                            <button
                                onClick={() => handleVote('WALKOVER')}
                                disabled={loading}
                                className="px-4 py-2.5 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-xl text-xs font-black transition-all"
                            >
                                Walkover Gold
                            </button>
                            <button
                                onClick={() => handleVote('WITHDRAW')}
                                disabled={loading}
                                className="px-4 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl text-xs font-black transition-all"
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
                                className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-black transition-all shadow-sm"
                            >
                                Agree
                            </button>
                            <button
                                onClick={() => handleVote('DISAGREE')}
                                disabled={loading}
                                className="px-5 py-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-xs font-black transition-all"
                            >
                                Disagree
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* ── Move Up Confirmation Dialog ────────────────────── */}
            {showMoveConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">

                        {/* Dialog header */}
                        <div className="bg-amber-500 px-6 py-5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                                    <ArrowRight size={20} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-white">Confirm Move Up</h3>
                                    <p className="text-xs text-amber-100 mt-0.5">This will reassign the athlete's category</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Athlete */}
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Athlete</p>
                                <p className="text-base font-black text-gray-900">{data.playerName}</p>
                            </div>

                            {/* From → To */}
                            <div className="space-y-2">
                                <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">From</p>
                                    <p className="text-sm font-bold text-gray-800">{data.sourceCategoryName}</p>
                                </div>
                                <div className="flex justify-center">
                                    <div className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center">
                                        <ArrowRight size={14} className="text-amber-600" />
                                    </div>
                                </div>
                                <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">To</p>
                                    <p className="text-sm font-bold text-emerald-800">{data.targetCategoryName}</p>
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3 pt-1">
                                <button
                                    onClick={() => setShowMoveConfirm(false)}
                                    className="flex-1 px-4 py-2.5 rounded-2xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => { setShowMoveConfirm(false); handleVote('MOVE_UP') }}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-sm font-black text-white transition shadow-sm shadow-amber-200 disabled:opacity-50"
                                >
                                    Confirm Move Up
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
