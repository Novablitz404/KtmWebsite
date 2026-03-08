'use client'

import { useState } from 'react'
import { Plus, Trash2, Save, Info } from 'lucide-react'
import { updateFeeDistributions } from '@/app/organization/actions'
import { toast } from 'sonner'
import React from 'react'

type Rule = { name: string; amount: number }
type Distributions = Record<string, Rule[]>

export default function DistributionRulesView({
    initialDistributions,
    primaryColor
}: {
    initialDistributions: Distributions
    primaryColor: string
}) {
    const [distributions, setDistributions] = useState<Distributions>(initialDistributions || {})
    const [isSaving, setIsSaving] = useState(false)

    const revenueStreams = [
        { id: 'affiliation', label: 'Club Affiliations' },
        { id: 'promotion', label: 'Promotion Tests' },
        { id: 'seminar', label: 'Seminars' },
        { id: 'tournament', label: 'Tournaments' },
    ]

    const handleAddRule = (streamId: string) => {
        setDistributions(prev => {
            const current = prev[streamId] || []
            return {
                ...prev,
                [streamId]: [...current, { name: '', amount: 0 }]
            }
        })
    }

    const handleRemoveRule = (streamId: string, index: number) => {
        setDistributions(prev => {
            const current = [...(prev[streamId] || [])]
            current.splice(index, 1)
            return { ...prev, [streamId]: current }
        })
    }

    const handleChangeRule = (streamId: string, index: number, field: keyof Rule, value: string | number) => {
        setDistributions(prev => {
            const current = [...(prev[streamId] || [])]
            current[index] = { ...current[index], [field]: value }
            return { ...prev, [streamId]: current }
        })
    }

    const handleSave = async () => {
        // Validate
        for (const [stream, rules] of Object.entries(distributions)) {
            for (const r of rules) {
                if (!r.name.trim()) {
                    toast.error(`Please provide a name for all rules in ${stream}`)
                    return
                }
                if (r.amount <= 0) {
                    toast.error(`Amounts must be greater than 0 in ${stream}`)
                    return
                }
            }
        }

        setIsSaving(true)
        try {
            const res = await updateFeeDistributions(distributions)
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success('Distribution rules saved successfully')
            }
        } catch (error) {
            toast.error('Failed to save rules')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-blue-800 text-sm">
                <Info className="flex-shrink-0 mt-0.5 text-blue-600" size={18} />
                <p>
                    <strong>Fee Distributions</strong> automatically deduct fixed amounts from collected revenue per registration/payment.
                    Set up individual deductibles (like "Platform Fee" or "Rebates") to calculate your organization's true <strong>Net Revenue</strong>.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {revenueStreams.map(stream => {
                    const rules = distributions[stream.id] || []
                    const totalDeductions = rules.reduce((s, r) => s + (Number(r.amount) || 0), 0)

                    return (
                        <div key={stream.id} className="bg-white border text-sm border-gray-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-gray-900">{stream.label}</h3>
                                    <p className="text-xs text-gray-500">Total Deductions: <span className="font-bold text-gray-900">₱{(totalDeductions).toLocaleString()}</span> / reg</p>
                                </div>
                                <button
                                    onClick={() => handleAddRule(stream.id)}
                                    className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-white rounded-md border border-transparent hover:border-gray-200 transition-all flex items-center gap-1 text-xs font-semibold"
                                >
                                    <Plus size={14} /> Add Bucket
                                </button>
                            </div>

                            <div className="p-5 space-y-3 bg-white">
                                {rules.length === 0 ? (
                                    <div className="text-center py-6 text-gray-400 text-xs font-medium border-2 border-dashed border-gray-100 rounded-lg">
                                        No distribution rules set. Defaults to 100% Net Revenue.
                                    </div>
                                ) : (
                                    rules.map((rule, idx) => (
                                        <div key={idx} className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                                            <div className="relative flex-1">
                                                <input
                                                    type="text"
                                                    placeholder="Bucket Name (e.g. Platform Fee)"
                                                    value={rule.name}
                                                    onChange={(e) => handleChangeRule(stream.id, idx, 'name', e.target.value)}
                                                    className="w-full text-sm border border-gray-200 rounded-lg pl-3 pr-3 py-2 focus:ring-2 focus:ring-gray-200 focus:outline-none placeholder:text-gray-300"
                                                />
                                            </div>
                                            <div className="relative w-32">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₱</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    placeholder="0"
                                                    value={rule.amount || ''}
                                                    onChange={(e) => handleChangeRule(stream.id, idx, 'amount', Number(e.target.value))}
                                                    className="w-full text-sm border border-gray-200 rounded-lg pl-7 pr-3 py-2 focus:ring-2 focus:ring-gray-200 focus:outline-none placeholder:text-gray-300 text-right font-medium"
                                                />
                                            </div>
                                            <button
                                                onClick={() => handleRemoveRule(stream.id, idx)}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    style={{ backgroundColor: primaryColor }}
                    className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white rounded-lg transition-all hover:opacity-90 disabled:opacity-50"
                >
                    <Save size={16} />
                    {isSaving ? 'Saving...' : 'Save Configuration'}
                </button>
            </div>
        </div>
    )
}
