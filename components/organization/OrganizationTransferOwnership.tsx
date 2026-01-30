'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowRightLeft, Loader2, AlertTriangle } from 'lucide-react'
import {
    getOrganizationCoOrganizers,
    transferOrganizationOwnership
} from '@/app/organization/actions'

interface OrganizationTransferOwnershipProps {
    organizationId: string
}

export default function OrganizationTransferOwnership({ organizationId }: OrganizationTransferOwnershipProps) {
    const queryClient = useQueryClient()
    const [transferTargetId, setTransferTargetId] = useState('')
    const [showConfirm, setShowConfirm] = useState(false)

    // Fetch co-organizers to populate the dropdown
    const { data, isLoading } = useQuery({
        queryKey: ['organization-co-organizers', organizationId],
        queryFn: () => getOrganizationCoOrganizers(organizationId),
        enabled: !!organizationId,
    })

    const transferMutation = useMutation({
        mutationFn: (newOwnerId: string) => transferOrganizationOwnership(organizationId, newOwnerId),
        onSuccess: () => {
            toast.success('Ownership transferred successfully!')
            setShowConfirm(false)
            setTransferTargetId('')
            queryClient.invalidateQueries({ queryKey: ['organization-dashboard'] })
            queryClient.invalidateQueries({ queryKey: ['organization-co-organizers'] })
            // Force a reload to reflect permission changes immediately
            window.location.reload()
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to transfer ownership')
        }
    })

    const { coOrganizers, isOwner } = data || {}

    // If not owner, or loading, or no co-organizers, don't show this section
    if (isLoading || !isOwner || !coOrganizers || coOrganizers.length === 0) {
        return null
    }

    return (
        <div className="bg-red-50 sm:rounded-xl shadow-sm border-y sm:border border-red-200 p-4 sm:p-6 mt-6">
            <div className="flex items-start gap-4">
                <div className="hidden sm:flex w-10 h-10 rounded-full bg-red-100 items-center justify-center flex-shrink-0">
                    <ArrowRightLeft className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-red-900 mb-1">Transfer Ownership</h3>
                    <p className="text-red-700 text-sm mb-4 max-w-2xl">
                        Transferring ownership will give full control of this organization to another member.
                        You will be demoted to a co-organizer role. This action uses an atomic swap to ensure security.
                    </p>

                    {!showConfirm ? (
                        <div className="flex flex-col sm:flex-row gap-3 max-w-xl">
                            <select
                                value={transferTargetId}
                                onChange={(e) => setTransferTargetId(e.target.value)}
                                className="flex-1 px-4 py-2.5 border border-red-200 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                            >
                                <option value="">Select a co-organizer...</option>
                                {coOrganizers.map((co: any) => (
                                    <option key={co.id} value={co.id}>
                                        {co.name || co.email}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => transferTargetId && setShowConfirm(true)}
                                disabled={!transferTargetId}
                                className="px-6 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
                            >
                                Transfer
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl p-4 border border-red-200 max-w-xl animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center gap-2 mb-3 text-red-800 font-semibold">
                                <AlertTriangle className="w-5 h-5" />
                                Please Confirm Transfer
                            </div>
                            <p className="text-sm text-gray-600 mb-4">
                                Are you sure you want to transfer ownership to <span className="font-bold text-gray-900">{coOrganizers.find((c: any) => c.id === transferTargetId)?.name}</span>?
                                You cannot undo this action.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
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
        </div>
    )
}
