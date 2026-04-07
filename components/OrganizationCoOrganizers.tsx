'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    Users, UserPlus, Crown, X, Copy, Check,
    ArrowRightLeft, Loader2, Plus, Mail, Shield
} from 'lucide-react'
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
    const [inviteEmail, setInviteEmail]             = useState('')
    const [transferTargetId, setTransferTargetId]   = useState('')
    const [showTransferConfirm, setShowTransferConfirm] = useState(false)
    const [showInviteModal, setShowInviteModal]     = useState(false)
    const [showTransferModal, setShowTransferModal] = useState(false)
    const [copied, setCopied]                       = useState(false)
    const [currentPage, setCurrentPage]             = useState(1)
    const itemsPerPage = 10

    const { data, isLoading } = useQuery({
        queryKey: ['organization-co-organizers', organizationId],
        queryFn: () => getOrganizationCoOrganizers(organizationId),
        enabled: !!organizationId,
    })

    const inviteMutation = useMutation({
        mutationFn: (email: string) => inviteCoOrganizer(organizationId, email),
        onSuccess: (result) => {
            if ('error' in result) toast.error(result.error)
            else {
                toast.success(result.message || 'Co-organizer invited!')
                setInviteEmail('')
                setShowInviteModal(false)
                queryClient.invalidateQueries({ queryKey: ['organization-co-organizers'] })
            }
        },
        onError: () => toast.error('Failed to invite co-organizer'),
    })

    const removeMutation = useMutation({
        mutationFn: (userId: string) => removeCoOrganizer(organizationId, userId),
        onSuccess: () => {
            toast.success('Co-organizer removed')
            queryClient.invalidateQueries({ queryKey: ['organization-co-organizers'] })
        },
        onError: () => toast.error('Failed to remove co-organizer'),
    })

    const cancelInviteMutation = useMutation({
        mutationFn: (inviteId: string) => cancelCoOrganizerInvite(inviteId),
        onSuccess: () => {
            toast.success('Invite cancelled')
            queryClient.invalidateQueries({ queryKey: ['organization-co-organizers'] })
        },
        onError: () => toast.error('Failed to cancel invite'),
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
        onError: () => toast.error('Failed to transfer ownership'),
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
    const finalIsOwner = isOwner ?? propIsOwner
    const showLoading  = isLoading || !organizationId

    const allMembers = [
        ...(coOrganizers   || []).map((co: any)     => ({ ...co,     type: 'co-organizer' as const })),
        ...(pendingInvites || []).map((invite: any)  => ({ ...invite, type: 'pending'       as const })),
    ]
    const totalPages       = Math.ceil(allMembers.length / itemsPerPage)
    const paginatedMembers = allMembers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    return (
        <div className="space-y-6 animate-in fade-in duration-300">

            {/* ── Page header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Team</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage co-organizers and ownership of this organization.</p>
                </div>
                {(finalIsOwner || showLoading) && (
                    <div className="flex items-center gap-2">
                        {finalIsOwner && !showLoading && (coOrganizers?.length ?? 0) > 0 && (
                            <button
                                onClick={() => setShowTransferModal(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-sm font-bold border border-red-100 transition-all"
                            >
                                <ArrowRightLeft size={14} />
                                <span className="hidden sm:inline">Transfer</span>
                            </button>
                        )}
                        <button
                            disabled={showLoading}
                            onClick={() => setShowInviteModal(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50"
                        >
                            <Plus size={14} />
                            Add Co-Organizer
                        </button>
                    </div>
                )}
            </div>

            {/* ── Owner card ── */}
            <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Organization Owner</p>
                {showLoading ? (
                    <div className="animate-pulse flex items-center gap-4">
                        <div className="w-11 h-11 bg-gray-100 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-100 rounded w-36" />
                            <div className="h-3 bg-gray-100 rounded w-48" />
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-100 to-yellow-100 border-2 border-amber-200 flex items-center justify-center flex-shrink-0">
                            <Crown className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-gray-900 truncate">{owner?.name || 'Owner'}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <Mail className="w-3 h-3 text-gray-400" />
                                <p className="text-xs text-gray-500 truncate">{owner?.email}</p>
                            </div>
                        </div>
                        <span className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-xl text-[10px] font-black border border-amber-200">
                            <Crown size={10} /> Owner
                        </span>
                    </div>
                )}
            </div>

            {/* ── Team table card ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                {/* Card header strip */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Co-Organizers & Invites</p>
                    {!showLoading && allMembers.length > 0 && (
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            {allMembers.length} {allMembers.length === 1 ? 'member' : 'members'}
                        </span>
                    )}
                </div>

                {/* Loading */}
                {showLoading ? (
                    <div className="py-12">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="animate-pulse flex items-center gap-4 px-6 py-4 border-b border-gray-50 last:border-0">
                                <div className="w-9 h-9 rounded-full bg-gray-100 flex-shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3.5 bg-gray-100 rounded w-32" />
                                    <div className="h-3 bg-gray-100 rounded w-48" />
                                </div>
                                <div className="h-5 w-20 bg-gray-100 rounded-full" />
                            </div>
                        ))}
                    </div>
                ) : allMembers.length === 0 ? (
                    <div className="py-20 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                            <Users className="w-7 h-7 text-gray-300" />
                        </div>
                        <p className="text-sm font-bold text-gray-900 mb-1">No Co-Organizers Yet</p>
                        <p className="text-xs text-gray-400 mb-5">Invite co-organizers to help manage this organization.</p>
                        {finalIsOwner && (
                            <button
                                onClick={() => setShowInviteModal(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                            >
                                <Plus size={14} /> Add Co-Organizer
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Member</th>
                                    <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest hidden sm:table-cell">Email</th>
                                    <th className="px-6 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Role</th>
                                    {finalIsOwner && (
                                        <th className="px-6 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {paginatedMembers.map((member: any, idx: number) => (
                                    <tr key={member.id || idx} className="hover:bg-gray-50/60 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center flex-shrink-0 border border-indigo-100">
                                                    <span className="text-xs font-black text-indigo-600">
                                                        {(member.name || member.email || '?').charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-gray-900 truncate">
                                                        {member.name || member.email?.split('@')[0] || 'Pending'}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 truncate sm:hidden">{member.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 hidden sm:table-cell">
                                            <span className="text-sm text-gray-500">{member.email}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {member.type === 'pending' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-100">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Pending
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                    <Shield size={9} /> Co-Organizer
                                                </span>
                                            )}
                                        </td>
                                        {finalIsOwner && (
                                            <td className="px-6 py-4 text-right">
                                                {member.type === 'co-organizer' && (
                                                    <button
                                                        onClick={() => removeMutation.mutate(member.id)}
                                                        disabled={removeMutation.isPending}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black text-red-600 bg-red-50 hover:bg-red-100 rounded-xl border border-red-100 transition-all disabled:opacity-50"
                                                    >
                                                        {removeMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                                                        Remove
                                                    </button>
                                                )}
                                                {member.type === 'pending' && (
                                                    <button
                                                        onClick={() => cancelInviteMutation.mutate(member.id)}
                                                        disabled={cancelInviteMutation.isPending}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all disabled:opacity-50"
                                                    >
                                                        {cancelInviteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                                                        Cancel
                                                    </button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Premium pagination footer */}
                {!showLoading && allMembers.length > itemsPerPage && (
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                        <span className="text-xs text-gray-500 font-medium">
                            Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, allMembers.length)} of {allMembers.length}
                        </span>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}
                                className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-white hover:shadow-sm rounded-xl border border-transparent hover:border-gray-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                                Prev
                            </button>
                            <span className="text-xs font-black text-gray-700 px-2">{currentPage} / {totalPages}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
                                className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-white hover:shadow-sm rounded-xl border border-transparent hover:border-gray-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Invite Modal ── */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowInviteModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
                        {/* Dark hero header */}
                        <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 px-6 py-5 flex items-start justify-between">
                            <div>
                                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center mb-3">
                                    <UserPlus className="w-5 h-5 text-indigo-200" />
                                </div>
                                <h3 className="text-lg font-black text-white">Add Co-Organizer</h3>
                                <p className="text-xs text-indigo-200/70 mt-0.5">Invite a team member to help manage this organization.</p>
                            </div>
                            <button onClick={() => setShowInviteModal(false)} className="p-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-6">
                            <form onSubmit={handleInvite} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Email Address</label>
                                    <input
                                        type="email"
                                        placeholder="Enter email address"
                                        value={inviteEmail}
                                        onChange={e => setInviteEmail(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-colors"
                                        required
                                    />
                                </div>
                                {inviteEmail && (
                                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Or share sign-up link</p>
                                        <div className="flex gap-2">
                                            <input readOnly
                                                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/sign-up?role=CO_ORGANIZER&email=${encodeURIComponent(inviteEmail)}`}
                                                className="flex-1 px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl text-gray-600"
                                            />
                                            <button type="button" onClick={copyInviteLink}
                                                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-1">
                                                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setShowInviteModal(false)}
                                        className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors text-sm">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={inviteMutation.isPending}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm shadow-sm">
                                        {inviteMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</> : 'Add / Invite'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Transfer Ownership Modal ── */}
            {showTransferModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setShowTransferModal(false); setShowTransferConfirm(false) }}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
                        {/* Dark hero header */}
                        <div className="bg-gradient-to-br from-red-900 to-red-800 px-6 py-5 flex items-start justify-between">
                            <div>
                                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center mb-3">
                                    <ArrowRightLeft className="w-5 h-5 text-red-200" />
                                </div>
                                <h3 className="text-lg font-black text-white">Transfer Ownership</h3>
                                <p className="text-xs text-red-200/70 mt-0.5">You will become a co-organizer after transfer.</p>
                            </div>
                            <button onClick={() => { setShowTransferModal(false); setShowTransferConfirm(false) }}
                                className="p-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-6">
                            {!showTransferConfirm ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Transfer To</label>
                                        <select
                                            value={transferTargetId}
                                            onChange={e => setTransferTargetId(e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-colors"
                                        >
                                            <option value="">Select co-organizer...</option>
                                            {coOrganizers?.map((co: any) => (
                                                <option key={co.id} value={co.id}>{co.name || co.email}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => setShowTransferModal(false)}
                                            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors text-sm">
                                            Cancel
                                        </button>
                                        <button onClick={() => transferTargetId && setShowTransferConfirm(true)} disabled={!transferTargetId}
                                            className="flex-1 px-4 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors text-sm shadow-sm">
                                            Continue
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-red-50 p-4 rounded-2xl border border-red-200">
                                        <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Irreversible Action</p>
                                        <p className="text-sm font-bold text-red-800">Are you absolutely sure?</p>
                                        <p className="text-xs text-red-600 mt-1">The new owner will have full control. This cannot be undone by you.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => setShowTransferConfirm(false)}
                                            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors text-sm">
                                            Back
                                        </button>
                                        <button onClick={() => transferMutation.mutate(transferTargetId)} disabled={transferMutation.isPending}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors text-sm shadow-sm">
                                            {transferMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Transferring...</> : 'Confirm Transfer'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
