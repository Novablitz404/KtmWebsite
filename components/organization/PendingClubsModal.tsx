'use client'

import { useState } from 'react'
import { X, Check, Building2, Clock, MapPin, Phone, Users } from 'lucide-react'
import { toast } from 'sonner'
import { approveClub, rejectClub } from '@/app/organization/actions'
import { useQueryClient } from '@tanstack/react-query'

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
    const queryClient = useQueryClient()

    if (!isOpen) return null

    const handleApprove = async (clubId: string) => {
        setActionLoading(clubId)
        try {
            await approveClub(clubId)
            toast.success('Club approved successfully')
            queryClient.invalidateQueries({ queryKey: ['organization-dashboard'] })
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
            queryClient.invalidateQueries({ queryKey: ['organization-dashboard'] })
        } catch (error) {
            toast.error('Failed to reject club')
        } finally {
            setActionLoading(null)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header - Red Theme */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-red-600 to-red-700">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                            <Clock className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Pending Approvals</h2>
                            <p className="text-red-100 text-sm">
                                {pendingClubs.length} club{pendingClubs.length !== 1 ? 's' : ''} awaiting your review
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X size={22} className="text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[65vh]">
                    {pendingClubs.length === 0 ? (
                        <div className="p-16 text-center">
                            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
                                <Check className="w-10 h-10 text-green-500" />
                            </div>
                            <h3 className="font-bold text-gray-900 text-xl mb-2">All Caught Up!</h3>
                            <p className="text-gray-500">No pending club requests to review.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {pendingClubs.map((club) => (
                                <div key={club.id} className="p-5 hover:bg-gray-50/50 transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                        {/* Club Info */}
                                        <div className="flex items-start gap-4 flex-1 min-w-0">
                                            {club.logoUrl ? (
                                                <img
                                                    src={club.logoUrl}
                                                    alt={club.name}
                                                    className="w-14 h-14 rounded-xl object-cover border-2 border-gray-100 shadow-sm flex-shrink-0"
                                                />
                                            ) : (
                                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center border-2 border-red-100 flex-shrink-0">
                                                    <Building2 className="w-7 h-7 text-red-500" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-gray-900 text-lg truncate">{club.name}</h3>
                                                <p className="text-sm text-gray-600 font-medium">{club.masterName}</p>
                                                <div className="flex flex-wrap items-center gap-3 mt-2">
                                                    {club.address && (
                                                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                                            <MapPin className="w-3 h-3" />
                                                            {club.address}
                                                        </span>
                                                    )}
                                                    {club.contactPhone && (
                                                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                                            <Phone className="w-3 h-3" />
                                                            {club.contactPhone}
                                                        </span>
                                                    )}
                                                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                                        <Users className="w-3 h-3" />
                                                        {club.memberCount} member{club.memberCount !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button
                                                onClick={() => handleApprove(club.id)}
                                                disabled={!!actionLoading}
                                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-all shadow-sm hover:shadow disabled:opacity-50 active:scale-95"
                                            >
                                                {actionLoading === club.id ? (
                                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <Check size={18} />
                                                )}
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleReject(club.id)}
                                                disabled={!!actionLoading}
                                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 border-2 border-gray-200 text-sm font-bold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 active:scale-95"
                                            >
                                                <X size={18} />
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {pendingClubs.length > 0 && (
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                        <p className="text-xs text-gray-500 text-center">
                            Approved clubs will be added to your organization immediately.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
