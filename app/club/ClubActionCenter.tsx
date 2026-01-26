'use client'

import { submitClubDecision } from '@/app/actions'
import { AlertCircle, Check, X, ShieldAlert, Users, Split, Merge } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface ClubActionCenterModalProps {
    isOpen: boolean
    onClose: () => void
    clubId: string
    proposals: any[]
    onRefresh: () => void
}

export default function ClubActionCenterModal({ isOpen, onClose, clubId, proposals, onRefresh }: ClubActionCenterModalProps) {
    if (!isOpen) return null

    const hasProposals = proposals && proposals.length > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className={`bg-white rounded-2xl shadow-xl w-full flex flex-col max-h-[90vh] overflow-hidden transition-all ${hasProposals ? 'max-w-4xl' : 'max-w-md'}`}>
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-red-100 text-red-600 rounded-lg">
                            <AlertCircle size={18} />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">Action Center</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto bg-gray-50/50">
                    {hasProposals ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {proposals.map((proposal: any) => (
                                <ClubProposalCard
                                    key={proposal.id}
                                    proposal={proposal}
                                    clubId={clubId}
                                    onVoted={onRefresh}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 rounded-full mb-4 ring-4 ring-green-50/50">
                                <Check size={32} className="text-green-600" />
                            </div>
                            <h4 className="text-gray-900 font-bold text-lg">All Caught Up!</h4>
                            <p className="text-gray-500 text-sm mt-1">There are no pending actions for you to take.</p>
                            <button
                                onClick={onClose}
                                className="mt-6 px-6 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition shadow-lg shadow-gray-200"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function ClubProposalCard({ proposal, clubId, onVoted }: { proposal: any, clubId: string, onVoted: () => void }) {
    const [loading, setLoading] = useState(false)
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

    // Render Content Based on Type
    if (proposal.type === 'UNCONTESTED') {
        return (
            <div className="bg-white border border-yellow-200 rounded-xl p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500"></div>
                <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-bold text-yellow-700 bg-yellow-50 px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-yellow-100">
                        <ShieldAlert size={12} /> UNCONTESTED
                    </span>
                    <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-md">{proposal.tournament.name}</span>
                </div>

                <h4 className="font-bold text-gray-900 mb-2">Uncontested Athlete</h4>
                <p className="text-sm text-gray-600 mb-5 leading-relaxed">
                    Your player <span className="font-semibold text-gray-900">{data.playerName || 'Unknown'}</span> is the only one in their category.
                </p>

                {!myVote ? (
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => handleVote('MOVE_UP')}
                            disabled={loading}
                            className="flex-1 px-3 py-2.5 bg-yellow-500 text-white rounded-xl text-xs font-bold hover:bg-yellow-600 transition shadow-sm"
                        >
                            Move Up
                        </button>
                        <button
                            onClick={() => handleVote('WALKOVER')}
                            disabled={loading}
                            className="flex-1 px-3 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 hover:border-gray-300 transition shadow-sm"
                        >
                            Walkover
                        </button>
                        <button
                            onClick={() => handleVote('WITHDRAW')}
                            disabled={loading}
                            className="flex-1 px-3 py-2.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition border border-transparent hover:border-red-200"
                        >
                            Withdraw
                        </button>
                    </div>
                ) : (
                    <div className="text-sm font-medium text-gray-500 bg-gray-50 p-3 rounded-xl text-center border border-gray-100">
                        You selected: <span className="text-gray-900 font-bold">{myVote}</span>
                    </div>
                )}
            </div>
        )
    }

    if (proposal.type === 'MERGE' || proposal.type === 'SPLIT') {
        const isMerge = proposal.type === 'MERGE'
        const colorClass = isMerge ? 'purple' : 'blue'

        return (
            <div className={`bg-white border ${isMerge ? 'border-purple-200' : 'border-blue-200'} rounded-xl p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-all`}>
                <div className={`absolute top-0 left-0 w-1 h-full ${isMerge ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                <div className="flex justify-between items-start mb-3">
                    <span className={`text-xs font-bold ${isMerge ? 'text-purple-700 bg-purple-50 border-purple-100' : 'text-blue-700 bg-blue-50 border-blue-100'} border px-2.5 py-1 rounded-full flex items-center gap-1.5`}>
                        {isMerge ? <Merge size={12} /> : <Split size={12} />}
                        {isMerge ? 'MERGE PROPOSAL' : 'SPLIT PROPOSAL'}
                    </span>
                    <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-md">{proposal.tournament.name}</span>
                </div>

                <p className="text-sm text-gray-600 mb-5 leading-relaxed">
                    {isMerge
                        ? "The organizer proposes merging this category with a heavier weight class due to low participation."
                        : "The organizer proposes splitting this large category into groups."
                    }
                </p>

                {!myVote ? (
                    <div className="flex gap-2.5">
                        <button
                            onClick={() => handleVote('AGREE')}
                            disabled={loading}
                            className="flex-1 px-3 py-2.5 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition flex items-center justify-center gap-1.5 shadow-sm shadow-green-100"
                        >
                            <Check size={14} strokeWidth={3} /> Agree
                        </button>
                        <button
                            onClick={() => handleVote('DISAGREE')}
                            disabled={loading}
                            className="flex-1 px-3 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 hover:border-gray-300 transition flex items-center justify-center gap-1.5 shadow-sm"
                        >
                            <X size={14} strokeWidth={3} /> Disagree
                        </button>
                    </div>
                ) : (
                    <div className="text-sm font-medium text-gray-500 bg-gray-50 p-3 rounded-xl text-center border border-gray-100">
                        You voted: <span className={`font-bold ${myVote === 'AGREE' ? 'text-green-600' : 'text-red-600'}`}>{myVote}</span>
                    </div>
                )}
            </div>
        )
    }

    return null
}
