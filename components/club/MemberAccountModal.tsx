'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { X, FileText } from 'lucide-react'
import { toast } from 'sonner'
import PartialPaymentModal from '@/components/club/PartialPaymentModal'
import { getMemberAccount, markPaid, payAll, deletePayment } from '@/app/club/finance'
import { useScrollLock } from '@/hooks/useScrollLock'
import { monthName } from '@/lib/club-time'
import { StatusTag, money, shortDate, Bar } from '@/components/club/finance-shared'

interface MemberAccountModalProps {
    member: { id: string; name: string } | null
    onClose: () => void
    onChanged: () => void
    onInvoice: (memberId: string, name: string, periods: string[]) => void
}

// A member's account: what they owe in total, month by month, with Paid / Partial / Invoice for each month, Pay all, and
// their payment history. The amounts are worked out by the server; this is the screen.
export default function MemberAccountModal({ member, onClose, onChanged, onInvoice }: MemberAccountModalProps) {
    useScrollLock(!!member)
    const queryClient = useQueryClient()
    const [showPaid, setShowPaid] = useState(false)
    const [partial, setPartial] = useState<{ userId: string; name: string; period: string; remaining: number } | null>(null)
    const [busy, setBusy] = useState<string | null>(null)

    const { data, error } = useQuery({
        queryKey: ['member-account', member?.id],
        enabled: !!member,
        queryFn: async () => {
            const res = await getMemberAccount(member!.id)
            if (res.error || !res.account) throw new Error(res.error || 'Could not load the account')
            return res.account
        },
    })
    if (!member) return null
    const loading = !data && !error
    const memberId = member.id

    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['member-account', memberId] })
        onChanged()
    }
    const months = data?.months || []
    const owing = months.filter(m => m.owed > 0)
    const listed = showPaid ? months : owing
    const owingOldestFirst = [...owing].reverse()

    async function run(key: string, action: () => Promise<any>, success: (r: any) => string) {
        setBusy(key)
        const res = await action()
        setBusy(null)
        if (res.error) { toast.error(res.error); refresh(); return }
        toast.success(success(res))
        refresh()
    }

    const th = 'px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap'
    const td = 'px-3 py-2.5 text-sm'
    const btn = 'px-2.5 py-1 text-xs font-bold rounded-lg transition-colors disabled:opacity-50'
    const tile = (label: string, value: number | undefined, tone = '') => (
        <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
            <p className={`text-xl font-black mt-1 h-7 ${tone || 'text-gray-900'}`}>{value === undefined ? <Bar className="w-20 h-6" /> : money(value)}</p>
        </div>
    )

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                    <div>
                        <h3 className="text-base font-black text-gray-900">{member.name}</h3>
                        <p className="text-xs text-gray-400 mt-0.5 h-4">
                            {loading ? <Bar className="w-56 h-3.5" /> : `Fee ${money(data?.member.monthlyFee || 0)} · ${data?.member.billingDay ? `Billed on day ${data.member.billingDay}` : 'No billing day set'}${data?.member.status === 'INACTIVE' ? ' · inactive' : ''}`}
                        </p>
                    </div>
                    <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {error && <p className="text-sm text-red-500">{(error as Error).message}</p>}

                    <div className="grid grid-cols-3 gap-3">
                        {tile('Total owed', data?.totals.owed, (data?.totals.owed || 0) > 0 ? 'text-red-600' : '')}
                        {tile('This month', data?.totals.thisMonth)}
                        {tile('Earlier months', data?.totals.earlier)}
                    </div>

                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <p className="text-xs text-gray-400">
                            {loading ? <Bar className="w-48 h-3.5" /> : data?.lastPayment ? `Last payment ${shortDate(data.lastPayment.paidOn)} · ${money(data.lastPayment.amount)}` : 'No payments recorded yet'}
                        </p>
                        <div className="flex items-center gap-2">
                            <button disabled={loading || owing.length === 0} onClick={() => onInvoice(memberId, member.name, owingOldestFirst.map(m => m.period))}
                                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-bold rounded-xl transition-colors disabled:opacity-50">
                                <FileText size={14} /> Invoice for everything owed
                            </button>
                            <button disabled={loading || owing.length === 0 || busy === 'all'}
                                onClick={() => {
                                    if (!data) return
                                    if (!confirm(`Record ${money(data.totals.owed)} as paid by ${member.name} for ${owing.length} month${owing.length === 1 ? '' : 's'}? Each month is saved in Payment records.`)) return
                                    run('all', () => payAll({ memberId, expected: data.totals.owed }), r => `${r.name} paid ${money(r.amount)} for ${r.months} month${r.months === 1 ? '' : 's'}.`)
                                }}
                                className="px-4 py-2 text-sm font-black text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm disabled:opacity-50">
                                {loading ? 'Pay all' : owing.length ? `Pay all ${money(data!.totals.owed)}` : 'Nothing owed'}
                            </button>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-bold text-gray-900">Months</h4>
                            {!loading && months.length > owing.length && (
                                <button onClick={() => setShowPaid(v => !v)} className="text-xs font-bold text-red-600 hover:underline">{showPaid ? 'Hide' : 'Show'} paid months ({months.length - owing.length})</button>
                            )}
                        </div>
                        <div className="overflow-x-auto rounded-2xl border border-gray-100">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50/70"><tr>{['Month', 'Fee', 'Paid', 'Owed', 'Status', 'Actions'].map(h => <th key={h} className={th}>{h}</th>)}</tr></thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loading ? [0, 1, 2].map(i => <tr key={i}>{[0, 1, 2, 3, 4, 5].map(c => <td key={c} className={td}><Bar className="w-16 h-4" /></td>)}</tr>)
                                        : months.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-gray-400">This member has no monthly fee, so nothing is billed.</td></tr>
                                        : listed.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-gray-400">All paid up. Nothing is owed.</td></tr>
                                        : listed.map(m => (
                                            <tr key={m.period}>
                                                <td className={`${td} font-semibold text-gray-900 whitespace-nowrap`}>{monthName(m.period)}</td>
                                                <td className={`${td} text-gray-600`}>{money(m.fee)}</td>
                                                <td className={`${td} text-gray-600`}>{money(m.paid)}</td>
                                                <td className={`${td} font-bold ${m.owed > 0 ? 'text-red-600' : 'text-gray-900'}`}>{money(m.owed)}</td>
                                                <td className={td}><StatusTag status={m.status} /></td>
                                                <td className={`${td} whitespace-nowrap`}>
                                                    <div className="flex items-center gap-1.5">
                                                        {m.owed > 0 ? (
                                                            <>
                                                                <button disabled={busy === `paid-${m.period}`} className={`${btn} bg-red-600 text-white hover:bg-red-700`}
                                                                    onClick={() => { if (confirm(`Record ${money(m.owed)} as paid by ${member.name} for ${monthName(m.period)}?`)) run(`paid-${m.period}`, () => markPaid({ memberId, period: m.period, expected: m.owed }), r => `${r.name} marked paid: ${money(r.amount)}.`) }}>Paid</button>
                                                                <button className={`${btn} border border-gray-200 text-gray-700 hover:bg-gray-50`} onClick={() => setPartial({ userId: memberId, name: member.name, period: m.period, remaining: m.owed })}>Partial</button>
                                                            </>
                                                        ) : <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">Settled</span>}
                                                        <button className={`${btn} border border-gray-200 text-gray-500 hover:bg-gray-50`} onClick={() => onInvoice(memberId, member.name, [m.period])}>Invoice</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-bold text-gray-900 mb-2">Payment history</h4>
                        <div className="overflow-x-auto rounded-2xl border border-gray-100">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50/70"><tr>{['Date', 'For', 'Amount', 'Note', ''].map((h, i) => <th key={i} className={th}>{h}</th>)}</tr></thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loading ? [0, 1].map(i => <tr key={i}>{[0, 1, 2, 3, 4].map(c => <td key={c} className={td}><Bar className="w-16 h-4" /></td>)}</tr>)
                                        : (data?.payments.length || 0) === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-gray-400">No payments yet.</td></tr>
                                        : data!.payments.map(p => (
                                            <tr key={p.id}>
                                                <td className={`${td} text-gray-600 whitespace-nowrap`}>{shortDate(p.paidOn)}</td>
                                                <td className={`${td} text-gray-600 whitespace-nowrap`}>{p.period ? monthName(p.period) : p.category}</td>
                                                <td className={`${td} font-bold text-gray-900`}>{money(p.amount)}</td>
                                                <td className={`${td} text-gray-500`}>{p.note || ''}</td>
                                                <td className={td}><button disabled={busy === `pay-${p.id}`} className={`${btn} border border-gray-200 text-gray-500 hover:bg-gray-50`}
                                                    onClick={() => { if (confirm(`Delete the ${money(p.amount)} payment? The balance goes back up by that amount.`)) run(`pay-${p.id}`, () => deletePayment(p.id), () => 'Payment deleted') }}>Delete</button></td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            <PartialPaymentModal target={partial} onClose={() => setPartial(null)} onSaved={refresh} />
        </div>
    )
}
