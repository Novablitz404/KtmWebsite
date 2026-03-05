'use client'

import { useState } from 'react'
import { Check, X, Building2, Clock, MapPin, Phone, Users, Globe } from 'lucide-react'
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

interface PendingApprovalsWidgetProps {
    pendingClubs: ClubData[]
}

export default function PendingApprovalsWidget({ pendingClubs }: PendingApprovalsWidgetProps) {
    const [activeTab, setActiveTab] = useState<'clubs' | 'organizations'>('clubs')
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const queryClient = useQueryClient()

    // Fetch Organization Requests
    const { data: organizationRequests } = useQuery({
        queryKey: ['affiliation-requests'],
        queryFn: () => getAffiliationRequests(),
    })

    // Club Actions
    const handleApproveClub = async (clubId: string) => {
        setActionLoading(clubId)
        try {
            await approveClub(clubId)
            toast.success('Club approved successfully')
            queryClient.invalidateQueries({ queryKey: ['organization-dashboard'] })
        } catch {
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
        } catch {
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

    const totalPending = pendingClubs.length + (organizationRequests?.length || 0)

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                        <Clock className="w-4.5 h-4.5 text-red-600" />
                    </div>
                    <div>
                        <h2 className="font-bold text-gray-900">Pending Approvals</h2>
                        <p className="text-xs text-gray-500">
                            {totalPending} request{totalPending !== 1 ? 's' : ''} awaiting review
                        </p>
                    </div>
                </div>
                {totalPending > 0 && (
                    <span className="text-xs font-bold text-white bg-red-500 px-2.5 py-1 rounded-full">
                        {totalPending}
                    </span>
                )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 bg-gray-50/50 p-1 gap-1 flex-shrink-0">
                <button
                    onClick={() => setActiveTab('clubs')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'clubs'
                        ? 'bg-white text-red-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Building2 size={14} />
                    Clubs
                    {pendingClubs.length > 0 && (
                        <span className="bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full">
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
                    <Globe size={14} />
                    Organizations
                    {organizationRequests && organizationRequests.length > 0 && (
                        <span className="bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full">
                            {organizationRequests.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto min-h-0">
                {/* CLUBS TAB */}
                {activeTab === 'clubs' && (
                    pendingClubs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mb-3">
                                <Check className="w-7 h-7 text-green-500" />
                            </div>
                            <h3 className="font-bold text-gray-900 mb-1">All Caught Up!</h3>
                            <p className="text-sm text-gray-500">No pending club requests.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {pendingClubs.map((club) => (
                                <div key={club.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        {club.logoUrl ? (
                                            <img
                                                src={club.logoUrl}
                                                alt={club.name}
                                                className="w-10 h-10 rounded-lg object-cover border border-gray-100 flex-shrink-0"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center border border-red-100 flex-shrink-0">
                                                <Building2 className="w-5 h-5 text-red-500" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-gray-900 text-sm truncate">{club.name}</h3>
                                            <p className="text-xs text-gray-500">{club.masterName}</p>
                                            {club.address && (
                                                <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                                                    <MapPin className="w-2.5 h-2.5" />
                                                    {club.address}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button
                                                onClick={() => handleRejectClub(club.id)}
                                                disabled={!!actionLoading}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-600 border border-gray-200 text-xs font-bold rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                            >
                                                <X size={13} />
                                                Reject
                                            </button>
                                            <button
                                                onClick={() => handleApproveClub(club.id)}
                                                disabled={!!actionLoading}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                                            >
                                                {actionLoading === club.id ? (
                                                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <Check size={13} />
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
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mb-3">
                                <Check className="w-7 h-7 text-green-500" />
                            </div>
                            <h3 className="font-bold text-gray-900 mb-1">All Caught Up!</h3>
                            <p className="text-sm text-gray-500">No pending organization requests.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {organizationRequests.map((req) => (
                                <div key={req.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                                    <div className="flex items-start gap-3">
                                        {req.logoUrl ? (
                                            <img
                                                src={req.logoUrl}
                                                alt={req.name}
                                                className="w-10 h-10 rounded-lg object-cover border border-gray-100 flex-shrink-0"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center border border-blue-100 flex-shrink-0">
                                                <Globe className="w-5 h-5 text-blue-500" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-gray-900 text-sm truncate">{req.name}</h3>
                                            {req.owner && (
                                                <p className="text-xs text-gray-500">{req.owner.name}</p>
                                            )}
                                            <div className="mt-1.5 text-[10px] text-blue-600 bg-blue-50 inline-block px-2 py-0.5 rounded border border-blue-100">
                                                Requesting Affiliation
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-3 pl-[52px]">
                                        <button
                                            onClick={() => rejectOrgMutation.mutate(req.id)}
                                            disabled={rejectOrgMutation.isPending}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-600 border border-gray-200 text-xs font-bold rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                        >
                                            <X size={13} />
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => approveOrgMutation.mutate(req.id)}
                                            disabled={approveOrgMutation.isPending}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                                        >
                                            {approveOrgMutation.isPending ? (
                                                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <Check size={13} />
                                            )}
                                            Approve
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </div>
        </div>
    )
}
