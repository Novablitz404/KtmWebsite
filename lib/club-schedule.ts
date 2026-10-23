// Club Manager class schedule rules. Nothing here touches the database or the screen: validation, how times, days and belts
// read, and the checks (belt range, double-booking) that decide whether a member can join a class. Times are 'HH:mm' in club time.
import { BELT_ORDER } from '@/lib/belt-order'

export const BELTS = BELT_ORDER
export const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const DAY_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

export type ClassTimes = { days: number[]; startTime: string; endTime: string }
export type ClassBelts = { beltMin: string; beltMax: string }
export type ClassInput = ClassTimes & ClassBelts & {
    name: string; capacity: number; instructor: string | null; location: string | null; notes: string | null
}

export const clock = (value: string) => {
    const [h, m] = value.split(':').map(Number)
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

// "5:00 – 6:30 PM", or "11:00 AM – 1:00 PM" when the two sides differ.
export const timeRange = (c: ClassTimes) => {
    const start = clock(c.startTime), end = clock(c.endTime)
    return start.slice(-2) === end.slice(-2) ? `${start.slice(0, -3)} – ${end}` : `${start} – ${end}`
}

export const daysText = (days: number[]) => (days.length === 7 ? 'Every day' : [...days].sort((a, b) => a - b).map(d => DAY_SHORT[d - 1]).join(', '))

export const beltIndex = (belt: string | null | undefined) => (belt ? BELTS.findIndex(b => b.toLowerCase() === belt.toLowerCase()) : -1)
export const allBelts = (c: ClassBelts) => beltIndex(c.beltMin) === 0 && beltIndex(c.beltMax) === BELTS.length - 1
export const beltText = (c: ClassBelts) =>
    allBelts(c) ? 'All belts' : c.beltMin === c.beltMax ? `${c.beltMin} belt` : `${c.beltMin} – ${c.beltMax}`

// Two classes clash when they share a day and their times overlap.
export const overlaps = (a: ClassTimes, b: ClassTimes) =>
    a.days.some(d => b.days.includes(d)) && a.startTime < b.endTime && b.startTime < a.endTime

// Checks and tidies the fields of a class. Returns the cleaned class, or the first problem found.
export function validateClass(input: any): { value?: ClassInput; error?: string } {
    const rawDays: number[] = (Array.isArray(input?.days) ? (input.days as unknown[]) : []).map(Number)
    const days = Array.from(new Set(rawDays)).filter(d => Number.isInteger(d) && d >= 1 && d <= 7).sort((a, b) => a - b)
    const text = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim()
    const c: ClassInput = {
        name: text(input?.name),
        days,
        startTime: String(input?.startTime ?? ''), endTime: String(input?.endTime ?? ''),
        capacity: Number(input?.capacity),
        beltMin: String(input?.beltMin ?? BELTS[0]), beltMax: String(input?.beltMax ?? BELTS[BELTS.length - 1]),
        instructor: text(input?.instructor) || null,
        location: text(input?.location) || null,
        notes: String(input?.notes ?? '').trim() || null,
    }
    if (!c.name) return { error: 'Class name is required' }
    if (c.name.length > 80) return { error: 'Class name is too long' }
    if (c.instructor && c.instructor.length > 80) return { error: 'Instructor name is too long' }
    if (c.location && c.location.length > 120) return { error: 'Location is too long' }
    if (c.notes && c.notes.length > 500) return { error: 'Notes are too long (500 characters at most)' }
    if (days.length === 0) return { error: 'Choose at least one day' }
    if (!TIME.test(c.startTime) || !TIME.test(c.endTime)) return { error: 'Enter a valid start and end time' }
    if (c.endTime <= c.startTime) return { error: 'The end time must be after the start time' }
    if (!Number.isInteger(c.capacity) || c.capacity < 1 || c.capacity > 500) return { error: 'Capacity must be a whole number from 1 to 500' }
    const lo = beltIndex(c.beltMin), hi = beltIndex(c.beltMax)
    if (lo < 0 || hi < 0) return { error: 'Choose valid belts' }
    if (lo > hi) return { error: 'The lowest belt cannot be higher than the highest belt' }
    c.beltMin = BELTS[lo]; c.beltMax = BELTS[hi] // store the standard spelling
    return { value: c }
}

// Why a member with this belt cannot join the class, or null when they can.
export function beltProblem(c: ClassBelts, memberBelt: string | null | undefined): string | null {
    if (allBelts(c)) return null
    const index = beltIndex(memberBelt)
    if (index < 0) return 'has no belt rank set (set it in their profile first)'
    if (index < beltIndex(c.beltMin) || index > beltIndex(c.beltMax)) {
        return `is ${BELTS[index]} belt, but this class is for ${beltText(c)}`
    }
    return null
}
