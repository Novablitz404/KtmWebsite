'use client'

import { useState } from 'react'
import { X, Check, Building2, Clock, MapPin, Phone, Users, Globe } from 'lucide-react'
import { toast } from 'sonner'
import { approveClub, rejectClub, getAffiliationRequests, approveAffiliation, rejectAffiliation } from '@/app/organization/actions'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

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

interface PendingRequestsModalProps {
    isOpen: boolean
    onClose: () => void
    pendingClubs: ClubData[]
}

export default function PendingRequestsModal({ isOpen, onClose, pendingClubs }: PendingRequestsModalProps) {
    const [activeTab, setActiveTab] = useState<'clubs' | 'organizations'>('clubs')
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const queryClient = useQueryClient()

    // Fetch Organization Requests
    const { data: organizationRequests, isLoading: isLoadingOrgs } = useQuery({
        queryKey: ['affiliation-requests'],
        queryFn: () => getAffiliationRequests(),
        enabled: isOpen // Only fetch when open
    })

    // Club Actions
    const handleApproveClub = async (clubId: string) => {
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

    const handleRejectClub = async (clubId: string) => {
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

    // Organization Actions
    const approveOrgMutation = useMutation({
        mutationFn: approveAffiliation,
        onSuccess: (result) => {
            if (result.success) {
                toast.success("Affiliation approved!")
                queryClient.invalidateQueries({ queryKey: ['affiliation-requests'] })
                queryClient.invalidateQueries({ queryKey: ['organization-dashboard'] })
            } else {
                toast.error(result.error || "Failed to approve")
            }
        }
    })

    const rejectOrgMutation = useMutation({
        mutationFn: rejectAffiliation,
        onSuccess: (result) => {
            if (result.success) {
                toast.success("Affiliation rejected")
                queryClient.invalidateQueries({ queryKey: ['affiliation-requests'] })
            } else {
                toast.error(result.error || "Failed to reject")
            }
        }
    })

    if (!isOpen) return null

    const totalPending = pendingClubs.length + (organizationRequests?.length || 0)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
                {/* Header - Red Theme */}
                <div className="flex-shrink-0 flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-red-600 to-red-700">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                            <Clock className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Pending Approvals</h2>
                            <p className="text-red-100 text-sm">
                                {totalPending} request{totalPending !== 1 ? 's' : ''} awaiting your review
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

                {/* Tabs */}
                <div className="flex border-b border-gray-100 bg-gray-50/50 p-1 gap-1">
                    <button
                        onClick={() => setActiveTab('clubs')}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'clubs'
                                ? 'bg-white text-red-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Building2 size={16} />
                        Clubs
                        {pendingClubs.length > 0 && (
                            <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
                                {pendingClubs.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('organizations')}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'organizations'
                                ? 'bg-white text-red-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Globe size={16} />
                        Organizations
                        {organizationRequests && organizationRequests.length > 0 && (
                            <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
                                {organizationRequests.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto flex-1 min-h-0">

                    {/* CLUBS TAB */}
                    {activeTab === 'clubs' && (
                        pendingClubs.length === 0 ? (
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

                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <button
                                                    onClick={() => handleRejectClub(club.id)}
                                                    disabled={!!actionLoading}
                                                    className="inline-flex items-center gap-2 px-3 py-2 bg-white text-gray-700 border border-gray-200 text-sm font-bold rounded-lg hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    <X size={16} />
                                                    Reject
                                                </button>
                                                <button
                                                    onClick={() => handleApproveClub(club.id)}
                                                    disabled={!!actionLoading}
                                                    className="inline-flex items-center gap-2 px-3 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 disabled:opacity-50"
                                                >
                                                    {actionLoading === club.id ? (
                                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    ) : (
                                                        <Check size={16} />
                                                    )}
                                                    Approve
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {/* ORGANIZATIONS TAB */}
                    {activeTab === 'organizations' && (
                        !organizationRequests || organizationRequests.length === 0 ? (
                            <div className="p-16 text-center">
                                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
                                    <Check className="w-10 h-10 text-green-500" />
                                </div>
                                <h3 className="font-bold text-gray-900 text-xl mb-2">All Caught Up!</h3>
                                <p className="text-gray-500">No pending organization requests to review.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {organizationRequests.map((req) => (
                                    <div key={req.id} className="p-5 hover:bg-gray-50/50 transition-colors">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-4 flex-1 min-w-0">
                                                {req.logoUrl ? (
                                                    <img
                                                        src={req.logoUrl}
                                                        alt={req.name}
                                                        className="w-14 h-14 rounded-xl object-cover border-2 border-gray-100 shadow-sm flex-shrink-0"
                                                    />
                                                ) : (
                                                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center border-2 border-blue-100 flex-shrink-0">
                                                        <Globe className="w-7 h-7 text-blue-500" />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-gray-900 text-lg truncate">{req.name}</h3>
                                                    {req.owner && (
                                                        <p className="text-sm text-gray-600 font-medium">{req.owner.name} ({req.owner.email})</p>
                                                    )}
                                                    <div className="mt-2 text-xs text-blue-600 bg-blue-50 inline-block px-2 py-1 rounded-md border border-blue-100">
                                                        Requesting Affiliation
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <button
                                                    onClick={() => rejectOrgMutation.mutate(req.id)}
                                                    disabled={rejectOrgMutation.isPending}
                                                    className="inline-flex items-center gap-2 px-3 py-2 bg-white text-gray-700 border border-gray-200 text-sm font-bold rounded-lg hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    <X size={16} />
                                                    Reject
                                                </button>
                                                <button
                                                    onClick={() => approveOrgMutation.mutate(req.id)}
                                                    disabled={approveOrgMutation.isPending}
                                                    className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 disabled:opacity-50"
                                                >
                                                    {approveOrgMutation.isPending ? (
                                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    ) : (
                                                        <Check size={16} />
                                                    )}
                                                    Approve
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 bg-gray-50">
                    <p className="text-xs text-gray-500 text-center">
                        Approved entities will be added to your network immediately.
                    </p>
                </div>
            </div>
        </div>
    )
}
