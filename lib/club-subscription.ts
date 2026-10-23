// The Club management subscription: Attendance, Finance, Schedule and the check-in kiosks are paid features; Members
// and Registrations stay free. A club has at most one subscription (an AppLicense row linked to it by club id).
//   active  - paid up (or no end date)
//   grace   - ended up to 7 days ago: everything still works, with a warning
//   lapsed  - ended longer ago, or suspended: records can be viewed but not added or changed, kiosks stop checking in
//   none    - never subscribed: the paid features are locked
// Days are club-local calendar days (see lib/club-time.ts), and a subscription is valid through its end date.
import { prisma } from '@/lib/prisma'
import { clubToday } from '@/lib/club-time'

export const GRACE_DAYS = 7
export const SUBSCRIBE_MESSAGE = 'This is a paid feature. Contact KTM Sports through a support ticket to subscribe.'
export const LAPSED_MESSAGE = 'Your subscription has ended. Renew it to add or change records.'

export type SubscriptionState = 'active' | 'grace' | 'lapsed' | 'none'

export type Subscription = {
    state: SubscriptionState
    suspended: boolean
    expiresOn: string | null   // YYYY-MM-DD, null = no end date
    daysLeft: number | null    // calendar days left (negative once ended); null = no end date
    graceDaysLeft: number | null
    canView: boolean
    canWrite: boolean
}

const DAY = 24 * 60 * 60 * 1000
const dayNumber = (day: string) => Math.round(Date.parse(`${day}T00:00:00Z`) / DAY)

// Pure rule, so it can be tested without a database.
export function subscriptionFrom(row: { status: string; expiresOn: string | null } | null, today: string = clubToday()): Subscription {
    if (!row) return { state: 'none', suspended: false, expiresOn: null, daysLeft: null, graceDaysLeft: null, canView: false, canWrite: false }
    const suspended = row.status !== 'ACTIVE'
    const daysLeft = row.expiresOn ? dayNumber(row.expiresOn) - dayNumber(today) : null
    const base = { suspended, expiresOn: row.expiresOn, daysLeft, graceDaysLeft: null as number | null }
    if (suspended || (daysLeft !== null && daysLeft < -GRACE_DAYS)) return { ...base, state: 'lapsed', canView: true, canWrite: false }
    if (daysLeft !== null && daysLeft < 0) return { ...base, state: 'grace', graceDaysLeft: GRACE_DAYS + daysLeft, canView: true, canWrite: true }
    return { ...base, state: 'active', canView: true, canWrite: true }
}

export async function getSubscription(clubId: string): Promise<Subscription> {
    const row = await prisma.appLicense.findUnique({ where: { clubId }, select: { status: true, expiresAt: true } })
    return subscriptionFrom(row ? { status: row.status, expiresOn: row.expiresAt ? row.expiresAt.toISOString().slice(0, 10) : null } : null)
}

// Throws the message the screens show when the club may not do this. `write` = adds or changes records.
export function assertSubscription(sub: Subscription, write: boolean) {
    if (!sub.canView) throw new Error(SUBSCRIBE_MESSAGE)
    if (write && !sub.canWrite) throw new Error(LAPSED_MESSAGE)
}
