'use client'

import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { saveMembership } from '@/app/club/manager'
import { membershipQuery } from '@/lib/club-queries'
import GlobalDropdown from '@/components/GlobalDropdown'
import GlobalCalendar from '@/components/GlobalCalendar'
import MemberFaceCard from '@/components/club/MemberFaceCard'

const labelClass = 'block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5'
const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none text-sm transition-all'

// Where a value will appear once it has loaded; the labels and layout around it are static and show straight away.
const Placeholder = () => <div className="h-[42px] rounded-xl bg-gray-100 animate-pulse" />

// Membership details for one member in the club master's member profile: what the club charges and when they joined.
export default function MemberMembershipTab({ memberId }: { memberId: string }) {
    const queryClient = useQueryClient()
    const { data, error } = useQuery(membershipQuery(memberId))
    const loading = !data && !error

    const [saving, setSaving] = useState(false)
    const [status, setStatus] = useState('ACTIVE')
    const [monthlyFee, setMonthlyFee] = useState('')
    const [billingDay, setBillingDay] = useState('')
    const [joinedOn, setJoinedOn] = useState('')
    const [filled, setFilled] = useState(false)

    // Put the saved values into the form once, the first time they are available (so later refreshes never overwrite typing).
    useEffect(() => {
        if (!data || filled) return
        setStatus(data.status)
        setMonthlyFee(data.monthlyFee ? String(data.monthlyFee) : '')
        setBillingDay(data.billingDay ? String(data.billingDay) : '')
        setJoinedOn(data.joinedOn)
        setFilled(true)
    }, [data, filled])

    async function save(e: React.FormEvent) {
        e.preventDefault()
        setSaving(true)
        const res = await saveMembership(memberId, {
            status,
            monthlyFee: monthlyFee ? Number(monthlyFee) : 0,
            billingDay: billingDay ? Number(billingDay) : null,
            joinedOn: joinedOn || null,
        })
        setSaving(false)
        if (res.error) return toast.error(res.error)
        queryClient.setQueryData(membershipQuery(memberId).queryKey, {
            exists: true,
            status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
            joinedOn,
            monthlyFee: monthlyFee ? Number(monthlyFee) : 0,
            billingDay: billingDay ? Number(billingDay) : null,
        })
        toast.success('Membership saved')
    }

    return (
        <div className="space-y-4">
        <form onSubmit={save} className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4">
            <div>
                <p className="text-sm font-bold text-gray-900">Club membership</p>
                <p className="text-xs text-gray-400 mt-0.5">What this member is charged and when they joined. Set a monthly fee to start billing them.</p>
            </div>
            {error && <p className="text-sm text-red-500">{(error as Error).message}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Status</label>
                    {loading ? <Placeholder /> : (
                        <GlobalDropdown
                            label="Select..."
                            value={status}
                            onChange={setStatus}
                            options={[{ label: 'Active', value: 'ACTIVE' }, { label: 'Inactive', value: 'INACTIVE' }]}
                            fullWidth
                        />
                    )}
                </div>
                <div>
                    <label className={labelClass}>Joined on</label>
                    {loading ? <Placeholder /> : (
                        <GlobalCalendar
                            value={joinedOn}
                            onChange={(date: Date) => setJoinedOn(format(date, 'yyyy-MM-dd'))}
                            placeholder="Select date..."
                            fullWidth
                        />
                    )}
                </div>
                <div>
                    <label className={labelClass}>Monthly fee</label>
                    {loading ? <Placeholder /> : (
                        <input type="number" min="0" step="0.01" value={monthlyFee} onChange={e => setMonthlyFee(e.target.value)} placeholder="0.00" className={inputClass} />
                    )}
                </div>
                <div>
                    <label className={labelClass}>Billing day</label>
                    {loading ? <Placeholder /> : (
                        <input type="number" min="1" max="31" step="1" value={billingDay} onChange={e => setBillingDay(e.target.value)} placeholder="1–31" className={inputClass} />
                    )}
                </div>
            </div>
            <p className="text-xs text-gray-400">Leave the fee empty or 0 if this member is not billed. Inactive members are not billed.</p>
            <div className="flex justify-end">
                <button type="submit" disabled={saving || loading || !!error} className="px-5 py-2.5 text-sm font-black text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center gap-2">
                    {saving && <Loader2 className="animate-spin w-4 h-4" />}
                    Save membership
                </button>
            </div>
        </form>
        <MemberFaceCard memberId={memberId} />
        </div>
    )
}
