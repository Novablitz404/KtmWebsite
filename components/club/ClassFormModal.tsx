'use client'

import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import GlobalDropdown from '@/components/GlobalDropdown'
import GlobalTimePicker from '@/components/GlobalTimePicker'
import { saveClass, type ClassRow } from '@/app/club/schedule'
import { useScrollLock } from '@/hooks/useScrollLock'
import { BELTS, DAY_SHORT } from '@/lib/club-schedule'
import { inputClass, labelClass } from '@/components/club/finance-shared'

interface ClassFormModalProps {
    open: boolean
    cls: ClassRow | null      // null = add a new class
    onClose: () => void
    onSaved: () => void
}

// Add or edit a class: when it runs, how many it can take, which belts it is open to.
export default function ClassFormModal({ open, cls, onClose, onSaved }: ClassFormModalProps) {
    useScrollLock(open)
    const [name, setName] = useState('')
    const [days, setDays] = useState<number[]>([])
    const [startTime, setStartTime] = useState('17:00')
    const [endTime, setEndTime] = useState('18:00')
    const [capacity, setCapacity] = useState('20')
    const [instructor, setInstructor] = useState('')
    const [beltMin, setBeltMin] = useState(BELTS[0])
    const [beltMax, setBeltMax] = useState(BELTS[BELTS.length - 1])
    const [location, setLocation] = useState('')
    const [notes, setNotes] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!open) return
        setName(cls?.name ?? ''); setDays(cls?.days ?? []); setStartTime(cls?.startTime ?? '17:00'); setEndTime(cls?.endTime ?? '18:00')
        setCapacity(String(cls?.capacity ?? 20)); setInstructor(cls?.instructor ?? ''); setBeltMin(cls?.beltMin ?? BELTS[0])
        setBeltMax(cls?.beltMax ?? BELTS[BELTS.length - 1]); setLocation(cls?.location ?? ''); setNotes(cls?.notes ?? '')
        setSaving(false); setError('')
    }, [open, cls])

    if (!open) return null

    const toggleDay = (day: number) => setDays(current => (current.includes(day) ? current.filter(d => d !== day) : [...current, day].sort((a, b) => a - b)))
    const beltOptions = BELTS.map(b => ({ label: b, value: b }))

    async function submit(e: React.FormEvent) {
        e.preventDefault()
        setSaving(true); setError('')
        const res = await saveClass({ id: cls?.id, name, days, startTime, endTime, capacity: Number(capacity), instructor, beltMin, beltMax, location, notes })
        setSaving(false)
        if ('error' in res && res.error) return setError(res.error)
        toast.success(cls ? 'Class updated' : 'Class added')
        onSaved()
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <form onSubmit={submit} noValidate className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                    <div>
                        <h3 className="text-sm font-bold text-gray-900">{cls ? 'Edit class' : 'Add class'}</h3>
                        <p className="text-[11px] text-gray-400 mt-0.5">Set when it runs, how many it can take, and which belts it is open to.</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
                </div>

                <div className="px-6 py-5 space-y-4 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <div>
                        <label className={labelClass}>Class name <span className="text-red-500">*</span></label>
                        <input value={name} onChange={e => { setName(e.target.value); setError('') }} maxLength={80} placeholder="e.g. Kids beginners" className={inputClass} autoFocus />
                    </div>

                    <div>
                        <label className={labelClass}>Days <span className="text-red-500">*</span></label>
                        <div className="flex flex-wrap gap-2" role="group" aria-label="Days">
                            {DAY_SHORT.map((label, i) => {
                                const on = days.includes(i + 1)
                                return (
                                    <button key={label} type="button" aria-pressed={on} onClick={() => { toggleDay(i + 1); setError('') }}
                                        className={`px-3.5 py-2 rounded-xl text-sm font-bold border transition-colors ${on ? 'bg-red-600 border-red-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                                        {label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className={labelClass}>Start time <span className="text-red-500">*</span></label>
                            <GlobalTimePicker value={startTime} onChange={t => { setStartTime(t); setError('') }} fullWidth />
                        </div>
                        <div>
                            <label className={labelClass}>End time <span className="text-red-500">*</span></label>
                            <GlobalTimePicker value={endTime} onChange={t => { setEndTime(t); setError('') }} fullWidth />
                        </div>
                        <div>
                            <label className={labelClass}>Capacity (members) <span className="text-red-500">*</span></label>
                            <input type="number" min={1} max={500} step={1} value={capacity} onChange={e => { setCapacity(e.target.value); setError('') }} className={inputClass} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className={labelClass}>Instructor</label>
                            <input value={instructor} onChange={e => setInstructor(e.target.value)} maxLength={80} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Lowest belt</label>
                            <GlobalDropdown label="Select..." value={beltMin} onChange={v => { setBeltMin(v); setError('') }} options={beltOptions} fullWidth />
                        </div>
                        <div>
                            <label className={labelClass}>Highest belt</label>
                            <GlobalDropdown label="Select..." value={beltMax} onChange={v => { setBeltMax(v); setError('') }} options={beltOptions} fullWidth />
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 -mt-1">Only members whose belt is in this range can join. Choose {BELTS[0]} to {BELTS[BELTS.length - 1]} to open the class to everyone.</p>

                    <div>
                        <label className={labelClass}>Location</label>
                        <input value={location} onChange={e => setLocation(e.target.value)} maxLength={120} placeholder="e.g. Main dojo" className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Notes</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} maxLength={500} className={`${inputClass} resize-none`} />
                    </div>

                    {error && <p className="text-xs font-semibold text-red-600" role="alert">{error}</p>}
                </div>

                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                    <button type="submit" disabled={saving} className="px-5 py-2.5 text-sm font-black text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm disabled:opacity-50 flex items-center gap-2">
                        {saving && <Loader2 className="animate-spin w-4 h-4" />} {cls ? 'Save changes' : 'Add class'}
                    </button>
                </div>
            </form>
        </div>
    )
}
