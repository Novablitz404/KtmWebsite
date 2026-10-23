'use client'

// Small pieces shared by the Schedule screens.
import type { ClassRow } from '@/app/club/schedule'

export const spotsLeft = (c: Pick<ClassRow, 'capacity' | 'enrolled'>) => c.capacity - c.enrolled
export const isFull = (c: Pick<ClassRow, 'capacity' | 'enrolled'>) => c.enrolled >= c.capacity
export const fillLevel = (c: Pick<ClassRow, 'capacity' | 'enrolled'>) => (isFull(c) ? 'full' : c.enrolled / c.capacity >= 0.8 ? 'busy' : 'ok')

const BAR_TONE = { full: 'bg-red-500', busy: 'bg-amber-500', ok: 'bg-emerald-500' }

// A thin bar showing how much of a class's capacity is taken.
export function CapacityBar({ cls }: { cls: Pick<ClassRow, 'capacity' | 'enrolled'> }) {
    const percent = Math.min(100, Math.round((cls.enrolled / cls.capacity) * 100))
    return (
        <span role="img" aria-label={`${cls.enrolled} of ${cls.capacity} places taken`} className="block h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
            <span className={`block h-full rounded-full ${BAR_TONE[fillLevel(cls)]}`} style={{ width: `${percent}%` }} />
        </span>
    )
}

export function SpotsTag({ cls }: { cls: Pick<ClassRow, 'capacity' | 'enrolled'> }) {
    return isFull(cls)
        ? <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-red-50 text-red-700 border-red-100">Full</span>
        : <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-100">{spotsLeft(cls)} left</span>
}
