'use client'

import { useState } from 'react'
import { X, Check, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { approveClub, rejectClub } from '@/app/organization/actions'

interface ClubData {
    id: string
    name: string
    logoUrl: string | null
    masterName: string
    memberCount: number
    contactPhone: string | null
    address: string | null
    status: string
}

interface PendingClubsModalProps {
    isOpen: boolean
    onClose: () => void
    pendingClubs: ClubData[]
}

export default function PendingClubsModal({ isOpen, onClose, pendingClubs }: PendingClubsModalProps) {
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    if (!isOpen) return null

    const handleApprove = async (clubId: string) => {
        setActionLoading(clubId)
        try {
            await approveClub(clubId)
            toast.success('Club approved successfully')
        } catch (error) {
            toast.error('Failed to approve club')
        } finally {
            setActionLoading(null)
        }
    }

    const handleReject = async (clubId: string) => {
        if (!confirm('Are you sure you want to reject this club?')) return
        setActionLoading(clubId)
        try {
            await rejectClub(clubId)
            toast.success('Club rejected')
        } catch (error) {
            toast.error('Failed to reject club')
        } finally {
            setActionLoading(null)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-yellow-50 to-orange-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
                            <span className="text-xl">⏳</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Pending Club Approvals</h2>
                            <p className="text-sm text-gray-500">{pendingClubs.length} club{pendingClubs.length !== 1 ? 's' : ''} awaiting review</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[60vh]">
                    {pendingClubs.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check className="w-8 h-8 text-green-500" />
                            </div>
                            <h3 className="font-bold text-gray-900 mb-2">All Caught Up!</h3>
                            <p className="text-gray-500 text-sm">No pending club requests to review.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {pendingClubs.map((club) => (
                                <div key={club.id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            {club.logoUrl ? (
                                                <img
                                                    src={club.logoUrl}
                                                    alt={club.name}
                                                    className="w-12 h-12 rounded-xl object-cover border border-gray-200"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                                                    <Building2 className="w-6 h-6 text-indigo-500" />
                                                </div>
                                            )}
                                            <div>
                                                <h3 className="font-bold text-gray-900">{club.name}</h3>
                                                <p className="text-sm text-gray-500">{club.masterName}</p>
                                                <p className="text-xs text-gray-400 mt-1">{club.address || 'No location provided'}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleApprove(club.id)}
                                                disabled={!!actionLoading}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                            >
                                                {actionLoading === club.id ? (
                                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <Check size={16} />
                                                )}
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleReject(club.id)}
                                                disabled={!!actionLoading}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                                            >
                                                <X size={16} />
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
