'use client'

import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getExpenses, createExpense, deleteExpense, getOrganizationEvents } from '@/app/organization/actions'
import { Plus, Search, X, Receipt, Trash2, Tag } from 'lucide-react'
import { toast } from 'sonner'
import GlobalDropdown from '@/components/GlobalDropdown'

function formatCurrency(amount: number) {
    return '₱' + amount.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function formatDate(date: Date | string) {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const CATEGORIES = [
    { value: 'VENUE', label: 'Venue', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { value: 'EQUIPMENT', label: 'Equipment', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { value: 'MEDALS', label: 'Medals / Trophies', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { value: 'TRAVEL', label: 'Travel', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    { value: 'FOOD', label: 'Food', color: 'bg-orange-50 text-orange-700 border-orange-200' },
    { value: 'PRINTING', label: 'Printing', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    { value: 'OFFICIALS', label: 'Officials', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { value: 'MISC', label: 'Miscellaneous', color: 'bg-gray-50 text-gray-600 border-gray-200' },
]

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.value, c]))

export default function ExpensesView({ primaryColor }: { primaryColor: string }) {
    const queryClient = useQueryClient()
    const [showModal, setShowModal] = useState(false)
    const [search, setSearch] = useState('')
    const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [selectedCategory, setSelectedCategory] = useState('VENUE')
    const [selectedEventId, setSelectedEventId] = useState('')

    const { data: expenses = [], isLoading } = useQuery({
        queryKey: ['expenses'],
        queryFn: () => getExpenses(),
    })

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

    const categoryOptions = CATEGORIES.map(c => ({ value: c.value, label: c.label }))

    const filtered = expenses.filter(e => {
        if (categoryFilter !== 'ALL' && e.category !== categoryFilter) return false
        if (search.trim()) {
            const q = search.toLowerCase()
            return e.description.toLowerCase().includes(q) ||
                (e.eventName?.toLowerCase().includes(q))
        }
        return true
    })

    // Summary by category
    const categoryTotals: Record<string, number> = {}
    let grandTotal = 0
    expenses.forEach(e => {
        categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount
        grandTotal += e.amount
    })

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setIsSubmitting(true)
        const form = e.currentTarget
        const fd = new FormData(form)
        const selectedEvent = eventMap[selectedEventId]

        const result = await createExpense({
            description: fd.get('description') as string,
            amount: parseFloat(fd.get('amount') as string),
            category: selectedCategory,
            date: fd.get('date') as string,
            eventType: selectedEvent?.type || undefined,
            eventId: selectedEvent?.id || undefined,
            eventName: selectedEvent?.name || undefined,
        })

        if ('error' in result) {
            toast.error(result.error)
        } else {
            toast.success('Expense added')
            queryClient.invalidateQueries({ queryKey: ['expenses'] })
            setShowModal(false)
            setSelectedCategory('VENUE')
            setSelectedEventId('')
        }
        setIsSubmitting(false)
    }

    async function handleDelete(id: string) {
        if (!confirm('Delete this expense?')) return
        const result = await deleteExpense(id)
        if ('error' in result) {
            toast.error(result.error)
        } else {
            toast.success('Expense deleted')
            queryClient.invalidateQueries({ queryKey: ['expenses'] })
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
            {/* Category Summary Cards */}
            {expenses.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Expenses</p>
                        <p className="text-2xl font-black text-gray-900 mt-1">{formatCurrency(grandTotal)}</p>
                        <p className="text-xs text-gray-400 mt-1">{expenses.length} item{expenses.length !== 1 ? 's' : ''}</p>
                    </div>
                    {Object.entries(categoryTotals).sort(([, a], [, b]) => b - a).slice(0, 3).map(([cat, total]) => {
                        const cfg = CATEGORY_MAP[cat]
                        return (
                            <div key={cat} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{cfg?.label || cat}</p>
                                <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(total)}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    {grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0}% of total
                                </p>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => setCategoryFilter('ALL')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${categoryFilter === 'ALL' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        All
                    </button>
                    {CATEGORIES.map(c => (
                        <button
                            key={c.value}
                            onClick={() => setCategoryFilter(c.value)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${categoryFilter === c.value ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {c.label}
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
                        Add Expense
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {filtered.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <Receipt size={40} className="mx-auto mb-3 opacity-40" />
                        <p className="font-medium">No expenses found</p>
                        <p className="text-sm mt-1">Add an expense to start tracking</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Event</th>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filtered.map(expense => {
                                const cfg = CATEGORY_MAP[expense.category]
                                return (
                                    <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-gray-900">{expense.description}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${cfg?.color || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                                <Tag size={10} />
                                                {cfg?.label || expense.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-semibold text-gray-900">{formatCurrency(expense.amount)}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{expense.eventName || '—'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{formatDate(expense.date)}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDelete(expense.id)}
                                                className="p-1.5 text-red-400 hover:bg-red-50 rounded-md transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-50 border-t border-gray-200">
                                <td colSpan={2} className="px-6 py-3 font-bold text-gray-900 text-right">Total</td>
                                <td className="px-6 py-3 text-right font-black text-gray-900">{formatCurrency(filtered.reduce((s, e) => s + e.amount, 0))}</td>
                                <td colSpan={3} />
                            </tr>
                        </tfoot>
                    </table>
                )}
            </div>

            {/* Add Expense Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">Add Expense</h3>
                            <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                                <input name="description" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300" placeholder="e.g. Venue rental for tournament" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₱) *</label>
                                <input name="amount" type="number" min="1" step="0.01" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300" placeholder="0.00" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                                <GlobalDropdown
                                    options={categoryOptions}
                                    value={selectedCategory}
                                    onChange={setSelectedCategory}
                                    searchable
                                    fullWidth
                                    label="Select category"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                                <input name="date" type="date" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300" defaultValue={new Date().toISOString().split('T')[0]} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Related Event</label>
                                <GlobalDropdown
                                    options={eventOptions}
                                    value={selectedEventId}
                                    onChange={setSelectedEventId}
                                    searchable
                                    fullWidth
                                    label="Select event (optional)"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-2.5 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90 disabled:opacity-50"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {isSubmitting ? 'Saving...' : 'Add Expense'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
