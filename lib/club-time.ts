// Club Manager times. A club's "day" is its local day in the Philippines (UTC+8, no daylight saving), not the server's
// UTC day, so a 7 pm check-in belongs to today for the club even though it is already tomorrow in UTC on the server.
// Plain functions only (no 'use server'), so both server code and client components can use them.
const OFFSET_HOURS = 8
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

const shifted = (date: Date) => new Date(date.getTime() + OFFSET_HOURS * HOUR)

/** 'YYYY-MM-DD' of a moment in club time. */
export const clubDay = (date: Date) => shifted(date).toISOString().slice(0, 10)

/** 'HH:mm' of a moment in club time. */
export const clubTime = (date: Date) => shifted(date).toISOString().slice(11, 16)

export const clubToday = () => clubDay(new Date())

export const isClubDay = (value: unknown): value is string =>
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + 'T00:00:00Z'))

/** The moments a club day starts and ends: [start, end). */
export function clubDayRange(day: string) {
    const start = new Date(`${day}T00:00:00+08:00`)
    return { start, end: new Date(start.getTime() + DAY) }
}

export const monthName = (month: string) =>
    new Date(`${month}-01T12:00:00Z`).toLocaleDateString('en-PH', { month: 'long', year: 'numeric', timeZone: 'UTC' })
