'use client'

import { useQuery } from '@tanstack/react-query'
import { getAllOrganizationAlerts } from '@/app/actions'
import { ShieldAlert, Split, Merge, ChevronRight, Trophy, Check } from 'lucide-react'
import Link from 'next/link'

export default function SmartAlertsWidget() {
    const { data: orgAlerts, isLoading } = useQuery({
        queryKey: ['org-smart-alerts'],
        queryFn: () => getAllOrganizationAlerts(),
        staleTime: 1000 * 60
    })

    const totalAlerts = orgAlerts?.reduce((acc: number, group: any) => acc + group.alerts.length, 0) || 0
    const hasAlerts = totalAlerts > 0

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex-shrink-0 min-h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Smart Alerts</h3>
                {hasAlerts && (
                    <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs font-bold animate-pulse">
                        {totalAlerts}
                    </span>
                )}
            </div>

            {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-gray-200 border-t-red-600 rounded-full animate-spin" />
                </div>
            ) : !hasAlerts ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 rounded-full mb-4 ring-4 ring-green-50/50">
                        <Check size={32} className="text-green-600" strokeWidth={3} />
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-1">All Clear</p>
                    <p className="text-xs text-gray-400 max-w-[200px]">No tournament alerts. Categories look optimized.</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto space-y-2">
                    {orgAlerts!.map((group: any) => {
                        const uncontestedCount = group.alerts.filter((a: any) => a.type === 'UNCONTESTED').length
                        const mergeCount = group.alerts.filter((a: any) => a.type === 'MERGE_SUGGESTION').length
                        const splitCount = group.alerts.filter((a: any) => a.type === 'SPLIT_SUGGESTION').length

                        return (
                            <Link
                                key={group.tournamentId}
                                href={`/tournament/${group.tournamentId}?tab=brackets`}
                                className="block p-3 bg-gray-50 hover:bg-amber-50 rounded-xl cursor-pointer transition-all border border-transparent hover:border-amber-200 group"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                        <div className="p-1.5 bg-amber-100 rounded-lg flex-shrink-0 mt-0.5">
                                            <Trophy size={14} className="text-amber-600" />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-sm font-bold text-gray-900 truncate group-hover:text-amber-800 transition-colors">
                                                {group.tournamentName}
                                            </h4>
                                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                                {uncontestedCount > 0 && (
                                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-700">
                                                        <ShieldAlert size={8} />
                                                        {uncontestedCount}
                                                    </span>
                                                )}
                                                {mergeCount > 0 && (
                                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                                                        <Merge size={8} />
                                                        {mergeCount}
                                                    </span>
                                                )}
                                                {splitCount > 0 && (
                                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                                                        <Split size={8} />
                                                        {splitCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="text-gray-300 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                                </div>
                            </Link>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
