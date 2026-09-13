'use client'

import { useState } from 'react'
import { ShieldCheck, ShieldX, Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getPendingGssTournaments, updateTournamentGssApproval } from '@/app/admin/actions'

/**
 * Lets KTM admins approve or reject a tournament's GSS eligibility before it
 * runs. Only APPROVED tournaments feed the Elo/ranking pipeline — bracket
 * generation and scoring work regardless of this status.
 */
export default function GssApprovalsPanel() {
    const queryClient = useQueryClient()
    const [processingId, setProcessingId] = useState<string | null>(null)

    const { data: tournaments, isLoading } = useQuery({
        queryKey: ['admin-gss-pending'],
        queryFn: () => getPendingGssTournaments(),
        staleTime: 1000 * 30,
    })

    const handleDecision = async (tournamentId: string, decision: 'APPROVED' | 'REJECTED') => {
        setProcessingId(tournamentId)
        try {
            const result = await updateTournamentGssApproval(tournamentId, decision)
            if (result.success) {
                toast.success(decision === 'APPROVED' ? 'Tournament approved for GSS' : 'Tournament rejected for GSS')
                queryClient.invalidateQueries({ queryKey: ['admin-gss-pending'] })
            } else {
                toast.error(result.error || 'Failed to update approval status')
            }
        } catch {
            toast.error('Failed to update approval status')
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

    if (!tournaments || tournaments.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
                <ShieldCheck className="w-10 h-10 text-gray-200 mb-3" />
                <p className="text-sm font-medium text-gray-500">No tournaments awaiting GSS approval.</p>
            </div>
        )
    }

    return (
        <div className="flex-1 overflow-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tournament</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organizer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Decision</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                    {tournaments.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50/60">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{t.name}</td>
                            <td className="px-6 py-4">
                                {t.organizer ? (
                                    <div className="flex flex-col">
                                        <span className="text-sm text-gray-900">{t.organizer.name || 'Unknown'}</span>
                                        <span className="text-xs text-gray-500">{t.organizer.email}</span>
                                        {!t.organizer.organizationMemberId && (
                                            <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 w-fit">
                                                <AlertTriangle className="w-3 h-3" /> No org — can&apos;t approve
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <span className="text-sm text-gray-400 italic">No organizer</span>
                                )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">{t.tier}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                                {new Date(t.startDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        onClick={() => handleDecision(t.id, 'REJECTED')}
                                        disabled={processingId === t.id}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50"
                                    >
                                        <ShieldX className="w-3.5 h-3.5" /> Reject
                                    </button>
                                    <button
                                        onClick={() => handleDecision(t.id, 'APPROVED')}
                                        disabled={processingId === t.id || !t.organizer?.organizationMemberId}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50"
                                    >
                                        {processingId === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                                        Approve for GSS
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
