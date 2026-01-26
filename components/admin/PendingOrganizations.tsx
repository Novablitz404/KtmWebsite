'use client'

import { useState, useTransition } from 'react'
import { Check, X, Loader2 } from 'lucide-react'
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col overflow-hidden">
            <div className="p-6 pb-4 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-800">Pending Approvals</h3>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Organization</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Owner</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {organizations.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-sm">
                                    No pending approvals.
                                </td>
                            </tr>
                        ) : (
                            organizations.map((org) => (
                                <tr key={org.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="font-semibold text-gray-900 text-sm">{org.name}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="text-sm text-gray-900">{org.owner.name || 'Unknown'}</span>
                                            <span className="text-xs text-gray-500">{org.owner.email}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(org.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleApprove(org.id)}
                                                disabled={isPending}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
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
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                                                title="Reject"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                                Reject
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
