'use client'

import { useState } from 'react'
import { BadgeCheck, ShieldX, Loader2, User as UserIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getPendingLicenseRequests, approveAthleteLicense, rejectAthleteLicense } from '@/app/admin/actions'
import UserAvatar from '@/components/UserAvatar'

/**
 * Lets KTM admins approve or reject an Athlete License request — the only
 * way a license gets activated now, whether the athlete requested it
 * themselves (with payment proof) or their club master requested it on
 * their behalf (no proof, offline payment).
 */
export default function LicenseApprovalsPanel() {
    const queryClient = useQueryClient()
    const [processingId, setProcessingId] = useState<string | null>(null)

    const { data: requests, isLoading } = useQuery({
        queryKey: ['admin-license-pending'],
        queryFn: () => getPendingLicenseRequests(),
        staleTime: 1000 * 30,
    })

    const handleDecision = async (userId: string, decision: 'APPROVED' | 'REJECTED') => {
        setProcessingId(userId)
        try {
            const action = decision === 'APPROVED' ? approveAthleteLicense : rejectAthleteLicense
            const result = await action(userId)
            if (result.success) {
                toast.success(decision === 'APPROVED' ? 'License activated' : 'License request rejected')
                queryClient.invalidateQueries({ queryKey: ['admin-license-pending'] })
            } else {
                toast.error(result.error || 'Failed to update license status')
            }
        } catch {
            toast.error('Failed to update license status')
        } finally {
            setProcessingId(null)
        }
    }

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
            </div>
        )
    }

    if (!requests || requests.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
                <BadgeCheck className="w-10 h-10 text-gray-200 mb-3" />
                <p className="text-sm font-medium text-gray-500">No license requests awaiting approval.</p>
            </div>
        )
    }

    return (
        <div className="flex-1 overflow-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Athlete</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Club</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested Via</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Proof</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Decision</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                    {requests.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50/60">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <UserAvatar src={r.imageUrl} name={r.name} size={32} />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-900">{r.name || 'Unknown'}</span>
                                        <span className="text-xs text-gray-500">{r.email}</span>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">{r.clubName || '—'}</td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black ${
                                    r.licenseRequestedVia === 'CLUB_MASTER'
                                        ? 'bg-orange-50 text-orange-700 border border-orange-100'
                                        : 'bg-blue-50 text-blue-700 border border-blue-100'
                                }`}>
                                    <UserIcon className="w-3 h-3" />
                                    {r.licenseRequestedVia === 'CLUB_MASTER' ? 'Club Master' : 'Self'}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                {r.licensePaymentProofUrl ? (
                                    <a
                                        href={r.licensePaymentProofUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs font-bold text-blue-600 hover:underline"
                                    >
                                        View Proof
                                    </a>
                                ) : (
                                    <span className="text-xs text-gray-400 italic">No proof — club master vouched</span>
                                )}
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        onClick={() => handleDecision(r.id, 'REJECTED')}
                                        disabled={processingId === r.id}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50"
                                    >
                                        <ShieldX className="w-3.5 h-3.5" /> Reject
                                    </button>
                                    <button
                                        onClick={() => handleDecision(r.id, 'APPROVED')}
                                        disabled={processingId === r.id}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50"
                                    >
                                        {processingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BadgeCheck className="w-3.5 h-3.5" />}
                                        Activate License
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
