'use client'

import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import GlobalDropdown from '@/components/GlobalDropdown'
import { addPastRecord, financeRoster } from '@/app/club/finance'
import { useScrollLock } from '@/hooks/useScrollLock'
import { clubToday } from '@/lib/club-time'
import { MonthPicker, inputClass, labelClass, recentMonths } from '@/components/club/finance-shared'

interface AddPastRecordModalProps {
    isOpen: boolean
    selectedMonth: string
    onClose: () => void
    onSaved: () => void
}

// Enter dues for a month before the club used the app: the fee owed for that month and what was already paid.
export default function AddPastRecordModal({ isOpen, selectedMonth, onClose, onSaved }: AddPastRecordModalProps) {
    useScrollLock(isOpen)
    const [members, setMembers] = useState<{ id: string; name: string; monthlyFee: number }[]>([])
    const [loading, setLoading] = useState(false)
    const [memberId, setMemberId] = useState('')
    const [period, setPeriod] = useState('')
    const [fee, setFee] = useState('')
    const [feeEdited, setFeeEdited] = useState(false)
    const [paid, setPaid] = useState('0')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!isOpen) return
        const current = clubToday().slice(0, 7)
        setMemberId(''); setFee(''); setFeeEdited(false); setPaid('0'); setError('')
        setPeriod(selectedMonth < current ? selectedMonth : (recentMonths(2)[1] || current)) // the month being viewed, else last month
        setLoading(true)
        financeRoster().then(res => { if (res.error) toast.error(res.error); setMembers(res.members || []); setLoading(false) })
    }, [isOpen, selectedMonth])

    if (!isOpen) return null

    function pickMember(id: string) {
        setMemberId(id)
        const m = members.find(x => x.id === id)
        if (m && !feeEdited && m.monthlyFee > 0) setFee(String(m.monthlyFee)) // suggest their usual fee until it is typed by hand
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault()
        const feeNumber = Number(fee), paidNumber = Number(paid || 0)
        if (!memberId) return setError('Select a member first.')
        if (!period) return setError('Select the month.')
        if (!(feeNumber > 0)) return setError('Enter the fee owed for that month.')
        if (!(paidNumber >= 0) || paidNumber > feeNumber) return setError('The amount already paid cannot be more than the fee.')
        setSaving(true); setError('')
        const res = await addPastRecord({ memberId, period, fee: feeNumber, paid: paidNumber })
        setSaving(false)
        if ('error' in res && res.error) return setError(res.error)
        toast.success(`Past record saved for ${'name' in res ? res.name : 'the member'}`)
        onSaved()
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <form onSubmit={submit} className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                        <h3 className="text-sm font-bold text-gray-900">Add past record</h3>
                        <p className="text-[11px] text-gray-400 mt-0.5 max-w-sm">Enter dues for a month before you used the app. It shows in that month’s dues and in the member’s total owed. Saving the same member and month again corrects it.</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 self-start"><X size={18} /></button>
                </div>
                <div className="px-6 py-5 space-y-4">
                    <div>
                        <label className={labelClass}>Member</label>
                        {loading ? <div className="flex items-center gap-2 text-sm text-gray-400 py-2.5"><Loader2 className="w-4 h-4 animate-spin" /> Loading members…</div> : (
                            <GlobalDropdown label="Search or choose a member" value={memberId} onChange={pickMember} options={members.map(m => ({ label: m.name, value: m.id }))} searchable fullWidth />
                        )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className={labelClass}>Month</label>
                            <MonthPicker value={period} onChange={setPeriod} />
                        </div>
                        <div>
                            <label className={labelClass}>Fee owed</label>
                            <input type="number" min="0.01" step="0.01" value={fee} onChange={e => { setFee(e.target.value); setFeeEdited(true); setError('') }} placeholder="0.00" className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Already paid</label>
                            <input type="number" min="0" step="0.01" value={paid} onChange={e => { setPaid(e.target.value); setError('') }} className={inputClass} />
                        </div>
                    </div>
                    {error && <p className="text-xs font-semibold text-red-600" role="alert">{error}</p>}
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                    <button type="submit" disabled={saving} className="px-5 py-2.5 text-sm font-black text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm disabled:opacity-50 flex items-center gap-2">
                        {saving && <Loader2 className="animate-spin w-4 h-4" />} Save record
                    </button>
                </div>
            </form>
        </div>
    )
}
