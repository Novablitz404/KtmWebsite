'use client'

import { useState } from 'react'
import { AlertCircle, ArrowRight, Check, Clock, ShieldAlert, Split, Merge } from 'lucide-react'
import { initiateSmartProposal, forceExecuteSmartAction } from '@/app/actions'
import { SmartAlert } from '@/lib/smart-tournament-logic'

interface SmartAlertCardProps {
    alert: SmartAlert
    proposal?: any
    tournamentId: string
}

export default function SmartAlertCard({ alert, proposal, tournamentId }: SmartAlertCardProps) {
    const [loading, setLoading] = useState(false)

    async function handlePropose(type: string, data: any) {
        setLoading(true)
        await initiateSmartProposal(tournamentId, type, data)
        setLoading(false)
    }

    async function handleForceExecute() {
        if (!proposal) return
        if (!confirm("Are you sure you want to force execute this action?")) return
        setLoading(true)
        await forceExecuteSmartAction(proposal.id)
        setLoading(false)
    }

    const isPending = proposal?.status === 'PENDING'

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
                <div className={`p-2 rounded-full ${alert.type === 'UNCONTESTED' ? 'bg-yellow-100 text-yellow-600' :
                    alert.type === 'SPLIT_SUGGESTION' ? 'bg-blue-100 text-blue-600' :
                        'bg-purple-100 text-purple-600'
                    }`}>
                    {alert.type === 'UNCONTESTED' && <ShieldAlert size={20} />}
                    {alert.type === 'SPLIT_SUGGESTION' && <Split size={20} />}
                    {alert.type === 'MERGE_SUGGESTION' && <Merge size={20} />}
                </div>
                <div>
                    <h4 className="font-semibold text-gray-900">{alert.categoryName}</h4>
                    <p className="text-sm text-gray-600">{alert.message}</p>
                    {isPending && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-orange-600 font-medium">
                            <Clock size={12} />
                            <span>Waiting for Club Master Response...</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
                {!isPending ? (
                    <>
                        {alert.type === 'UNCONTESTED' && (
                            <button
                                onClick={() => handlePropose('UNCONTESTED', { ...alert.details, playerId: alert.details.playerId })}
                                disabled={loading}
                                className="flex-1 sm:flex-none px-4 py-2 bg-yellow-600 text-white rounded-md text-sm font-medium hover:bg-yellow-700 transition-colors disabled:opacity-50"
                            >
                                Request Resolution
                            </button>
                        )}
                        {alert.type === 'SPLIT_SUGGESTION' && (
                            <button
                                onClick={() => handlePropose('SPLIT', { categoryId: alert.categoryId })}
                                disabled={loading}
                                className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                Propose Split
                            </button>
                        )}
                        {alert.type === 'MERGE_SUGGESTION' && (
                            <button
                                onClick={() => handlePropose('MERGE', { sourceCategoryId: alert.categoryId, targetCategoryId: alert.details.targetCategoryId })}
                                disabled={loading}
                                className="flex-1 sm:flex-none px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
                            >
                                Propose Merge
                            </button>
                        )}
                    </>
                ) : (
                    <button
                        onClick={handleForceExecute}
                        disabled={loading}
                        className="flex-1 sm:flex-none px-4 py-2 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Executing...' : 'Force Execute'}
                    </button>
                )}
            </div>
        </div>
    )
}
