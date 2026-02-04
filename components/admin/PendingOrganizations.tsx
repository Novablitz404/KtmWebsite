'use client'

import { useState, useTransition } from 'react'
import { Check, X, Loader2, Clock, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { approveOrganization, rejectOrganization } from '@/app/admin/actions'
import { useRouter } from 'next/navigation'

interface PendingOrg {
    id: string
    name: string
    createdAt: Date
    owner: {
        name: string | null
        email: string
    }
}

interface PendingOrganizationsProps {
    organizations: PendingOrg[]
}

export default function PendingOrganizations({ organizations }: PendingOrganizationsProps) {
    const [isPending, startTransition] = useTransition()
    const [actionId, setActionId] = useState<string | null>(null)
    const router = useRouter()

    const handleApprove = (orgId: string) => {
        setActionId(orgId)
        startTransition(async () => {
            try {
                await approveOrganization(orgId)
                toast.success('Organization approved!')
                router.refresh()
            } catch (error) {
                toast.error('Failed to approve organization')
            } finally {
                setActionId(null)
            }
        })
    }

    const handleReject = (orgId: string) => {
        if (!confirm('Are you sure you want to reject this organization?')) return
        setActionId(orgId)
        startTransition(async () => {
            try {
                await rejectOrganization(orgId)
                toast.success('Organization rejected')
                router.refresh()
            } catch (error) {
                toast.error('Failed to reject organization')
            } finally {
                setActionId(null)
            }
        })
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                        <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Pending Approvals</h3>
                        <p className="text-xs text-gray-400">Organizations awaiting review</p>
                    </div>
                </div>
                {organizations.length > 0 && (
                    <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full">
                        {organizations.length} pending
                    </span>
                )}
            </div>

            {/* Content */}
            {organizations.length === 0 ? (
                <div className="px-6 py-16 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Check className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-gray-400 font-medium">All caught up!</p>
                    <p className="text-xs text-gray-300 mt-1">No pending approvals at the moment</p>
                </div>
            ) : (
                <div className="divide-y divide-gray-50">
                    {organizations.map((org) => (
                        <div key={org.id} className="px-6 py-4 hover:bg-gray-50/50 transition-colors">
                            <div className="flex items-center justify-between gap-4">
                                {/* Organization Info */}
                                <div className="flex items-center gap-4 min-w-0 flex-1">
                                    <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <Building2 className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-gray-900 truncate">{org.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-sm text-gray-500 truncate">{org.owner.name || 'Unknown'}</span>
                                            <span className="text-gray-300">•</span>
                                            <span className="text-xs text-gray-400">{org.owner.email}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Date */}
                                <div className="hidden sm:block text-right flex-shrink-0">
                                    <p className="text-xs text-gray-400">Submitted</p>
                                    <p className="text-sm font-medium text-gray-600">
                                        {new Date(org.createdAt).toLocaleDateString(undefined, {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                        onClick={() => handleApprove(org.id)}
                                        disabled={isPending}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-bold rounded-xl transition-all disabled:opacity-50 shadow-sm hover:shadow"
                                        title="Approve"
                                    >
                                        {actionId === org.id && isPending ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Check className="w-3.5 h-3.5" />
                                        )}
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleReject(org.id)}
                                        disabled={isPending}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                                        title="Reject"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                        Reject
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
