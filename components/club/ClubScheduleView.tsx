'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Plus } from 'lucide-react'
import { toast } from 'sonner'
import ClassFormModal from '@/components/club/ClassFormModal'
import ClassRosterModal from '@/components/club/ClassRosterModal'
import { listClasses, deleteClass, type ClassRow } from '@/app/club/schedule'
import { DAY_SHORT, DAY_LONG, timeRange, daysText, beltText } from '@/lib/club-schedule'
import { Bar } from '@/components/club/finance-shared'
import { CapacityBar, SpotsTag, isFull, spotsLeft } from '@/components/club/schedule-shared'

// Schedule tab of the club master dashboard: the weekly timetable and the list of classes, with who is enrolled in each.
export default function ClubScheduleView() {
    const queryClient = useQueryClient()
    const [tab, setTab] = useState<'week' | 'all'>('week')
    const [form, setForm] = useState<{ open: boolean; cls: ClassRow | null }>({ open: false, cls: null })
    const [rosterId, setRosterId] = useState<string | null>(null)

    const { data, error } = useQuery({
        queryKey: ['club-classes'],
        queryFn: async () => {
            const res = await listClasses()
            if (res.error) throw new Error(res.error)
            return res.classes || []
        },
    })
    const loading = !data && !error
    const classes = data || []
    const byTime = (a: ClassRow, b: ClassRow) => a.startTime.localeCompare(b.startTime) || a.name.localeCompare(b.name)

    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['club-classes'] })
        queryClient.invalidateQueries({ queryKey: ['class-roster'] })
    }

    async function handleDelete(cls: ClassRow) {
        if (!confirm(`Delete ${cls.name}? Its ${cls.enrolled} enrolled ${cls.enrolled === 1 ? 'member is' : 'members are'} removed from it. This cannot be undone.`)) return
        const res = await deleteClass(cls.id)
        if ('error' in res && res.error) return toast.error(res.error)
        toast.success('Class deleted')
        refresh()
    }

    const editClass = (id: string) => {
        const cls = classes.find(c => c.id === id)
        if (!cls) return
        setRosterId(null)
        setForm({ open: true, cls })
    }

    const th = 'px-5 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap'
    const td = 'px-5 py-3.5 text-sm'
    const btn = 'px-3 py-1.5 text-xs font-bold rounded-lg transition-colors'

    const card = (c: ClassRow) => (
        <button key={c.id} type="button" onClick={() => setRosterId(c.id)}
            aria-label={`${c.name}, ${timeRange(c)}, ${c.enrolled} of ${c.capacity} places taken`}
            className="w-full text-left rounded-xl border border-gray-200 bg-white p-3 hover:border-red-300 hover:shadow-sm transition-all space-y-1.5">
            <span className="block text-[11px] font-bold text-red-600">{timeRange(c)}</span>
            <strong className="block text-sm text-gray-900 leading-snug">{c.name}</strong>
            <span className="block text-[11px] text-gray-400">{beltText(c)}</span>
            <CapacityBar cls={c} />
            <span className="block text-[11px] text-gray-500">{c.enrolled} of {c.capacity} · {isFull(c) ? 'Full' : `${spotsLeft(c)} left`}</span>
        </button>
    )

    return (
        <div className="flex flex-col h-full min-h-screen md:min-h-0 bg-gray-50 p-4 sm:p-6 gap-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center flex-shrink-0"><CalendarDays size={14} className="text-white" /></div>
                    <div>
                        <h2 className="text-sm font-bold text-gray-900">Schedule</h2>
                        <p className="text-[11px] text-gray-400 mt-0.5">Plan your weekly classes, how many each can take, and which belts they are open to.</p>
                    </div>
                </div>
                <button type="button" onClick={() => setForm({ open: true, cls: null })} className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm">
                    <Plus className="w-4 h-4" /> Add class
                </button>
            </div>

            {error && <p className="text-sm text-red-500">{(error as Error).message}</p>}

            <div className="flex border-b border-gray-200 gap-1" role="tablist">
                {([['week', 'Weekly timetable', null], ['all', 'All classes', loading ? null : classes.length]] as const).map(([id, label, count]) => (
                    <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                        className={`px-4 py-3 text-sm font-bold border-b-2 -mb-px transition-colors flex items-center gap-2 ${tab === id ? 'border-red-600 text-red-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                        {label}
                        {count !== null && <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${tab === id ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}>{count}</span>}
                    </button>
                ))}
            </div>

            {tab === 'week' ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                    <h3 className="text-sm font-bold text-gray-900">Weekly timetable</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5 mb-4">Select a class to see who is enrolled and to add members.</p>
                    {!loading && classes.length === 0 ? (
                        <div className="py-14 text-center">
                            <p className="text-sm font-bold text-gray-800">No classes yet</p>
                            <p className="text-xs text-gray-400 mt-1">Add your first class to start building the weekly timetable.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                            {DAY_SHORT.map((label, i) => {
                                const day = i + 1
                                const todays = classes.filter(c => c.days.includes(day)).sort(byTime)
                                return (
                                    <section key={label} aria-label={DAY_LONG[i]} className="space-y-2 min-w-0">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{label}</h4>
                                        {loading ? <div className="h-24 rounded-xl bg-gray-100 animate-pulse" />
                                            : todays.length ? todays.map(card)
                                            : <p className="text-[11px] text-gray-300 px-1 py-2">No classes</p>}
                                    </section>
                                )
                            })}
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h3 className="text-sm font-bold text-gray-900">All classes</h3>
                        <p className="text-[11px] text-gray-400 mt-0.5">{loading ? '' : `${classes.length} ${classes.length === 1 ? 'class' : 'classes'}`}</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50/70"><tr>{['Class', 'Days', 'Time', 'Belts', 'Enrolled', 'Places', 'Instructor', 'Actions'].map(h => <th key={h} className={th}>{h}</th>)}</tr></thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? Array.from({ length: 4 }, (_, i) => <tr key={i}>{Array.from({ length: 8 }, (_, c) => <td key={c} className={td}><Bar className="w-16 h-4" /></td>)}</tr>)
                                    : classes.length === 0 ? <tr><td colSpan={8} className="px-6 py-14 text-center text-sm text-gray-400">No classes yet.</td></tr>
                                    : [...classes].sort(byTime).map(c => (
                                        <tr key={c.id} className="hover:bg-gray-50/50">
                                            <td className={td}><strong className="text-gray-900">{c.name}</strong>{c.location && <div className="text-[11px] text-gray-400">{c.location}</div>}</td>
                                            <td className={`${td} text-gray-600 whitespace-nowrap`}>{daysText(c.days)}</td>
                                            <td className={`${td} text-gray-600 whitespace-nowrap`}>{timeRange(c)}</td>
                                            <td className={`${td} text-gray-600 whitespace-nowrap`}>{beltText(c)}</td>
                                            <td className={`${td} text-gray-600 min-w-[110px]`}><div className="mb-1.5">{c.enrolled} of {c.capacity}</div><CapacityBar cls={c} /></td>
                                            <td className={td}><SpotsTag cls={c} /></td>
                                            <td className={`${td} text-gray-600`}>{c.instructor || '—'}</td>
                                            <td className={`${td} whitespace-nowrap`}>
                                                <div className="flex items-center gap-1.5">
                                                    <button onClick={() => setRosterId(c.id)} className={`${btn} bg-red-600 text-white hover:bg-red-700`}>Members</button>
                                                    <button onClick={() => setForm({ open: true, cls: c })} className={`${btn} border border-gray-200 text-gray-700 hover:bg-gray-50`}>Edit</button>
                                                    <button onClick={() => handleDelete(c)} className={`${btn} border border-gray-200 text-gray-500 hover:bg-gray-50`}>Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <ClassFormModal open={form.open} cls={form.cls} onClose={() => setForm({ open: false, cls: null })} onSaved={refresh} />
            <ClassRosterModal classId={rosterId} onClose={() => setRosterId(null)} onChanged={refresh} onEdit={editClass} />
        </div>
    )
}
