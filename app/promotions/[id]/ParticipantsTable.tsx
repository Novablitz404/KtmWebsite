'use client'

import { useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { updateRegistrationStatus } from '../actions'
import { toast } from 'sonner'

interface Registration {
    id: string
    playerName: string
    clubName: string | null
    currentBelt: string
    targetBelt: string | null
    status: string
    paymentStatus: string
    isJump: boolean
    createdAt: Date
}

interface ParticipantsTableProps {
    registrations: Registration[]
}

const STATUS_OPTIONS = ['PENDING', 'APPROVED', 'PASSED', 'FAILED'] as const

const statusStyles: Record<string, { bg: string; text: string; border: string; ring: string }> = {
    PENDING:  { bg: 'bg-yellow-50',  text: 'text-yellow-700',  border: 'border-yellow-200', ring: 'focus:ring-yellow-200' },
    APPROVED: { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',   ring: 'focus:ring-blue-200'   },
    PASSED:   { bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200',  ring: 'focus:ring-green-200'  },
    FAILED:   { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',    ring: 'focus:ring-red-200'    },
}

export default function ParticipantsTable({ registrations }: ParticipantsTableProps) {
    const [filterStatus, setFilterStatus] = useState<string>('ALL')
    const [searchQuery, setSearchQuery] = useState('')
    const [updatingId, setUpdatingId] = useState<string | null>(null)
    const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({})

    const getStatus = (reg: Registration) => localStatuses[reg.id] || reg.status

    const filteredRegs = registrations.filter(reg => {
        const status = getStatus(reg)
        const matchesStatus = filterStatus === 'ALL' || status === filterStatus
        const matchesSearch = reg.playerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (reg.clubName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
        return matchesStatus && matchesSearch
    })

    const handleStatusChange = async (regId: string, newStatus: string) => {
        setUpdatingId(regId)
        setLocalStatuses(prev => ({ ...prev, [regId]: newStatus }))

        const result = await updateRegistrationStatus(regId, newStatus)
        if (result.error) {
            toast.error(result.error)
            // Revert on error
            setLocalStatuses(prev => {
                const next = { ...prev }
                delete next[regId]
                return next
            })
        } else {
            toast.success('Status updated')
        }
        setUpdatingId(null)
    }

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search student or club..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
                    {['ALL', 'PENDING', 'APPROVED', 'PASSED', 'FAILED'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filterStatus === status
                                ? 'bg-gray-900 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                <th className="px-6 py-4">Student</th>
                                <th className="px-6 py-4">Club</th>
                                <th className="px-6 py-4">Belt / Target</th>
                                <th className="px-6 py-4">Payment</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredRegs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        No participants found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredRegs.map(reg => {
                                    const currentStatus = getStatus(reg)
                                    const style = statusStyles[currentStatus] || statusStyles.PENDING
                                    const isUpdating = updatingId === reg.id

                                    return (
                                        <tr key={reg.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900">
                                                {reg.playerName}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 text-sm">
                                                {reg.clubName || '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-700">{reg.currentBelt}</span>
                                                    <span className="text-gray-400">→</span>
                                                    <span className="px-2 py-0.5 bg-amber-50 border border-amber-100 text-amber-800 font-medium">{reg.targetBelt || '-'}</span>
                                                    {reg.isJump && (
                                                        <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 border border-purple-200 rounded text-[10px] font-bold">
                                                            JUMP
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${reg.paymentStatus === 'PAID'
                                                    ? 'bg-green-50 text-green-700 border-green-200'
                                                    : 'bg-gray-50 text-gray-500 border-gray-200'
                                                    }`}>
                                                    {reg.paymentStatus}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="relative inline-flex items-center">
                                                    <select
                                                        value={currentStatus}
                                                        onChange={e => handleStatusChange(reg.id, e.target.value)}
                                                        disabled={isUpdating}
                                                        className={`appearance-none cursor-pointer pl-3 pr-7 py-1.5 rounded-full text-xs font-bold border outline-none transition-all ${style.bg} ${style.text} ${style.border} ${style.ring} focus:ring-2 disabled:opacity-60 disabled:cursor-wait`}
                                                    >
                                                        {STATUS_OPTIONS.map(s => (
                                                            <option key={s} value={s}>{s}</option>
                                                        ))}
                                                    </select>
                                                    {isUpdating ? (
                                                        <Loader2 size={10} className="absolute right-2 animate-spin pointer-events-none" />
                                                    ) : (
                                                        <svg className="absolute right-2 w-2.5 h-2.5 pointer-events-none opacity-50" viewBox="0 0 10 6" fill="none">
                                                            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                        </svg>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
