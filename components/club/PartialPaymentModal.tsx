'use client'

import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { partialPayment } from '@/app/club/finance'
import { useScrollLock } from '@/hooks/useScrollLock'
import { monthName } from '@/lib/club-time'
import { money, inputClass, labelClass } from '@/components/club/finance-shared'

interface PartialPaymentModalProps {
    target: { userId: string; name: string; period: string; remaining: number } | null
    onClose: () => void
    onSaved: () => void
}

// Record some, but not all, of what a member still owes for one month.
export default function PartialPaymentModal({ target, onClose, onSaved }: PartialPaymentModalProps) {
    useScrollLock(!!target)
    const [amount, setAmount] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => { setAmount(''); setError(''); setSaving(false) }, [target?.userId, target?.period])
    if (!target) return null

    async function submit(e: React.FormEvent) {
        e.preventDefault()
        if (!target) return
        const value = Number(amount)
        if (!(value > 0)) return setError('Enter an amount greater than zero.')
        if (Math.round(value * 100) >= Math.round(target.remaining * 100)) return setError(`That is the full balance (${money(target.remaining)}). Use Paid instead.`)
        setSaving(true)
        const res = (await partialPayment({ memberId: target.userId, period: target.period, amount: value, expected: target.remaining })) as { error?: string; name?: string; amount?: number; remaining?: number }
        setSaving(false)
        if (res.error) { setError(res.error); if (/balance has changed/.test(res.error)) onSaved(); return }
        toast.success(`${res.name}: ${money(res.amount ?? 0)} recorded. ${money(res.remaining ?? 0)} still due.`)
        onSaved()
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <form onSubmit={submit} className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                        <h3 className="text-sm font-bold text-gray-900">Partial payment</h3>
                        <p className="text-[11px] text-gray-400 mt-0.5">{target.name} · {monthName(target.period)}</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
                </div>
                <div className="px-6 py-5 space-y-3">
                    <p className="text-sm text-gray-600">Balance still due: <strong className="text-gray-900">{money(target.remaining)}</strong></p>
                    <div>
                        <label className={labelClass}>Amount received</label>
                        <input type="number" min="0.01" step="0.01" inputMode="decimal" autoFocus value={amount} onChange={e => { setAmount(e.target.value); setError('') }} placeholder="0.00" className={inputClass} />
                    </div>
                    {error && <p className="text-xs font-semibold text-red-600" role="alert">{error}</p>}
                    <p className="text-xs text-gray-400">To settle the whole month, use Paid instead.</p>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                    <button type="submit" disabled={saving} className="px-5 py-2.5 text-sm font-black text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm disabled:opacity-50 flex items-center gap-2">
                        {saving && <Loader2 className="animate-spin w-4 h-4" />} Record payment
                    </button>
                </div>
            </form>
        </div>
    )
}
