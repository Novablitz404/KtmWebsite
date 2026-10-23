// Club Manager dues. Nothing here talks to the database: given a member's membership terms, what they have paid and any
// per-month overrides, it works out the month-by-month dues. Dates are club days ('YYYY-MM-DD', see lib/club-time.ts);
// money is compared in whole cents so 0.1 + 0.2 never leaves a stray balance.
export type DueStatus = 'paid' | 'overdue' | 'due today' | 'upcoming' | 'not set'

export type MembershipTerms = { monthlyFee: number; billingDay: number | null; joinedOn: string }

// PAST: a month the club never tracked in the app, with the fee owed. REMOVED: the month's dues were deleted.
export type DueOverride = { kind: 'PAST' | 'REMOVED'; fee: number | null }

export type LedgerMonth = {
    period: string          // 'YYYY-MM'
    fee: number
    paid: number
    owed: number
    dueDate: string | null  // YYYY-MM-DD, null when the member has no billing day
    status: DueStatus
}

const MAX_MONTHS = 120 // look back at most ten years
const pad = (n: number) => String(n).padStart(2, '0')
export const toCents = (amount: number) => Math.round(amount * 100)
export const fromCents = (cents: number) => cents / 100

export const isPeriod = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)

// Every month from the joining month to the current month, as 'YYYY-MM'.
export function periodsFor(joinedOn: string, today: string): string[] {
    const [endYear, endMonth] = today.slice(0, 7).split('-').map(Number)
    let [year, month] = (joinedOn || today).slice(0, 7).split('-').map(Number)
    const periods: string[] = []
    while (year < endYear || (year === endYear && month <= endMonth)) {
        periods.push(`${year}-${pad(month)}`)
        month += 1
        if (month > 12) { month = 1; year += 1 }
    }
    return periods.slice(-MAX_MONTHS)
}

// One month's dues. `paid` is what has been recorded against that month so far.
export function dueForPeriod(fee: number, billingDay: number | null, paid: number, period: string, today: string): LedgerMonth {
    const [year, month] = period.split('-').map(Number)
    const lastDay = new Date(year, month, 0).getDate()
    const scheduled = Number.isInteger(billingDay) && (billingDay as number) >= 1 && (billingDay as number) <= 31
    const dueDate = scheduled ? `${period}-${pad(Math.min(billingDay as number, lastDay))}` : null
    const owed = fromCents(Math.max(0, toCents(fee) - toCents(paid)))
    const status: DueStatus = owed === 0 ? 'paid'
        : !dueDate ? 'not set'
        : dueDate < today ? 'overdue'
        : dueDate === today ? 'due today'
        : 'upcoming'
    return { period, fee, paid, owed, dueDate, status }
}

// A member's month-by-month dues from their joining month to now, newest first. No fee means nothing is billed, except
// for months the club added as past records. Deleted months are left out.
export function memberLedger(
    terms: MembershipTerms,
    paidByPeriod: Map<string, number>,
    today: string,
    overrides: Map<string, DueOverride> = new Map(),
): LedgerMonth[] {
    const regular = terms.monthlyFee > 0 ? periodsFor(terms.joinedOn, today) : []
    const past = Array.from(overrides).filter(([, o]) => o.kind === 'PAST').map(([period]) => period)
    const periods = Array.from(new Set([...regular, ...past])).filter(period => overrides.get(period)?.kind !== 'REMOVED').sort()
    return periods
        .slice(-MAX_MONTHS)
        .map(period => {
            const override = overrides.get(period)
            const fee = override?.kind === 'PAST' && override.fee != null ? override.fee : terms.monthlyFee
            return dueForPeriod(fee, terms.billingDay, paidByPeriod.get(period) || 0, period, today)
        })
        .reverse()
}

// Total still owed across a list of months, in money.
export const totalOwed = (months: LedgerMonth[]) => fromCents(months.reduce((sum, m) => sum + toCents(m.owed), 0))

// Last day of a month as 'YYYY-MM-DD'.
export const lastDayOf = (period: string) => {
    const [year, month] = period.split('-').map(Number)
    return `${period}-${pad(new Date(year, month, 0).getDate())}`
}
