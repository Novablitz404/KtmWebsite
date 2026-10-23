'use client'

// Small pieces shared by the Finance screens: money formatting, month list, status tags and the month dropdown.
import GlobalDropdown from '@/components/GlobalDropdown'
import { clubToday, monthName } from '@/lib/club-time'
import type { DueStatus } from '@/lib/club-dues'

export const money = (amount: number) => '₱' + amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const shortDate = (day: string) => new Date(day + 'T12:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })

// The current month and the 59 before it, newest first.
export function recentMonths(count = 60) {
    const [year, month] = clubToday().slice(0, 7).split('-').map(Number)
    return Array.from({ length: count }, (_, i) => {
        const d = new Date(Date.UTC(year, month - 1 - i, 1))
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    })
}

export function MonthPicker({ value, onChange, className = '' }: { value: string; onChange: (month: string) => void; className?: string }) {
    const months = recentMonths()
    if (!months.includes(value)) months.push(value)
    return (
        <GlobalDropdown
            label="Month"
            value={value}
            onChange={onChange}
            options={months.map(m => ({ label: monthName(m), value: m }))}
            fullWidth
            className={className}
        />
    )
}

const TAGS: Record<DueStatus, { label: string; cls: string }> = {
    paid: { label: 'Paid', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    overdue: { label: 'Overdue', cls: 'bg-red-50 text-red-700 border-red-100' },
    'due today': { label: 'Due today', cls: 'bg-amber-50 text-amber-700 border-amber-100' },
    upcoming: { label: 'Upcoming', cls: 'bg-blue-50 text-blue-700 border-blue-100' },
    'not set': { label: 'Billing day not set', cls: 'bg-gray-50 text-gray-500 border-gray-200' },
}

export function StatusTag({ status }: { status: DueStatus }) {
    const tag = TAGS[status]
    return <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap ${tag.cls}`}>{tag.label}</span>
}

export const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none text-sm transition-all'
export const labelClass = 'block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5'

// Grey bar shown where a value will appear once it has loaded.
export const Bar = ({ className = '' }: { className?: string }) => <span className={`inline-block rounded-md bg-gray-100 animate-pulse align-middle ${className}`} />
