'use client'

import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getAdvancePayments, createAdvancePayment, updateAdvancePaymentStatus, deleteAdvancePayment, getOrganizationAthletes, getOrganizationEvents } from '@/app/organization/actions'
import { Plus, Search, X, Clock, CheckCircle2, RotateCcw, Trash2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import GlobalDropdown from '@/components/GlobalDropdown'

type AdvancePayment = Awaited<ReturnType<typeof getAdvancePayments>>[0]

function formatCurrency(amount: number) {
    return '₱' + amount.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function formatDate(date: Date | string) {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const STATUS_CONFIG = {
    UNMATCHED: { label: 'Unmatched', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
    MATCHED: { label: 'Matched', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    REFUNDED: { label: 'Refunded', color: 'bg-gray-50 text-gray-600 border-gray-200', icon: RotateCcw },
}

export default function AdvancePaymentsView({ primaryColor }: { primaryColor: string }) {
    const queryClient = useQueryClient()
    const [showModal, setShowModal] = useState(false)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNMATCHED' | 'MATCHED' | 'REFUNDED'>('ALL')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [selectedPayerId, setSelectedPayerId] = useState('')
    const [autoClubName, setAutoClubName] = useState('')
    const [selectedEventId, setSelectedEventId] = useState('')

    const { data: payments = [], isLoading } = useQuery({
        queryKey: ['advance-payments'],
        queryFn: () => getAdvancePayments(),
    })

    const { data: athletes = [] } = useQuery({
        queryKey: ['org-athletes'],
        queryFn: () => getOrganizationAthletes(),
    })

    // Build dropdown options from athletes: "Name (Club)"
    const payerOptions = useMemo(() => {
        return athletes.map(a => ({
            value: a.id,
            label: `${a.name || 'Unknown'}${a.clubName ? ` (${a.clubName})` : ''}`,
        }))
    }, [athletes])

    // Map athlete ID -> athlete for quick lookup
    const athleteMap = useMemo(() => {
        const map: Record<string, typeof athletes[0]> = {}
        athletes.forEach(a => { map[a.id] = a })
        return map
    }, [athletes])

    const { data: events = [] } = useQuery({
        queryKey: ['org-events'],
        queryFn: () => getOrganizationEvents(),
    })

    const TYPE_LABELS: Record<string, string> = { tournament: 'Tournament', seminar: 'Seminar', promotion: 'Belt Test' }

    const eventOptions = useMemo(() => {
        return events.map(e => ({
            value: e.id,
            label: `${e.name} (${TYPE_LABELS[e.type] || e.type})`,
        }))
    }, [events])

    const eventMap = useMemo(() => {
        const map: Record<string, typeof events[0]> = {}
        events.forEach(e => { map[e.id] = e })
        return map
    }, [events])

    const filtered = payments.filter(p => {
        if (statusFilter !== 'ALL' && p.status !== statusFilter) return false
        if (search.trim()) {
            const q = search.toLowerCase()
            return p.payerName.toLowerCase().includes(q) ||
                (p.clubName?.toLowerCase().includes(q)) ||
                (p.eventName?.toLowerCase().includes(q))
        }
        return true
    })

    const unmatchedTotal = payments.filter(p => p.status === 'UNMATCHED').reduce((s, p) => s + p.amount, 0)
    const unmatchedCount = payments.filter(p => p.status === 'UNMATCHED').length

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setIsSubmitting(true)
        const form = e.currentTarget
        const fd = new FormData(form)

        const selectedEvent = eventMap[selectedEventId]

        const result = await createAdvancePayment({
            payerName: athleteMap[selectedPayerId]?.name || 'Unknown',
            clubName: autoClubName || undefined,
            amount: parseFloat(fd.get('amount') as string),
            eventType: selectedEvent?.type || undefined,
            eventId: selectedEvent?.id || undefined,
            eventName: selectedEvent?.name || undefined,
            notes: (fd.get('notes') as string) || undefined,
            paidAt: fd.get('paidAt') as string,
        })

        if ('error' in result) {
            toast.error(result.error)
        } else {
            toast.success('Payment recorded')
            queryClient.invalidateQueries({ queryKey: ['advance-payments'] })
            setShowModal(false)
            setSelectedPayerId('')
            setAutoClubName('')
            setSelectedEventId('')
        }
        setIsSubmitting(false)
    }

    async function handleStatusChange(id: string, status: 'MATCHED' | 'REFUNDED' | 'UNMATCHED') {
        const result = await updateAdvancePaymentStatus(id, status)
        if ('error' in result) {
            toast.error(result.error)
        } else {
            toast.success(`Payment marked as ${status.toLowerCase()}`)
            queryClient.invalidateQueries({ queryKey: ['advance-payments'] })
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Delete this advance payment record?')) return
        const result = await deleteAdvancePayment(id)
        if ('error' in result) {
            toast.error(result.error)
        } else {
            toast.success('Payment deleted')
            queryClient.invalidateQueries({ queryKey: ['advance-payments'] })
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Unmatched Alert Banner */}
            {unmatchedCount > 0 && (
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <AlertCircle className="text-amber-500 shrink-0" size={20} />
                    <div>
                        <p className="font-semibold text-amber-800">
                            {unmatchedCount} unmatched payment{unmatchedCount !== 1 ? 's' : ''} totaling {formatCurrency(unmatchedTotal)}
                        </p>
                        <p className="text-sm text-amber-600">These payments haven&apos;t been linked to any athlete registration yet.</p>
                    </div>
                </div>
            )}

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    {['ALL', 'UNMATCHED', 'MATCHED', 'REFUNDED'].map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s as any)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${statusFilter === s ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 w-48"
                        />
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-sm transition-all hover:opacity-90"
                        style={{ backgroundColor: primaryColor }}
                    >
                        <Plus size={16} />
                        Record Payment
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {filtered.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <Clock size={40} className="mx-auto mb-3 opacity-40" />
                        <p className="font-medium">No advance payments found</p>
                        <p className="text-sm mt-1">Record a payment to get started</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Payer</th>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Club</th>
                                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Event</th>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Paid</th>
                                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filtered.map(payment => {
                                const cfg = STATUS_CONFIG[payment.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.UNMATCHED
                                const Icon = cfg.icon
                                return (
                                    <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-gray-900">{payment.payerName}</p>
                                            {payment.notes && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{payment.notes}</p>}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{payment.clubName || '—'}</td>
                                        <td className="px-6 py-4 text-right font-semibold text-gray-900">{formatCurrency(payment.amount)}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{payment.eventName || '—'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{formatDate(payment.paidAt)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${cfg.color}`}>
                                                <Icon size={12} />
                                                {cfg.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {payment.status === 'UNMATCHED' && (
                                                    <button
                                                        onClick={() => handleStatusChange(payment.id, 'MATCHED')}
                                                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                                        title="Mark as Matched"
                                                    >
                                                        <CheckCircle2 size={16} />
                                                    </button>
                                                )}
                                                {payment.status === 'UNMATCHED' && (
                                                    <button
                                                        onClick={() => handleStatusChange(payment.id, 'REFUNDED')}
                                                        className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-md transition-colors"
                                                        title="Mark as Refunded"
                                                    >
                                                        <RotateCcw size={16} />
                                                    </button>
                                                )}
                                                {payment.status !== 'UNMATCHED' && (
                                                    <button
                                                        onClick={() => handleStatusChange(payment.id, 'UNMATCHED')}
                                                        className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-md transition-colors"
                                                        title="Reset to Unmatched"
                                                    >
                                                        <Clock size={16} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(payment.id)}
                                                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-md transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Record Payment Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">Record Advance Payment</h3>
                            <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Payer Name *</label>
                                <GlobalDropdown
                                    options={payerOptions}
                                    value={selectedPayerId}
                                    onChange={(val) => {
                                        setSelectedPayerId(val)
                                        const athlete = athleteMap[val]
                                        setAutoClubName(athlete?.clubName || '')
                                    }}
                                    searchable
                                    fullWidth
                                    label="Select athlete..."
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Club Name</label>
                                <input
                                    value={autoClubName}
                                    onChange={e => setAutoClubName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 bg-gray-50"
                                    placeholder="Auto-filled from selected athlete"
                                    readOnly
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₱) *</label>
                                <input name="amount" type="number" min="1" step="0.01" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300" placeholder="0.00" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">For Event</label>
                                <GlobalDropdown
                                    options={eventOptions}
                                    value={selectedEventId}
                                    onChange={setSelectedEventId}
                                    searchable
                                    fullWidth
                                    label="Select event (optional)"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date Paid *</label>
                                <input name="paidAt" type="date" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300" defaultValue={new Date().toISOString().split('T')[0]} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <textarea name="notes" rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none" placeholder="Optional notes..." />
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-2.5 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90 disabled:opacity-50"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {isSubmitting ? 'Saving...' : 'Record Payment'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
