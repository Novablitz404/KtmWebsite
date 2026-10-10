'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2, Trash2, ChevronDown } from 'lucide-react'
import { updateRegistrationStatus, deletePromotionRegistration } from '../actions'
import { toast } from 'sonner'
import GlobalDropdown from '@/components/GlobalDropdown'
import GlobalModal from '@/components/GlobalModal'

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
    const [deleteTarget, setDeleteTarget] = useState<Registration | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
    const router = useRouter()

    const getStatus = (reg: Registration) => localStatuses[reg.id] || reg.status

    const filteredRegs = registrations.filter(reg => {
        if (deletedIds.has(reg.id)) return false
        const status = getStatus(reg)
        const matchesStatus = filterStatus === 'ALL' || status === filterStatus
        const matchesSearch = reg.playerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (reg.clubName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
        return matchesStatus && matchesSearch
    })

    const handleStatusChange = async (regId: string, selected: string) => {
        const jump = selected === 'PASSED_JUMP'
        const newStatus = jump ? 'PASSED' : selected
        setUpdatingId(regId)
        setLocalStatuses(prev => ({ ...prev, [regId]: newStatus }))

        const result = await updateRegistrationStatus(regId, newStatus, jump)
        if (result.error) {
            toast.error(result.error)
            // Revert on error
            setLocalStatuses(prev => {
                const next = { ...prev }
                delete next[regId]
                return next
            })
        } else {
            toast.success(jump ? 'Passed with jump — promoted two ranks' : 'Status updated')
        }
        setUpdatingId(null)
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setIsDeleting(true)
        const result = await deletePromotionRegistration(deleteTarget.id)
        setIsDeleting(false)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('Participant removed')
            setDeletedIds(prev => new Set(prev).add(deleteTarget.id))
            router.refresh()
        }
        setDeleteTarget(null)
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
                    <table className="w-full text-left border-collapse min-w-[760px]">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                <th className="px-4 py-3 whitespace-nowrap">Student</th>
                                <th className="px-4 py-3 whitespace-nowrap">Club</th>
                                <th className="px-4 py-3 whitespace-nowrap">Belt / Target</th>
                                <th className="px-4 py-3 whitespace-nowrap">Payment</th>
                                <th className="px-4 py-3 whitespace-nowrap">Status</th>
                                <th className="px-4 py-3 whitespace-nowrap text-right"><span className="sr-only">Delete</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredRegs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        No participants found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredRegs.map(reg => {
                                    const currentStatus = getStatus(reg)
                                    const style = statusStyles[currentStatus] || statusStyles.PENDING
                                    const isUpdating = updatingId === reg.id
                                    const isLocked = currentStatus === 'PASSED' || currentStatus === 'FAILED'

                                    return (
                                        <tr key={reg.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                                                {reg.playerName}
                                            </td>
                                            <td title={reg.clubName || undefined} className="px-4 py-3 text-gray-600 text-sm max-w-[180px] truncate">
                                                {reg.clubName || '-'}
                                            </td>
                                            <td className="px-4 py-3">
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
                                            <td className="px-4 py-3">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${reg.paymentStatus === 'PAID'
                                                    ? 'bg-green-50 text-green-700 border-green-200'
                                                    : 'bg-gray-50 text-gray-500 border-gray-200'
                                                    }`}>
                                                    {reg.paymentStatus}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {isLocked ? (
                                                    <span
                                                        title="Result locked — change the athlete's belt in the Athletes tab to correct it"
                                                        className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold border ${style.bg} ${style.text} ${style.border}`}
                                                    >
                                                        {currentStatus}
                                                    </span>
                                                ) : (
                                                    <GlobalDropdown
                                                        value={currentStatus}
                                                        onChange={val => handleStatusChange(reg.id, val)}
                                                        width="w-40"
                                                        options={[
                                                            ...STATUS_OPTIONS.map(s => ({ value: s, label: s })),
                                                            { value: 'PASSED_JUMP', label: 'PASSED + JUMP' },
                                                        ]}
                                                        trigger={
                                                            <button
                                                                type="button"
                                                                disabled={isUpdating}
                                                                className={`inline-flex items-center justify-between gap-2 min-w-[130px] px-3 py-1.5 rounded-full text-xs font-bold border transition-all disabled:opacity-60 disabled:cursor-wait ${style.bg} ${style.text} ${style.border}`}
                                                            >
                                                                {currentStatus}
                                                                {isUpdating ? <Loader2 size={12} className="animate-spin" /> : <ChevronDown size={12} className="opacity-60" />}
                                                            </button>
                                                        }
                                                    />
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleteTarget(reg)}
                                                    title="Delete participant"
                                                    aria-label={`Delete ${reg.playerName}`}
                                                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <GlobalModal
                isOpen={!!deleteTarget}
                onClose={() => !isDeleting && setDeleteTarget(null)}
                onConfirm={handleDelete}
                title="Remove participant?"
                message={
                    <>
                        {deleteTarget?.playerName} will be removed from this promotion test.
                        {deleteTarget?.status === 'PASSED' && ' Their belt will NOT be reverted — change it in the Athletes tab if needed.'}
                    </>
                }
                confirmLabel="Remove"
                danger
                loading={isDeleting}
            />
        </div>
    )
}
