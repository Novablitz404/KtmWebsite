'use client'

import { X, Sparkles } from 'lucide-react'
import SmartAlertCard from './SmartAlertCard'

interface SmartAlertsModalProps {
    isOpen: boolean
    onClose: () => void
    alerts: any[]
}

export default function SmartAlertsModal({ isOpen, onClose, alerts }: SmartAlertsModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl text-white shadow-md shadow-indigo-200">
                            <Sparkles size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Optimization Suggestions</h2>
                            <p className="text-sm text-gray-500">Review and act on recommended changes</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    <div className="space-y-6">
                        {alerts.map((group) => (
                            <div key={group.tournamentId} className="space-y-3">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                                    {group.tournamentName}
                                </h3>
                                <div className="space-y-3">
                                    {group.alerts.map((alert: any) => {
                                        const proposal = group.proposals.find((p: any) => {
                                            const data = JSON.parse(p.data)
                                            if (p.type === 'UNCONTESTED' && alert.type === 'UNCONTESTED') return data.playerId === alert.details.playerId
                                            if (p.type === 'MERGE' && alert.type === 'MERGE_SUGGESTION') return data.sourceCategoryId === alert.categoryId
                                            if (p.type === 'SPLIT' && alert.type === 'SPLIT_SUGGESTION') return data.categoryId === alert.categoryId
                                            return false
                                        })

                                        return (
                                            <SmartAlertCard
                                                key={`${group.tournamentId}-${alert.categoryId}-${alert.type}`}
                                                alert={alert}
                                                proposal={proposal}
                                                tournamentId={group.tournamentId}
                                            />
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors shadow-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
