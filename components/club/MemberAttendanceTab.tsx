'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import GlobalDropdown from '@/components/GlobalDropdown'
import { memberAttendanceQuery } from '@/lib/club-queries'
import { clubToday, monthName } from '@/lib/club-time'

const PAGE_SIZE = 5

// Where a value will appear once it has loaded; the headings, labels and table headers around it show straight away.
const Bar = ({ className = '' }: { className?: string }) => <span className={`inline-block rounded-md bg-gray-100 animate-pulse align-middle ${className}`} />

// Attendance tab in a member's profile: days present in a month, the days present in every month, and the visit history.
export default function MemberAttendanceTab({ memberId }: { memberId: string }) {
    const [month, setMonth] = useState(() => clubToday().slice(0, 7))
    const [page, setPage] = useState(1)

    const { data, error } = useQuery(memberAttendanceQuery(memberId))
    const loading = !data && !error

    const view = useMemo(() => {
        const records = data || []
        const daysByMonth = new Map<string, Set<string>>()
        for (const r of records) {
            const key = r.day.slice(0, 7)
            if (!daysByMonth.has(key)) daysByMonth.set(key, new Set())
            daysByMonth.get(key)!.add(r.day)
        }
        const thisMonth = clubToday().slice(0, 7)
        const months = Array.from(new Set([thisMonth, ...daysByMonth.keys()])).sort().reverse()
        const inMonth = records.filter(r => r.day.startsWith(month))
        return {
            months,
            inMonth,
            monthDays: new Set(inMonth.map(r => r.day)).size,
            allDays: new Set(records.map(r => r.day)).size,
            byMonth: Array.from(daysByMonth, ([key, days]) => ({ key, days: days.size })).sort((a, b) => b.key.localeCompare(a.key)),
        }
    }, [data, month])

    const pages = Math.max(1, Math.ceil(view.inMonth.length / PAGE_SIZE))
    const current = Math.min(page, pages)
    const shown = view.inMonth.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

    const stat = (label: string, value: number) => (
        <div className="rounded-xl bg-gray-50/70 border border-gray-100 px-2.5 py-2 text-center">
            <p className="text-lg font-black text-gray-900 leading-none h-[18px]">{loading ? <Bar className="w-6 h-[18px]" /> : value}</p>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-1 leading-tight">{label}</p>
        </div>
    )
    const heading = (text: string) => <p className="text-sm font-bold text-gray-900 mb-2">{text}</p>
    const th = 'px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest'
    const td = 'px-3 py-1.5 text-sm'

    return (
        <div className="space-y-3">
            {error && <p className="text-sm text-red-500 px-1">{(error as Error).message}</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-gray-100 bg-white p-3">
                    <div className="flex items-center justify-between gap-3 mb-2">
                        <p className="text-sm font-bold text-gray-900">This month</p>
                        <div className="w-40">
                            {loading ? <div className="h-[42px] rounded-xl bg-gray-100 animate-pulse" /> : (
                                <GlobalDropdown
                                    label="Month"
                                    value={month}
                                    onChange={value => { setMonth(value); setPage(1) }}
                                    options={view.months.map(m => ({ label: monthName(m), value: m }))}
                                    fullWidth
                                />
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {stat('Days present', view.monthDays)}
                        {stat('Check-ins', view.inMonth.length)}
                        {stat('All-time days', view.allDays)}
                    </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-3">
                    {heading('Days present by month')}
                    <div className="max-h-[100px] overflow-y-auto">
                        <table className="min-w-full">
                            <thead className="sticky top-0 bg-white"><tr><th className={th}>Month</th><th className={th}>Days</th></tr></thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? [0, 1].map(i => (
                                    <tr key={i}><td className={td}><Bar className="w-28 h-4" /></td><td className={td}><Bar className="w-6 h-4" /></td></tr>
                                )) : view.byMonth.length === 0 ? (
                                    <tr><td colSpan={2} className="px-3 py-3 text-xs text-gray-400">No attendance recorded yet.</td></tr>
                                ) : view.byMonth.map(row => (
                                    <tr key={row.key}><td className={`${td} text-gray-700`}>{monthName(row.key)}</td><td className={`${td} font-semibold text-gray-900`}>{row.days}</td></tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-3">
                {heading(`Attendance history · ${monthName(month)}`)}
                <table className="min-w-full">
                    <thead><tr><th className={th}>Date</th><th className={th}>Check-in</th><th className={th}>Check-out</th><th className={th}>Method</th></tr></thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? Array.from({ length: PAGE_SIZE }, (_, i) => (
                            <tr key={i}>
                                <td className={td}><Bar className="w-24 h-4" /></td><td className={td}><Bar className="w-10 h-4" /></td>
                                <td className={td}><Bar className="w-10 h-4" /></td><td className={td}><Bar className="w-14 h-4" /></td>
                            </tr>
                        )) : shown.length === 0 ? (
                            <tr><td colSpan={4} className="px-3 py-4 text-xs text-gray-400">No check-ins in this month.</td></tr>
                        ) : shown.map(r => (
                            <tr key={r.id}>
                                <td className={`${td} text-gray-700`}>{new Date(r.day + 'T12:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                                <td className={`${td} text-gray-600`}>{r.inTime}</td>
                                <td className={`${td} text-gray-600`}>{r.outTime || '—'}</td>
                                <td className={`${td} text-gray-500 capitalize`}>{r.method}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!loading && view.inMonth.length > PAGE_SIZE && (
                    <div className="flex items-center justify-between pt-3 mt-2 border-t border-gray-50 text-xs text-gray-500">
                        <span>Showing {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, view.inMonth.length)} of {view.inMonth.length}</span>
                        <div className="flex items-center gap-2">
                            <button disabled={current === 1} onClick={() => setPage(current - 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg font-semibold disabled:opacity-40 hover:bg-gray-50">Previous</button>
                            <span>Page {current} of {pages}</span>
                            <button disabled={current === pages} onClick={() => setPage(current + 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg font-semibold disabled:opacity-40 hover:bg-gray-50">Next</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
