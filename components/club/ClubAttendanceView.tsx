'use client'

import { useState } from 'react'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { CalendarCheck, Download, LogIn } from 'lucide-react'
import { format } from 'date-fns'
import GlobalCalendar from '@/components/GlobalCalendar'
import ManualAttendanceModal from '@/components/club/ManualAttendanceModal'
import { listAttendance } from '@/app/club/attendance'
import { clubToday } from '@/lib/club-time'

const PAGE_SIZE = 15

function downloadCsv(filename: string, rows: (string | null)[][]) {
    const text = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }))
    link.download = filename
    link.click()
    URL.revokeObjectURL(link.href)
}

// Attendance tab of the club master dashboard: who checked in and out on a day, with manual check-in/out.
export default function ClubAttendanceView() {
    const queryClient = useQueryClient()
    const [day, setDay] = useState(() => clubToday())
    const [page, setPage] = useState(1)
    const [manualOpen, setManualOpen] = useState(false)

    const { data, isLoading } = useQuery({
        queryKey: ['club-attendance', day],
        queryFn: async () => {
            const res = await listAttendance(day)
            if (res.error) throw new Error(res.error)
            return res.records || []
        },
        placeholderData: keepPreviousData,
    })
    const records = data || []
    const pages = Math.max(1, Math.ceil(records.length / PAGE_SIZE))
    const current = Math.min(page, pages)
    const shown = records.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
    const isToday = day === clubToday()

    return (
        <div className="flex flex-col h-full min-h-screen md:min-h-0 bg-gray-50 p-4 sm:p-6">
            <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-visible">
                <div className="flex items-center justify-between gap-3 flex-wrap px-6 py-4 border-b border-gray-100 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center flex-shrink-0">
                            <CalendarCheck size={14} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-gray-900">Attendance</h2>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                                {records.length} record{records.length === 1 ? '' : 's'} {isToday ? 'today' : `on ${format(new Date(day + 'T12:00:00'), 'MMM d, yyyy')}`}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="w-44">
                            <GlobalCalendar value={day} onChange={(date: Date) => { setDay(format(date, 'yyyy-MM-dd')); setPage(1) }} placeholder="Select date..." fullWidth />
                        </div>
                        <button
                            type="button"
                            disabled={records.length === 0}
                            onClick={() => downloadCsv(`attendance-${day}.csv`, [['Member', 'Date', 'Check-in', 'Check-out', 'Method'], ...records.map(r => [r.name, r.day, r.inTime, r.outTime, r.method])])}
                            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
                        >
                            <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export CSV</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setManualOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
                        >
                            <LogIn className="w-4 h-4" /> <span className="hidden sm:inline">Manual check-in / out</span><span className="sm:hidden">Check in</span>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/70">
                            <tr>
                                {['Member', 'Check-in', 'Check-out', 'Method'].map(h => (
                                    <th key={h} className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading && !data ? (
                                <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-400">Loading…</td></tr>
                            ) : shown.length === 0 ? (
                                <tr><td colSpan={4} className="px-6 py-14 text-center text-sm text-gray-400">No attendance recorded {isToday ? 'yet today' : 'on this day'}.</td></tr>
                            ) : shown.map(r => (
                                <tr key={r.id} className="hover:bg-gray-50/50">
                                    <td className="px-6 py-3.5 text-sm font-semibold text-gray-900">{r.name}</td>
                                    <td className="px-6 py-3.5 text-sm text-gray-600">{r.inTime}</td>
                                    <td className="px-6 py-3.5 text-sm text-gray-600">
                                        {r.outTime || <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">Checked in</span>}
                                    </td>
                                    <td className="px-6 py-3.5 text-sm text-gray-500 capitalize">{r.method}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {records.length > PAGE_SIZE && (
                    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 text-xs text-gray-500">
                        <span>Showing {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, records.length)} of {records.length}</span>
                        <div className="flex items-center gap-2">
                            <button disabled={current === 1} onClick={() => setPage(current - 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg font-semibold disabled:opacity-40 hover:bg-gray-50">Previous</button>
                            <span>Page {current} of {pages}</span>
                            <button disabled={current === pages} onClick={() => setPage(current + 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg font-semibold disabled:opacity-40 hover:bg-gray-50">Next</button>
                        </div>
                    </div>
                )}
            </div>

            <ManualAttendanceModal
                isOpen={manualOpen}
                onClose={() => setManualOpen(false)}
                onRecorded={() => {
                    queryClient.invalidateQueries({ queryKey: ['club-attendance'] })
                    queryClient.invalidateQueries({ queryKey: ['member-attendance'] })
                }}
            />
        </div>
    )
}
