'use client'

import { useState } from 'react'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Wallet, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import GlobalDropdown from '@/components/GlobalDropdown'
import PartialPaymentModal from '@/components/club/PartialPaymentModal'
import AddPastRecordModal from '@/components/club/AddPastRecordModal'
import MemberAccountModal from '@/components/club/MemberAccountModal'
import InvoicePreviewModal, { type InvoiceRequest } from '@/components/club/InvoicePreviewModal'
import { getFinanceMonth, markPaid, removeDue, deletePayment, type DueRow } from '@/app/club/finance'
import { clubToday, monthName } from '@/lib/club-time'
import { MonthPicker, StatusTag, money, shortDate, Bar } from '@/components/club/finance-shared'

const PAGE_SIZE = 15
const FILTERS = [
    { label: 'Unpaid dues', value: 'unpaid' },
    { label: 'All dues', value: 'all' },
    { label: 'Overdue', value: 'overdue' },
    { label: 'Due today', value: 'due today' },
    { label: 'Upcoming', value: 'upcoming' },
    { label: 'Paid', value: 'paid' },
    { label: 'Billing day not set', value: 'not set' },
]

// Finance tab of the club master dashboard: dues for a month, payments received, and the actions on them.
export default function ClubFinanceView() {
    const queryClient = useQueryClient()
    const [month, setMonth] = useState(() => clubToday().slice(0, 7))
    const [tab, setTab] = useState<'dues' | 'records'>('dues')
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState('unpaid')
    const [duesPage, setDuesPage] = useState(1)
    const [recordsPage, setRecordsPage] = useState(1)
    const [partial, setPartial] = useState<{ userId: string; name: string; period: string; remaining: number } | null>(null)
    const [pastOpen, setPastOpen] = useState(false)
    const [busyKey, setBusyKey] = useState<string | null>(null)
    const [account, setAccount] = useState<{ id: string; name: string } | null>(null)
    const [invoice, setInvoice] = useState<InvoiceRequest>(null)

    const { data, error } = useQuery({
        queryKey: ['club-finance', month],
        queryFn: async () => {
            const res = await getFinanceMonth(month)
            if (res.error) throw new Error(res.error)
            return { rows: res.rows || [], payments: res.payments || [] }
        },
        placeholderData: keepPreviousData,
    })
    const loading = !data && !error
    const rows = data?.rows || []
    const payments = data?.payments || []

    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['club-finance'] })
        queryClient.invalidateQueries({ queryKey: ['member-account'] })
    }

    const received = payments.reduce((sum, p) => sum + p.amount, 0)
    const outstanding = rows.reduce((sum, r) => sum + r.remaining, 0)
    const overdue = rows.filter(r => r.status === 'overdue').length

    const query = search.trim().toLowerCase()
    const filtered = rows
        .filter(r => filter === 'all' || (filter === 'unpaid' ? r.remaining > 0 : r.status === filter))
        .filter(r => !query || r.name.toLowerCase().includes(query))
    const duesPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const duesCurrent = Math.min(duesPage, duesPages)
    const duesShown = filtered.slice((duesCurrent - 1) * PAGE_SIZE, duesCurrent * PAGE_SIZE)
    const recordsPages = Math.max(1, Math.ceil(payments.length / PAGE_SIZE))
    const recordsCurrent = Math.min(recordsPage, recordsPages)
    const recordsShown = payments.slice((recordsCurrent - 1) * PAGE_SIZE, recordsCurrent * PAGE_SIZE)

    async function run(key: string, action: () => Promise<{ error?: string } & Record<string, any>>, success: (r: any) => string) {
        setBusyKey(key)
        const res = await action()
        setBusyKey(null)
        if (res.error) { toast.error(res.error); refresh(); return }
        toast.success(success(res))
        refresh()
    }

    function handlePaid(row: DueRow) {
        if (!confirm(`Record ${money(row.remaining)} as paid by ${row.name} for ${monthName(month)}? It is saved in Payment records, where you can delete it if it was a mistake.`)) return
        run(`paid-${row.userId}`, () => markPaid({ memberId: row.userId, period: month, expected: row.remaining }), r => `${r.name} marked paid: ${money(r.amount)}.`)
    }

    function handleRemove(row: DueRow) {
        if (!confirm(`Delete ${row.name}'s dues for ${monthName(month)}? They stop showing and no longer count as owed. Payments already recorded stay in Payment records. To bring the month back, use Add past record.`)) return
        run(`del-${row.userId}`, () => removeDue({ memberId: row.userId, period: month }), r => `${r.name}'s dues for ${monthName(month)} deleted`)
    }

    function handleDeletePayment(id: string, name: string, amount: number) {
        if (!confirm(`Delete the ${money(amount)} payment from ${name}? Their balance goes back up by that amount.`)) return
        run(`pay-${id}`, () => deletePayment(id), () => 'Payment deleted')
    }

    const th = 'px-5 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap'
    const td = 'px-5 py-3.5 text-sm'
    const btn = 'px-3 py-1.5 text-xs font-bold rounded-lg transition-colors disabled:opacity-50'

    const metric = (label: string, value: string, hint: string, tone = '') => (
        <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
            <p className={`text-2xl font-black mt-1.5 h-8 ${tone || 'text-gray-900'}`}>{loading ? <Bar className="w-24 h-7" /> : value}</p>
            <p className="text-[11px] text-gray-400 mt-1">{hint}</p>
        </div>
    )

    const pager = (current: number, pages: number, total: number, set: (n: number) => void) => total > PAGE_SIZE && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 text-xs text-gray-500">
            <span>Showing {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, total)} of {total}</span>
            <div className="flex items-center gap-2">
                <button disabled={current === 1} onClick={() => set(current - 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg font-semibold disabled:opacity-40 hover:bg-gray-50">Previous</button>
                <span>Page {current} of {pages}</span>
                <button disabled={current === pages} onClick={() => set(current + 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg font-semibold disabled:opacity-40 hover:bg-gray-50">Next</button>
            </div>
        </div>
    )

    const skeletonRows = (cols: number) => Array.from({ length: 5 }, (_, i) => (
        <tr key={i}>{Array.from({ length: cols }, (_, c) => <td key={c} className={td}><Bar className="w-20 h-4" /></td>)}</tr>
    ))

    return (
        <div className="flex flex-col h-full min-h-screen md:min-h-0 bg-gray-50 p-4 sm:p-6 gap-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center flex-shrink-0"><Wallet size={14} className="text-white" /></div>
                    <div>
                        <h2 className="text-sm font-bold text-gray-900">Finance</h2>
                        <p className="text-[11px] text-gray-400 mt-0.5">Track monthly due dates, unpaid balances and member payments.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="w-48"><MonthPicker value={month} onChange={m => { setMonth(m); setDuesPage(1); setRecordsPage(1) }} /></div>
                    <button type="button" onClick={() => setPastOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-bold rounded-xl transition-colors">
                        <Plus className="w-4 h-4" /> Add past record
                    </button>
                </div>
            </div>

            {error && <p className="text-sm text-red-500">{(error as Error).message}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {metric('Payments received', money(received), `Payments received in ${monthName(month)}`)}
                {metric('Unpaid dues', money(outstanding), 'Remaining balance for the selected month', outstanding > 0 ? 'text-red-600' : '')}
                {metric('Overdue members', String(overdue), 'Unpaid dues past the billing date', overdue > 0 ? 'text-red-600' : '')}
            </div>

            <div className="flex border-b border-gray-200 gap-1" role="tablist">
                {([['dues', 'Monthly dues tracker', null], ['records', 'Payment records', loading ? null : payments.length]] as const).map(([id, label, count]) => (
                    <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                        className={`px-4 py-3 text-sm font-bold border-b-2 -mb-px transition-colors flex items-center gap-2 ${tab === id ? 'border-red-600 text-red-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                        {label}
                        {count !== null && <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${tab === id ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}>{count}</span>}
                    </button>
                ))}
            </div>

            {tab === 'dues' ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-visible">
                    <div className="flex items-center gap-3 flex-wrap px-6 py-4 border-b border-gray-100">
                        <div className="relative flex-1 min-w-[200px] max-w-xs">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input value={search} onChange={e => { setSearch(e.target.value); setDuesPage(1) }} placeholder="Search member…"
                                className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none text-sm" />
                        </div>
                        <div className="w-52"><GlobalDropdown label="Filter dues" value={filter} onChange={v => { setFilter(v); setDuesPage(1) }} options={FILTERS} fullWidth /></div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50/70">
                                <tr>{['Member', 'Due date', 'Fee', 'Paid', 'Balance', 'Total owed', 'Status', 'Actions'].map(h => <th key={h} className={th}>{h}</th>)}</tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? skeletonRows(8) : duesShown.length === 0 ? (
                                    <tr><td colSpan={8} className="px-6 py-14 text-center text-sm text-gray-400">{rows.length === 0 ? `No dues for ${monthName(month)}. Set a monthly fee on a member to start billing them.` : 'No members match.'}</td></tr>
                                ) : duesShown.map(r => (
                                    <tr key={r.userId} className="hover:bg-gray-50/50">
                                        <td className={`${td} font-semibold text-gray-900`}>
                                            <button type="button" onClick={() => setAccount({ id: r.userId, name: r.name })} aria-label={`Open account for ${r.name}`} className="text-left hover:text-red-600 hover:underline">{r.name}</button>
                                        </td>
                                        <td className={`${td} text-gray-600 whitespace-nowrap`}>{r.dueDate ? shortDate(r.dueDate) : 'Not set'}</td>
                                        <td className={`${td} text-gray-600`}>{money(r.fee)}</td>
                                        <td className={`${td} text-gray-600`}>{money(r.paid)}</td>
                                        <td className={`${td} font-bold ${r.remaining > 0 ? 'text-red-600' : 'text-gray-900'}`}>{money(r.remaining)}</td>
                                        <td className={`${td} text-gray-600`}>{r.owedTotal > 0 ? money(r.owedTotal) : '—'}</td>
                                        <td className={td}><StatusTag status={r.status} /></td>
                                        <td className={`${td} whitespace-nowrap`}>
                                            <div className="flex items-center gap-1.5">
                                                {r.remaining > 0 ? (
                                                    <>
                                                        <button disabled={busyKey === `paid-${r.userId}`} onClick={() => handlePaid(r)} className={`${btn} bg-red-600 text-white hover:bg-red-700`}>Paid</button>
                                                        <button onClick={() => setPartial({ userId: r.userId, name: r.name, period: month, remaining: r.remaining })} className={`${btn} border border-gray-200 text-gray-700 hover:bg-gray-50`}>Partial</button>
                                                    </>
                                                ) : <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">Settled</span>}
                                                <button onClick={() => setInvoice({ memberId: r.userId, name: r.name, periods: [month] })} className={`${btn} border border-gray-200 text-gray-700 hover:bg-gray-50`}>Invoice</button>
                                                <button disabled={busyKey === `del-${r.userId}`} onClick={() => handleRemove(r)} className={`${btn} border border-gray-200 text-gray-500 hover:bg-gray-50`}>Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {pager(duesCurrent, duesPages, filtered.length, setDuesPage)}
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-visible">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h3 className="text-sm font-bold text-gray-900">Payments in {monthName(month)}</h3>
                        <p className="text-[11px] text-gray-400 mt-0.5">{loading ? '' : `${payments.length} ${payments.length === 1 ? 'payment' : 'payments'} totalling ${money(received)}`}</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50/70"><tr>{['Date', 'Member', 'Category', 'For', 'Amount', 'Note', 'Actions'].map(h => <th key={h} className={th}>{h}</th>)}</tr></thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? skeletonRows(7) : recordsShown.length === 0 ? (
                                    <tr><td colSpan={7} className="px-6 py-14 text-center text-sm text-gray-400">No payments recorded in {monthName(month)}.</td></tr>
                                ) : recordsShown.map(p => (
                                    <tr key={p.id} className="hover:bg-gray-50/50">
                                        <td className={`${td} text-gray-600 whitespace-nowrap`}>{shortDate(p.paidOn)}</td>
                                        <td className={`${td} font-semibold text-gray-900`}>{p.name}</td>
                                        <td className={`${td} text-gray-600`}>{p.category}</td>
                                        <td className={`${td} text-gray-600 whitespace-nowrap`}>{p.period ? monthName(p.period) : '—'}</td>
                                        <td className={`${td} font-bold text-gray-900`}>{money(p.amount)}</td>
                                        <td className={`${td} text-gray-500`}>{p.note || ''}</td>
                                        <td className={td}><button disabled={busyKey === `pay-${p.id}`} onClick={() => handleDeletePayment(p.id, p.name, p.amount)} className={`${btn} border border-gray-200 text-gray-500 hover:bg-gray-50`}>Delete</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {pager(recordsCurrent, recordsPages, payments.length, setRecordsPage)}
                </div>
            )}

            <PartialPaymentModal target={partial} onClose={() => setPartial(null)} onSaved={refresh} />
            <AddPastRecordModal isOpen={pastOpen} selectedMonth={month} onClose={() => setPastOpen(false)} onSaved={refresh} />
            <MemberAccountModal member={account} onClose={() => setAccount(null)} onChanged={refresh} onInvoice={(memberId, name, periods) => setInvoice({ memberId, name, periods })} />
            <InvoicePreviewModal request={invoice} onClose={() => setInvoice(null)} />
        </div>
    )
}
