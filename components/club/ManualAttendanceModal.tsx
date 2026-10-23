'use client'

import { useEffect, useState } from 'react'
import { X, Loader2, LogIn, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import GlobalDropdown from '@/components/GlobalDropdown'
import { useScrollLock } from '@/hooks/useScrollLock'
import { attendanceRoster, recordManualAttendance } from '@/app/club/attendance'

interface ManualAttendanceModalProps {
    isOpen: boolean
    onClose: () => void
    onRecorded: () => void
}

// Check a member in or out by hand: pick them from the searchable list, then press Check in or Check out.
export default function ManualAttendanceModal({ isOpen, onClose, onRecorded }: ManualAttendanceModalProps) {
    useScrollLock(isOpen)
    const [members, setMembers] = useState<{ id: string; name: string }[]>([])
    const [loading, setLoading] = useState(false)
    const [memberId, setMemberId] = useState('')
    const [busy, setBusy] = useState<'check-in' | 'check-out' | null>(null)

    useEffect(() => {
        if (!isOpen) return
        setMemberId('')
        setLoading(true)
        attendanceRoster().then(res => {
            if (res.error) toast.error(res.error)
            setMembers(res.members || [])
            setLoading(false)
        })
    }, [isOpen])

    if (!isOpen) return null

    async function record(only: 'check-in' | 'check-out') {
        if (!memberId) return toast.error('Select a member first')
        setBusy(only)
        const res = await recordManualAttendance(memberId, only)
        setBusy(null)
        if ('error' in res && res.error) return toast.error(res.error)
        toast.success(`${res.name} ${res.action === 'check-in' ? 'checked in' : 'checked out'} at ${res.time}`)
        onRecorded()
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-visible">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                        <h3 className="text-sm font-bold text-gray-900">Manual check-in / out</h3>
                        <p className="text-[11px] text-gray-400 mt-0.5">Record today’s attendance for a member.</p>
                    </div>
                    <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
                </div>

                <div className="px-6 py-5">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Member</label>
                    {loading ? (
                        <div className="flex items-center gap-2 text-sm text-gray-400 py-2.5"><Loader2 className="w-4 h-4 animate-spin" /> Loading members…</div>
                    ) : (
                        <GlobalDropdown
                            label="Search or choose a member"
                            value={memberId}
                            onChange={setMemberId}
                            options={members.map(m => ({ label: m.name, value: m.id }))}
                            searchable
                            fullWidth
                        />
                    )}
                    {!loading && members.length === 0 && <p className="text-xs text-gray-400 mt-2">No active members yet. Add members first.</p>}
                </div>

                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                    <button type="button" disabled={busy !== null || !memberId} onClick={() => record('check-out')}
                        className="px-5 py-2.5 text-sm font-bold text-gray-700 border border-gray-200 hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2">
                        {busy === 'check-out' ? <Loader2 className="animate-spin w-4 h-4" /> : <LogOut size={15} />} Check out
                    </button>
                    <button type="button" disabled={busy !== null || !memberId} onClick={() => record('check-in')}
                        className="px-5 py-2.5 text-sm font-black text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center gap-2">
                        {busy === 'check-in' ? <Loader2 className="animate-spin w-4 h-4" /> : <LogIn size={15} />} Check in
                    </button>
                </div>
            </div>
        </div>
    )
}
