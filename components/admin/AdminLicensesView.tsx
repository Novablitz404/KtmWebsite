'use client'

import { useState } from 'react'
import { BadgeCheck, Plus, X, Search } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
    listLicenses, listClubsWithoutSubscription, createLicense, updateLicense, recordLicensePayment, getLicensePayments, deleteLicense,
    type LicenseRow,
} from '@/app/actions/licenses'
import GlobalDropdown from '@/components/GlobalDropdown'
import TableRowsSkeleton from '@/components/admin/TableRowsSkeleton'

const DAY = 24 * 60 * 60 * 1000
const GRACE_DAYS = 7 // everything keeps working this long after the end date, with a warning

// Same rule as lib/club-subscription.ts: valid through the end date, then 7 days of grace, then records are view-only.
function stateOf(license: LicenseRow): { label: string; tone: string } {
    if (license.status === 'SUSPENDED') return { label: 'Suspended', tone: 'bg-red-50 text-red-700 border-red-200' }
    if (!license.expiresOn) return { label: 'Active', tone: 'bg-green-50 text-green-700 border-green-200' }
    const today = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10) // club time (UTC+8)
    const over = Math.round((Date.parse(today + 'T12:00:00Z') - Date.parse(license.expiresOn + 'T12:00:00Z')) / DAY)
    if (over > GRACE_DAYS) return { label: 'Ended', tone: 'bg-red-50 text-red-700 border-red-200' }
    if (over > 0) return { label: 'Grace period', tone: 'bg-amber-50 text-amber-700 border-amber-200' }
    if (over > -8) return { label: 'Ending soon', tone: 'bg-amber-50 text-amber-700 border-amber-200' }
    return { label: 'Active', tone: 'bg-green-50 text-green-700 border-green-200' }
}

const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500'
const labelClass = 'block text-xs font-semibold text-gray-500 mb-1'

export default function AdminLicensesView() {
    const queryClient = useQueryClient()
    const [search, setSearch] = useState('')
    const [creating, setCreating] = useState(false)
    const [managingId, setManagingId] = useState<string | null>(null)

    const { data, isLoading } = useQuery({
        queryKey: ['admin-licenses'],
        queryFn: async () => {
            const res = await listLicenses()
            if (res.error) throw new Error(res.error)
            return res.licenses || []
        },
    })
    const licenses = data || []
    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['admin-licenses'] })
        queryClient.invalidateQueries({ queryKey: ['admin-clubs-without-subscription'] })
    }

    const query = search.trim().toLowerCase()
    const shown = licenses.filter(l => !query || l.clubName.toLowerCase().includes(query))
    const counts = { total: licenses.length, active: 0, attention: 0, ended: 0, suspended: 0 }
    for (const l of licenses) {
        const label = stateOf(l).label
        if (label === 'Active') counts.active++
        else if (label === 'Ending soon' || label === 'Grace period') counts.attention++
        else if (label === 'Ended') counts.ended++
        else if (label === 'Suspended') counts.suspended++
    }
    const managing = licenses.find(l => l.id === managingId) || null

    return (
        <div className="h-full flex flex-col bg-gray-50">
            <div className="flex-1 flex flex-col min-h-0 sm:p-6 sm:max-w-[1920px] sm:mx-auto w-full">
                <div className="flex justify-between items-center mb-6 px-4 sm:px-0 gap-3 flex-wrap">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Club management subscriptions</h2>
                        <p className="text-sm text-gray-500 mt-1">Clubs with a subscription can use Attendance, Finance, Schedule and check-in kiosks. Record their payments here.</p>
                    </div>
                    <button onClick={() => setCreating(true)} className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-700 flex items-center gap-2 transition-colors shadow-sm">
                        <Plus className="w-4 h-4" />
                        New subscription
                    </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 px-4 sm:px-0">
                    {[['Clubs', counts.total], ['Active', counts.active], ['Ending soon', counts.attention], ['Ended', counts.ended], ['Suspended', counts.suspended]].map(([label, value]) => (
                        <div key={label as string} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                            <p className="text-xs text-gray-500">{label}</p>
                            <p className="text-2xl font-bold text-gray-900">{value}</p>
                        </div>
                    ))}
                </div>

                <div className="relative mb-4 px-4 sm:px-0 max-w-sm">
                    <Search className="w-4 h-4 text-gray-400 absolute left-7 sm:left-3 top-1/2 -translate-y-1/2" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clubs" className={`${inputClass} pl-9`} />
                </div>

                <div className="flex-1 flex flex-col min-h-0 bg-white sm:rounded-2xl sm:shadow-sm sm:border sm:border-gray-200 overflow-hidden">
                    <div className="flex-1 overflow-auto">
                        <table className="min-w-full divide-y divide-gray-200 relative">
                            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    {['Club', 'Status', 'Valid until', 'Payments', ''].map(h => (
                                        <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {isLoading && !data ? (
                                    <TableRowsSkeleton columns={5} />
                                ) : shown.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">{licenses.length ? 'No clubs match your search.' : 'No subscriptions yet.'}</td></tr>
                                ) : shown.map(license => {
                                    const state = stateOf(license)
                                    return (
                                        <tr key={license.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900 text-sm">{license.clubName}</div>
                                                <div className="text-xs text-gray-500">{license.contact || ''}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${state.tone}`}>
                                                    <BadgeCheck className="w-3 h-3" />{state.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{license.expiresOn || 'No end date'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{license.paymentCount}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => setManagingId(license.id)} className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50">Manage</button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {creating && <CreateSubscriptionModal onClose={() => setCreating(false)} onCreated={refresh} />}
            {managing && <ManageSubscriptionModal license={managing} onClose={() => setManagingId(null)} onChanged={refresh} />}
        </div>
    )
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h3 className="font-bold text-gray-900">{title}</h3>
                    <button onClick={onClose} aria-label="Close" className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    )
}

function CreateSubscriptionModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const [clubId, setClubId] = useState('')
    const [contact, setContact] = useState('')
    const [months, setMonths] = useState('1')
    const [saving, setSaving] = useState(false)

    const { data: clubs } = useQuery({
        queryKey: ['admin-clubs-without-subscription'],
        queryFn: async () => (await listClubsWithoutSubscription()).clubs || [],
    })

    async function submit(e: React.FormEvent) {
        e.preventDefault()
        setSaving(true)
        const res = await createLicense({ clubId, contact, months: Number(months) })
        setSaving(false)
        if (res.error) return toast.error(res.error)
        toast.success('Subscription created')
        onCreated()
        onClose()
    }

    return (
        <ModalShell title="New subscription" onClose={onClose}>
            <form onSubmit={submit} className="space-y-4">
                <div>
                    <label className={labelClass}>Club</label>
                    <GlobalDropdown
                        label={clubs ? (clubs.length ? 'Search or choose a club' : 'Every approved club has a subscription') : 'Loading clubs…'}
                        value={clubId}
                        onChange={setClubId}
                        options={(clubs || []).map(c => ({ label: c.name, value: c.id }))}
                        searchable
                        fullWidth
                    />
                </div>
                <div><label className={labelClass}>Contact (optional)</label><input className={inputClass} value={contact} onChange={e => setContact(e.target.value)} maxLength={160} placeholder="Phone or email" /></div>
                <div>
                    <label className={labelClass}>Valid for (months)</label>
                    <input className={inputClass} type="number" min={0} max={120} value={months} onChange={e => setMonths(e.target.value)} required />
                    <p className="text-xs text-gray-500 mt-1">0 means no end date.</p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
                    <button type="submit" disabled={saving || !clubId} className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50">{saving ? 'Creating…' : 'Create subscription'}</button>
                </div>
            </form>
        </ModalShell>
    )
}

function ManageSubscriptionModal({ license, onClose, onChanged }: { license: LicenseRow; onClose: () => void; onChanged: () => void }) {
    const queryClient = useQueryClient()
    const [contact, setContact] = useState(license.contact || '')
    const [status, setStatus] = useState<string>(license.status)
    const [expiresOn, setExpiresOn] = useState(license.expiresOn || '')
    const [notes, setNotes] = useState(license.notes || '')
    const [amount, setAmount] = useState('')
    const [months, setMonths] = useState('1')
    const [payNote, setPayNote] = useState('')
    const [busy, setBusy] = useState(false)

    const { data: payments } = useQuery({
        queryKey: ['admin-license-payments', license.id],
        queryFn: async () => (await getLicensePayments(license.id)).payments || [],
    })

    async function run(action: () => Promise<{ error?: string }>, success: string, close = false) {
        setBusy(true)
        const res = await action()
        setBusy(false)
        if (res.error) return toast.error(res.error)
        toast.success(success)
        onChanged()
        if (close) onClose()
    }

    return (
        <ModalShell title={license.clubName} onClose={onClose}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className={labelClass}>Contact</label><input className={inputClass} value={contact} onChange={e => setContact(e.target.value)} maxLength={160} /></div>
                <div>
                    <label className={labelClass}>Status</label>
                    <select className={inputClass} value={status} onChange={e => setStatus(e.target.value)}>
                        <option value="ACTIVE">Active</option>
                        <option value="SUSPENDED">Suspended</option>
                    </select>
                </div>
                <div><label className={labelClass}>Valid until</label><input className={inputClass} type="date" value={expiresOn} onChange={e => setExpiresOn(e.target.value)} /><p className="text-xs text-gray-500 mt-1">Empty means no end date.</p></div>
            </div>
            <div className="mt-4"><label className={labelClass}>Notes</label><textarea className={inputClass} rows={2} value={notes} onChange={e => setNotes(e.target.value)} maxLength={1000} /></div>

            <div className="flex flex-wrap gap-2 mt-4">
                <button disabled={busy} onClick={() => run(() => updateLicense(license.id, { contact, status, expiresOn: expiresOn || null, notes }), 'Subscription saved', true)} className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50">Save changes</button>
                <button disabled={busy} onClick={() => { if (confirm(`Delete the subscription for ${license.clubName}? Their paid features lock immediately. Their records are kept.`)) run(() => deleteLicense(license.id), 'Subscription deleted', true) }} className="px-4 py-2 border border-red-200 text-red-700 rounded-xl text-sm hover:bg-red-50 disabled:opacity-50">Delete</button>
            </div>

            <div className="border-t border-gray-200 mt-6 pt-5">
                <h4 className="font-semibold text-gray-900 text-sm mb-1">Record a payment and extend</h4>
                <p className="text-xs text-gray-500 mb-3">The end date moves forward from the current end date, or from today if it already ended.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div><label className={labelClass}>Amount</label><input className={inputClass} type="number" min={0} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></div>
                    <div><label className={labelClass}>Months paid</label><input className={inputClass} type="number" min={1} max={120} value={months} onChange={e => setMonths(e.target.value)} /></div>
                    <div><label className={labelClass}>Note</label><input className={inputClass} value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="GCash ref, etc." maxLength={200} /></div>
                </div>
                <button disabled={busy} onClick={async () => {
                    setBusy(true)
                    const res = await recordLicensePayment(license.id, { amount: Number(amount), months: Number(months), note: payNote })
                    setBusy(false)
                    if (res.error) return toast.error(res.error)
                    toast.success(`Extended to ${res.expiresOn}`)
                    setExpiresOn(res.expiresOn || ''); setStatus('ACTIVE'); setAmount(''); setPayNote('')
                    queryClient.invalidateQueries({ queryKey: ['admin-license-payments', license.id] })
                    onChanged()
                }} className="mt-3 px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50">Add payment and extend</button>

                <table className="min-w-full mt-4 text-sm">
                    <thead><tr className="text-left text-xs text-gray-500 uppercase"><th className="py-2 pr-4">Date</th><th className="py-2 pr-4">Amount</th><th className="py-2 pr-4">Months</th><th className="py-2">Note</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                        {(payments || []).map(p => (
                            <tr key={p.id}><td className="py-2 pr-4">{p.paidOn}</td><td className="py-2 pr-4">{p.amount.toLocaleString()}</td><td className="py-2 pr-4">{p.months ?? ''}</td><td className="py-2 text-gray-500">{p.note || ''}</td></tr>
                        ))}
                        {payments && payments.length === 0 && <tr><td colSpan={4} className="py-3 text-gray-400 italic">No payments yet.</td></tr>}
                    </tbody>
                </table>
            </div>
        </ModalShell>
    )
}
