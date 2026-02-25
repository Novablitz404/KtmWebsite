'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'

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

export default function ParticipantsTable({ registrations }: ParticipantsTableProps) {
    const [filterStatus, setFilterStatus] = useState<string>('ALL')
    const [searchQuery, setSearchQuery] = useState('')

    const filteredRegs = registrations.filter(reg => {
        const matchesStatus = filterStatus === 'ALL' || reg.status === filterStatus
        const matchesSearch = reg.playerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (reg.clubName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
        return matchesStatus && matchesSearch
    })

    const statusColors: Record<string, string> = {
        PENDING: 'bg-yellow-100 text-yellow-800',
        APPROVED: 'bg-blue-100 text-blue-800',
        PASSED: 'bg-green-100 text-green-800',
        FAILED: 'bg-red-100 text-red-800'
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
                                filteredRegs.map(reg => (
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
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[reg.status] || 'bg-gray-100 text-gray-600'}`}>
                                                {reg.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
