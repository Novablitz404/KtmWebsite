'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAllOrganizationAlerts } from '@/app/actions'
import SmartAlertsModal from './SmartAlertsModal'
import { ShieldAlert, Split, Merge } from 'lucide-react'

export default function SmartAlertsWidget() {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const { data: orgAlerts, isLoading } = useQuery({
        queryKey: ['org-smart-alerts'],
        queryFn: () => getAllOrganizationAlerts(),
        staleTime: 1000 * 60 // 1 minute
    })



    // Flatten alerts for simple count/display
    const totalAlerts = orgAlerts?.reduce((acc: number, group: any) => acc + group.alerts.length, 0) || 0
    const hasAlerts = totalAlerts > 0

    return (
        <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex-shrink-0 min-h-[400px] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900">Smart Suggestions</h3>
                    {hasAlerts && (
                        <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs font-bold">
                            {totalAlerts}
                        </span>
                    )}
                </div>

                {!hasAlerts ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60">
                        <p className="text-sm text-gray-500">No suggestions available at the moment.</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto space-y-2">
                        {orgAlerts?.map((group: any) => (
                            <div key={group.tournamentId}>
                                {group.alerts.map((alert: any) => (
                                    <div
                                        key={`${group.tournamentId}-${alert.categoryId}-${alert.type}`}
                                        className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-200"
                                        onClick={() => setIsModalOpen(true)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`mt-0.5 p-1.5 rounded-full ${alert.type === 'UNCONTESTED' ? 'bg-yellow-100 text-yellow-600' :
                                                alert.type === 'SPLIT_SUGGESTION' ? 'bg-blue-100 text-blue-600' :
                                                    'bg-purple-100 text-purple-600'
                                                }`}>
                                                {alert.type === 'UNCONTESTED' && <ShieldAlert size={14} />}
                                                {alert.type === 'SPLIT_SUGGESTION' && <Split size={14} />}
                                                {alert.type === 'MERGE_SUGGESTION' && <Merge size={14} />}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-gray-900 line-clamp-1">{alert.categoryName}</h4>
                                                <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{alert.message}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}

                {hasAlerts && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="mt-4 w-full py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                    >
                        View All Suggestions
                    </button>
                )}
            </div>

            <SmartAlertsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                alerts={orgAlerts || []}
            />
        </>
    )
}
