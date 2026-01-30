'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, UserPlus, Crown, X, Copy, Check, ArrowRightLeft, Loader2, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import {
    getOrganizationCoOrganizers,
    inviteCoOrganizer,
    removeCoOrganizer,
    cancelCoOrganizerInvite,
    transferOrganizationOwnership
} from '@/app/organization/actions'

interface OrganizationCoOrganizersProps {
    organizationId: string
    isOwner?: boolean
}

export default function OrganizationCoOrganizers({ organizationId, isOwner: propIsOwner }: OrganizationCoOrganizersProps) {
    const queryClient = useQueryClient()
    const [inviteEmail, setInviteEmail] = useState('')
    const [transferTargetId, setTransferTargetId] = useState('')
    const [showTransferConfirm, setShowTransferConfirm] = useState(false)
    const [showInviteModal, setShowInviteModal] = useState(false)
    const [showTransferModal, setShowTransferModal] = useState(false)
    const [copied, setCopied] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    // Fetch co-organizers data
    const { data, isLoading, error } = useQuery({
        queryKey: ['organization-co-organizers', organizationId],
        queryFn: () => getOrganizationCoOrganizers(organizationId),
        enabled: !!organizationId, // Only fetch when organizationId is provided
    })

    // Mutations
    const inviteMutation = useMutation({
        mutationFn: (email: string) => inviteCoOrganizer(organizationId, email),
        onSuccess: (result) => {
            if ('error' in result) {
                toast.error(result.error)
            } else {
                toast.success(result.message || 'Co-organizer invited!')
                setInviteEmail('')
                setShowInviteModal(false)
                queryClient.invalidateQueries({ queryKey: ['organization-co-organizers'] })
            }
        },
        onError: () => toast.error('Failed to invite co-organizer')
    })

    const removeMutation = useMutation({
        mutationFn: (userId: string) => removeCoOrganizer(organizationId, userId),
        onSuccess: () => {
            toast.success('Co-organizer removed')
            queryClient.invalidateQueries({ queryKey: ['organization-co-organizers'] })
        },
        onError: () => toast.error('Failed to remove co-organizer')
    })

    const cancelInviteMutation = useMutation({
        mutationFn: (inviteId: string) => cancelCoOrganizerInvite(inviteId),
        onSuccess: () => {
            toast.success('Invite cancelled')
            queryClient.invalidateQueries({ queryKey: ['organization-co-organizers'] })
        },
        onError: () => toast.error('Failed to cancel invite')
    })

    const transferMutation = useMutation({
        mutationFn: (newOwnerId: string) => transferOrganizationOwnership(organizationId, newOwnerId),
        onSuccess: () => {
            toast.success('Ownership transferred successfully!')
            setShowTransferConfirm(false)
            setTransferTargetId('')
            setShowTransferModal(false)
            queryClient.invalidateQueries({ queryKey: ['organization-co-organizers'] })
        },
        onError: () => toast.error('Failed to transfer ownership')
    })

    const handleInvite = (e: React.FormEvent) => {
        e.preventDefault()
        if (!inviteEmail.trim()) return
        inviteMutation.mutate(inviteEmail.trim())
    }

    const copyInviteLink = () => {
        const link = `${window.location.origin}/sign-up?role=CO_ORGANIZER&email=${encodeURIComponent(inviteEmail)}`
        navigator.clipboard.writeText(link)
        setCopied(true)
        toast.success('Invite link copied!')
        setTimeout(() => setCopied(false), 2000)
    }

    const { owner, coOrganizers, pendingInvites, isOwner } = data || {}

    // Treat missing organizationId as loading state
    const showLoading = isLoading || !organizationId

    // Combine all members for pagination
    const allMembers = [
        ...(coOrganizers || []).map((co: any) => ({ ...co, type: 'co-organizer' as const })),
        ...(pendingInvites || []).map((invite: any) => ({ ...invite, type: 'pending' as const }))
    ]

    const totalPages = Math.ceil(allMembers.length / itemsPerPage)
    const paginatedMembers = allMembers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    // Table Skeleton Rows
    const TableSkeletonRows = () => (
        <>
            {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="animate-pulse border-b border-gray-100">
                    <td className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded w-32"></div>
                    </td>
                    <td className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded w-48"></div>
                    </td>
                    <td className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded w-24"></div>
                    </td>
                </tr>
            ))}
        </>
    )

    // Determine final isOwner state (prefer data from server, fall back to prop)
    const finalIsOwner = isOwner ?? propIsOwner

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Header with Owner on Left, Actions on Right */}
            <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Owner Info - Left */}
                <div className="flex items-center gap-3">
                    {showLoading ? (
                        <div className="animate-pulse flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                            <div className="space-y-2">
                                <div className="h-4 bg-gray-200 rounded w-24"></div>
                                <div className="h-3 bg-gray-100 rounded w-32"></div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-yellow-100 flex items-center justify-center border-2 border-amber-200">
                                <Crown className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900">{owner?.name || 'Owner'}</p>
                                <p className="text-xs text-gray-500">{owner?.email}</p>
                            </div>
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                                Owner
                            </span>
                        </>
                    )}
                </div>

                {/* Actions - Right */}
                {(finalIsOwner || showLoading) && (
                    <div className="flex items-center gap-3">
                        {finalIsOwner && !showLoading && coOrganizers && coOrganizers.length > 0 && (
                            <button
                                onClick={() => setShowTransferModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl text-sm font-semibold transition-all"
                            >
                                <ArrowRightLeft size={16} />
                                <span className="hidden sm:inline">Transfer Ownership</span>
                            </button>
                        )}
                        <button
                            disabled={showLoading}
                            onClick={() => setShowInviteModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
                        >
                            <Plus size={16} />
                            Add Co-Organizer
                        </button>
                    </div>
                )}
            </div>

            {/* Table Container */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col flex-1 overflow-hidden min-h-0">
                {/* Scrollable List */}
                <div className="flex-1 overflow-y-auto">
                    <div className="flex-1 overflow-y-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    {finalIsOwner && (
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {showLoading ? (
                                    <TableSkeletonRows />
                                ) : (
                                    <>
                                        {paginatedMembers.map((member: any, idx: number) => (
                                            <tr key={member.id || idx} className="hover:bg-gray-50">
                                                <td className="px-4 py-3">
                                                    <span className="font-medium text-gray-900">
                                                        {member.name || member.email?.split('@')[0] || 'Pending'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">{member.email}</td>
                                                <td className="px-4 py-3">
                                                    {member.type === 'pending' ? (
                                                        <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">Pending</span>
                                                    ) : (
                                                        <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">Co-Organizer</span>
                                                    )}
                                                </td>
                                                {finalIsOwner && (
                                                    <td className="px-4 py-3 text-right">
                                                        {member.type === 'co-organizer' && (
                                                            <button
                                                                onClick={() => removeMutation.mutate(member.id)}
                                                                disabled={removeMutation.isPending}
                                                                className="text-red-600 hover:text-red-700 text-sm font-medium px-3 py-1 hover:bg-red-50 rounded-lg transition-colors"
                                                            >
                                                                Remove
                                                            </button>
                                                        )}
                                                        {member.type === 'pending' && (
                                                            <button
                                                                onClick={() => cancelInviteMutation.mutate(member.id)}
                                                                disabled={cancelInviteMutation.isPending}
                                                                className="text-gray-500 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                        {paginatedMembers.length === 0 && (
                                            <tr>
                                                <td colSpan={finalIsOwner ? 4 : 3} className="px-4 py-12 text-center text-gray-500">
                                                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                                    No co-organizers yet
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination Footer */}
                {allMembers.length > itemsPerPage && (
                    <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white flex items-center justify-end">
                        <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage <= 1}
                                className={`p-2 rounded-lg transition-all ${currentPage <= 1
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-gray-700 hover:bg-white hover:shadow-sm'
                                    }`}
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div className="px-3">
                                <span className="text-sm font-bold text-gray-900">Page {currentPage}</span>
                                <span className="text-xs text-gray-400 ml-1">of {totalPages}</span>
                            </div>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage >= totalPages}
                                className={`p-2 rounded-lg transition-all ${currentPage >= totalPages
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-gray-700 hover:bg-white hover:shadow-sm'
                                    }`}
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-indigo-600" />
                                Add Co-Organizer
                            </h3>
                            <button onClick={() => setShowInviteModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleInvite} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    placeholder="Enter email address"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                    required
                                />
                            </div>
                            {inviteEmail && (
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <p className="text-xs text-gray-600 mb-2">Or share sign-up link:</p>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            readOnly
                                            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/sign-up?role=CO_ORGANIZER&email=${encodeURIComponent(inviteEmail)}`}
                                            className="flex-1 px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg text-gray-600"
                                        />
                                        <button
                                            type="button"
                                            onClick={copyInviteLink}
                                            className="px-3 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1 text-sm"
                                        >
                                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowInviteModal(false)}
                                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={inviteMutation.isPending}
                                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                >
                                    {inviteMutation.isPending ? 'Adding...' : 'Add / Invite'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Transfer Modal */}
            {showTransferModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
                                <ArrowRightLeft className="w-5 h-5" />
                                Transfer Ownership
                            </h3>
                            <button onClick={() => { setShowTransferModal(false); setShowTransferConfirm(false); }} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                            Transfer ownership to a co-organizer. You will become a co-organizer.
                        </p>
                        {!showTransferConfirm ? (
                            <div className="space-y-4">
                                <select
                                    value={transferTargetId}
                                    onChange={(e) => setTransferTargetId(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                                >
                                    <option value="">Select co-organizer...</option>
                                    {coOrganizers?.map((co: any) => (
                                        <option key={co.id} value={co.id}>
                                            {co.name || co.email}
                                        </option>
                                    ))}
                                </select>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowTransferModal(false)}
                                        className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => transferTargetId && setShowTransferConfirm(true)}
                                        disabled={!transferTargetId}
                                        className="flex-1 px-4 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
                                    >
                                        Transfer
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                                    <p className="font-semibold text-red-800 mb-2">Are you sure?</p>
                                    <p className="text-sm text-red-600">
                                        This action cannot be undone by you. The new owner will have full control.
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowTransferConfirm(false)}
                                        className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={() => transferMutation.mutate(transferTargetId)}
                                        disabled={transferMutation.isPending}
                                        className="flex-1 px-4 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                                    >
                                        {transferMutation.isPending ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> Transferring...</>
                                        ) : (
                                            'Confirm Transfer'
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
