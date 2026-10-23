'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { X, Loader2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import GlobalDropdown from '@/components/GlobalDropdown'
import { getClassRoster, enrollMember, unenrollMember } from '@/app/club/schedule'
import { useScrollLock } from '@/hooks/useScrollLock'
import { daysText, timeRange, beltText } from '@/lib/club-schedule'
import { Bar } from '@/components/club/finance-shared'
import { CapacityBar, isFull } from '@/components/club/schedule-shared'

interface ClassRosterModalProps {
    classId: string | null
    onClose: () => void
    onChanged: () => void
    onEdit: (classId: string) => void
}

// Who is in a class, and adding or removing members. The rules (capacity, belt range, double-booking) are the server's.
export default function ClassRosterModal({ classId, onClose, onChanged, onEdit }: ClassRosterModalProps) {
    useScrollLock(!!classId)
    const queryClient = useQueryClient()
    const [memberId, setMemberId] = useState('')
    const [busy, setBusy] = useState<string | null>(null)

    const { data, error } = useQuery({
        queryKey: ['class-roster', classId],
        enabled: !!classId,
        queryFn: async () => {
            const res = await getClassRoster(classId!)
            if (res.error || !res.cls) throw new Error(res.error || 'Could not load the class')
            return res as Required<Pick<typeof res, 'cls' | 'enrolled' | 'eligible'>>
        },
    })
    if (!classId) return null
    const loading = !data && !error
    const cls = data?.cls
    const id = classId

    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['class-roster', id] })
        onChanged()
    }

    async function add() {
        if (!memberId) return toast.error('Select a member first')
        setBusy('add')
        const res = await enrollMember(id, memberId)
        setBusy(null)
        if ('error' in res && res.error) { toast.error(res.error); refresh(); return }
        toast.success(`${'name' in res ? res.name : 'Member'} added to ${cls?.name}`)
        setMemberId('')
        refresh()
    }

    async function remove(userId: string, name: string) {
        if (!confirm(`Remove ${name} from ${cls?.name}?`)) return
        setBusy(`rm-${userId}`)
        const res = await unenrollMember(id, userId)
        setBusy(null)
        if ('error' in res && res.error) { toast.error(res.error); return }
        toast.success(`${name} removed`)
        refresh()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
                <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                    <div className="min-w-0">
                        <h3 className="text-base font-black text-gray-900 truncate">{cls?.name ?? <Bar className="w-40 h-5" />}</h3>
                        <p className="text-xs text-gray-400 mt-0.5 h-4">
                            {cls ? `${daysText(cls.days)} · ${timeRange(cls)} · ${beltText(cls)}${cls.instructor ? ` · ${cls.instructor}` : ''}${cls.location ? ` · ${cls.location}` : ''}` : <Bar className="w-64 h-3.5" />}
                        </p>
                    </div>
                    <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
                </div>

                <div className="px-6 py-5 space-y-5 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {error && <p className="text-sm text-red-500">{(error as Error).message}</p>}

                    <div>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-bold text-gray-700">Places</span>
                            <span className="text-gray-500">{cls ? `${cls.enrolled} of ${cls.capacity}${isFull(cls) ? ' · Full' : ` · ${cls.capacity - cls.enrolled} left`}` : <Bar className="w-24 h-3" />}</span>
                        </div>
                        {cls ? <CapacityBar cls={cls} /> : <div className="h-1.5 rounded-full bg-gray-100 animate-pulse" />}
                    </div>

                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Add a member</p>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                                {loading ? <div className="h-[42px] rounded-xl bg-gray-100 animate-pulse" /> : (
                                    <GlobalDropdown
                                        label={isFull(cls!) ? 'This class is full' : (data?.eligible.length ? 'Search or choose a member' : 'No eligible members')}
                                        value={memberId}
                                        onChange={setMemberId}
                                        options={(data?.eligible || []).map(m => ({ label: m.belt ? `${m.name} · ${m.belt}` : m.name, value: m.id }))}
                                        searchable
                                        fullWidth
                                    />
                                )}
                            </div>
                            <button type="button" onClick={add} disabled={loading || busy === 'add' || !memberId || (cls ? isFull(cls) : true)}
                                className="px-4 py-2.5 text-sm font-black text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm disabled:opacity-50 flex items-center gap-2 flex-shrink-0">
                                {busy === 'add' ? <Loader2 className="animate-spin w-4 h-4" /> : <UserPlus size={15} />} Add
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5">Only active members in the right belt range, with no other class at the same time, are listed.</p>
                    </div>

                    <div>
                        <h4 className="text-sm font-bold text-gray-900 mb-2">Enrolled members</h4>
                        <div className="rounded-2xl border border-gray-100 divide-y divide-gray-50">
                            {loading ? [0, 1, 2].map(i => <div key={i} className="px-4 py-3"><Bar className="w-40 h-4" /></div>)
                                : (data?.enrolled.length || 0) === 0 ? <p className="px-4 py-8 text-center text-xs text-gray-400">No one is enrolled yet.</p>
                                : data!.enrolled.map(m => (
                                    <div key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate">{m.name}</p>
                                            <p className="text-[11px] text-gray-400">{m.belt ? `${m.belt} belt` : 'No belt set'}</p>
                                        </div>
                                        <button disabled={busy === `rm-${m.id}`} onClick={() => remove(m.id, m.name)} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50">Remove</button>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
                    <button onClick={() => onEdit(id)} className="px-5 py-2.5 text-sm font-bold text-gray-700 border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors">Edit class</button>
                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-black text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm">Done</button>
                </div>
            </div>
        </div>
    )
}
