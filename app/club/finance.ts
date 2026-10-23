'use server'

// Club Manager: finance. Dues are worked out from each member's membership (see lib/club-dues.ts); only payments and
// per-month overrides are stored. Every amount that gets recorded is worked out here, never taken from the screen: the
// screen only sends the balance it was showing ("expected"), and the action refuses if that balance has since changed.
import { prisma } from '@/lib/prisma'
import { requireClubManagement, requireManagedMember } from '@/app/club/manager'
import { clubToday } from '@/lib/club-time'
import {
    memberLedger, totalOwed, isPeriod, lastDayOf, toCents, fromCents,
    type DueOverride, type DueStatus, type LedgerMonth,
} from '@/lib/club-dues'
import { revalidatePath } from 'next/cache'

export type DueRow = {
    userId: string
    name: string
    fee: number
    paid: number
    remaining: number
    dueDate: string | null
    status: DueStatus
    owedTotal: number       // still owed across every month, not just this one
}

export type PaymentRow = {
    id: string
    userId: string
    name: string
    amount: number
    category: string
    period: string | null
    paidOn: string          // YYYY-MM-DD
    note: string | null
}

const DUES = 'Monthly dues'
const dayDate = (day: string) => new Date(day + 'T00:00:00Z')
const dayString = (date: Date) => date.toISOString().slice(0, 10)
const fail = (error: any, fallback: string) => ({ error: (error?.message as string) || fallback })

type Ledger = { userId: string; name: string; months: LedgerMonth[] }

// Month-by-month dues for the club's billable members (or for one member). Inactive members are not billed.
async function loadLedgers(clubId: string, today: string, onlyUserId?: string): Promise<Ledger[]> {
    const userFilter = onlyUserId ? { userId: onlyUserId } : {}
    const [memberships, overrides, paid] = await Promise.all([
        prisma.clubMembership.findMany({ where: { clubId, status: 'ACTIVE', ...userFilter }, include: { user: { select: { id: true, name: true } } } }),
        prisma.clubDueOverride.findMany({ where: { clubId, ...userFilter } }),
        prisma.clubPayment.groupBy({ by: ['userId', 'period'], where: { clubId, category: DUES, period: { not: null }, ...userFilter }, _sum: { amount: true } }),
    ])
    const paidBy = new Map<string, Map<string, number>>()
    for (const row of paid) {
        if (!row.period) continue
        if (!paidBy.has(row.userId)) paidBy.set(row.userId, new Map())
        paidBy.get(row.userId)!.set(row.period, row._sum.amount ?? 0)
    }
    const overridesBy = new Map<string, Map<string, DueOverride>>()
    for (const row of overrides) {
        if (!overridesBy.has(row.userId)) overridesBy.set(row.userId, new Map())
        overridesBy.get(row.userId)!.set(row.period, { kind: row.kind === 'REMOVED' ? 'REMOVED' : 'PAST', fee: row.fee })
    }
    return memberships.map(m => ({
        userId: m.userId,
        name: m.user.name || 'Unnamed',
        months: memberLedger(
            { monthlyFee: m.monthlyFee, billingDay: m.billingDay, joinedOn: dayString(m.joinedOn) },
            paidBy.get(m.userId) || new Map(), today, overridesBy.get(m.userId) || new Map(),
        ),
    }))
}

// One member's dues for one month, after the checks Paid and Partial payment both need.
async function dueMonth(clubId: string, userId: string, period: string, expected?: number) {
    if (!isPeriod(period)) throw new Error('Select a valid dues month')
    const [ledger] = await loadLedgers(clubId, clubToday(), userId)
    const month = ledger?.months.find(m => m.period === period)
    if (!ledger || !month) throw new Error('This member has no dues for that month.')
    if (!(month.owed > 0)) throw new Error(`${ledger.name} has already paid for ${period}.`)
    if (expected !== undefined && Math.abs(Number(expected) - month.owed) > 0.004) {
        throw new Error(`${ledger.name}'s balance has changed to ${month.owed.toFixed(2)}. Review it and try again.`)
    }
    return { name: ledger.name, month }
}

const paymentData = (clubId: string, userId: string, amount: number, period: string, note: string) =>
    ({ clubId, userId, amount, category: DUES, period, paidOn: dayDate(clubToday()), note })

// ---------------------------------------------------------------------------------------------------------------

// The Finance tab for one month: every billable member's dues for that month, and the payments received in it.
export async function getFinanceMonth(month: string): Promise<{ rows?: DueRow[]; payments?: PaymentRow[]; error?: string }> {
    try {
        const { club } = await requireClubManagement(false)
        if (!isPeriod(month)) return { error: 'Select a valid month' }
        const today = clubToday()
        const [ledgers, payments] = await Promise.all([
            loadLedgers(club.id, today),
            prisma.clubPayment.findMany({
                where: { clubId: club.id, paidOn: { gte: dayDate(`${month}-01`), lte: dayDate(lastDayOf(month)) } },
                orderBy: [{ paidOn: 'desc' }, { createdAt: 'desc' }],
                include: { user: { select: { name: true } } },
            }),
        ])
        const rows: DueRow[] = []
        for (const ledger of ledgers) {
            const m = ledger.months.find(x => x.period === month)
            if (!m) continue
            rows.push({ userId: ledger.userId, name: ledger.name, fee: m.fee, paid: m.paid, remaining: m.owed, dueDate: m.dueDate, status: m.status, owedTotal: totalOwed(ledger.months) })
        }
        rows.sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999') || a.name.localeCompare(b.name))
        return {
            rows,
            payments: payments.map(p => ({ id: p.id, userId: p.userId, name: p.user.name || 'Unnamed', amount: p.amount, category: p.category, period: p.period, paidOn: dayString(p.paidOn), note: p.note })),
        }
    } catch (error) {
        return fail(error, 'Failed to load finance')
    }
}

// "Paid": records exactly the balance still owed for that member and month.
export async function markPaid(input: { memberId: string; period: string; expected: number }) {
    try {
        const { club } = await requireManagedMember(input.memberId, true)
        const { name, month } = await dueMonth(club.id, input.memberId, input.period, input.expected)
        await prisma.clubPayment.create({ data: paymentData(club.id, input.memberId, month.owed, input.period, month.paid > 0 ? 'Balance paid' : 'Paid in full') })
        revalidatePath('/club')
        return { success: true, name, amount: month.owed, period: input.period }
    } catch (error) {
        return fail(error, 'Failed to record the payment')
    }
}

// Partial payment: some, but not all, of what is still owed. Settling the full balance is what Paid is for.
export async function partialPayment(input: { memberId: string; period: string; amount: number; expected: number }) {
    try {
        const { club } = await requireManagedMember(input.memberId, true)
        const { name, month } = await dueMonth(club.id, input.memberId, input.period, input.expected)
        const cents = toCents(Number(input.amount)), owed = toCents(month.owed)
        if (!Number.isFinite(cents) || cents <= 0) return { error: 'Enter an amount greater than zero.' }
        if (cents >= owed) return { error: `That is the full balance (${month.owed.toFixed(2)}). Use Paid instead.` }
        await prisma.clubPayment.create({ data: paymentData(club.id, input.memberId, fromCents(cents), input.period, 'Partial payment') })
        revalidatePath('/club')
        return { success: true, name, amount: fromCents(cents), remaining: fromCents(owed - cents), period: input.period }
    } catch (error) {
        return fail(error, 'Failed to record the payment')
    }
}

// Pay all: settles every month the member still owes, oldest first, in one go (all or nothing).
export async function payAll(input: { memberId: string; expected: number }) {
    try {
        const { club } = await requireManagedMember(input.memberId, true)
        const [ledger] = await loadLedgers(club.id, clubToday(), input.memberId)
        const owing = (ledger?.months || []).filter(m => m.owed > 0).reverse()
        if (!ledger || owing.length === 0) return { error: `${ledger?.name || 'This member'} has nothing to pay.` }
        const total = totalOwed(owing)
        if (Math.abs(Number(input.expected) - total) > 0.004) return { error: `${ledger.name}'s balance has changed to ${total.toFixed(2)}. Review it and try again.` }
        await prisma.$transaction(owing.map(m => prisma.clubPayment.create({ data: paymentData(club.id, input.memberId, m.owed, m.period, m.paid > 0 ? 'Balance paid (all dues)' : 'Paid in full (all dues)') })))
        revalidatePath('/club')
        return { success: true, name: ledger.name, amount: total, months: owing.length }
    } catch (error) {
        return fail(error, 'Failed to record the payments')
    }
}

export async function deletePayment(id: string) {
    try {
        const { club } = await requireClubManagement(true)
        const result = await prisma.clubPayment.deleteMany({ where: { id, clubId: club.id } })
        if (result.count === 0) return { error: 'Payment not found' }
        revalidatePath('/club')
        return { success: true }
    } catch (error) {
        return fail(error, 'Failed to delete the payment')
    }
}

// A month the club never tracked in the app (e.g. before it started using it): the fee owed for it and what was already
// paid. Saving the same member and month again corrects the fee. The payment is dated in that month, not today, so it
// stays out of this month's income.
export async function addPastRecord(input: { memberId: string; period: string; fee: number; paid?: number }) {
    try {
        const { club, member } = await requireManagedMember(input.memberId, true)
        const today = clubToday()
        if (!isPeriod(input.period) || input.period > today.slice(0, 7)) return { error: 'Select a month that has already started' }
        const feeCents = toCents(Number(input.fee)), paidCents = toCents(Number(input.paid || 0))
        if (!Number.isFinite(feeCents) || feeCents <= 0) return { error: 'Enter the fee owed for that month' }
        if (!Number.isFinite(paidCents) || paidCents < 0 || paidCents > feeCents) return { error: 'The amount already paid cannot be more than the fee' }

        // The member's dues are listed through their membership, so make sure there is one (fee 0: only the past month is billed).
        await prisma.clubMembership.upsert({
            where: { clubId_userId: { clubId: club.id, userId: input.memberId } },
            create: { clubId: club.id, userId: input.memberId, status: 'ACTIVE', joinedOn: dayDate(today), monthlyFee: 0 },
            update: {},
        })
        const key = { clubId_userId_period: { clubId: club.id, userId: input.memberId, period: input.period } }
        const paidOn = lastDayOf(input.period) < today ? lastDayOf(input.period) : today
        await prisma.$transaction([
            prisma.clubDueOverride.upsert({
                where: key,
                create: { clubId: club.id, userId: input.memberId, period: input.period, kind: 'PAST', fee: fromCents(feeCents) },
                update: { kind: 'PAST', fee: fromCents(feeCents) },
            }),
            ...(paidCents > 0 ? [prisma.clubPayment.create({ data: { clubId: club.id, userId: input.memberId, amount: fromCents(paidCents), category: DUES, period: input.period, paidOn: dayDate(paidOn), note: 'Past record' } })] : []),
        ])
        revalidatePath('/club')
        return { success: true, name: member.name || 'Member', period: input.period }
    } catch (error) {
        return fail(error, 'Failed to save the past record')
    }
}

// Deletes one month's dues for a member: it stops showing and counting as owed. Payments already recorded for the month
// stay in the payment records. Adding a past record for the same month brings it back.
export async function removeDue(input: { memberId: string; period: string }) {
    try {
        const { club, member } = await requireManagedMember(input.memberId, true)
        if (!isPeriod(input.period)) return { error: 'Select a valid dues month' }
        await prisma.clubDueOverride.upsert({
            where: { clubId_userId_period: { clubId: club.id, userId: input.memberId, period: input.period } },
            create: { clubId: club.id, userId: input.memberId, period: input.period, kind: 'REMOVED', fee: null },
            update: { kind: 'REMOVED', fee: null },
        })
        revalidatePath('/club')
        return { success: true, name: member.name || 'Member', period: input.period }
    } catch (error) {
        return fail(error, 'Failed to delete the dues')
    }
}

// Members a club master can bill: everyone in the club except members marked inactive, with their usual monthly fee.
export async function financeRoster(): Promise<{ members?: { id: string; name: string; monthlyFee: number }[]; error?: string }> {
    try {
        const { club } = await requireClubManagement(false)
        const [users, memberships] = await Promise.all([
            prisma.user.findMany({ where: { clubName: club.name, role: { in: ['ATHLETE', 'ASSISTANT_CLUB_MASTER'] } }, select: { id: true, name: true } }),
            prisma.clubMembership.findMany({ where: { clubId: club.id }, select: { userId: true, status: true, monthlyFee: true } }),
        ])
        const byUser = new Map(memberships.map(m => [m.userId, m]))
        return {
            members: users.filter(u => byUser.get(u.id)?.status !== 'INACTIVE')
                .map(u => ({ id: u.id, name: u.name || 'Unnamed', monthlyFee: byUser.get(u.id)?.monthlyFee ?? 0 }))
                .sort((a, b) => a.name.localeCompare(b.name)),
        }
    } catch (error) {
        return fail(error, 'Failed to load members')
    }
}

export type MemberAccount = {
    member: { id: string; name: string; monthlyFee: number; billingDay: number | null; status: string }
    totals: { owed: number; thisMonth: number; earlier: number }
    months: LedgerMonth[]          // newest first
    payments: PaymentRow[]         // newest first
    lastPayment: { paidOn: string; amount: number } | null
}

// One member's account: dues month by month, what is owed in total, and every payment.
export async function getMemberAccount(memberId: string): Promise<{ account?: MemberAccount; error?: string }> {
    try {
        const { club, member } = await requireManagedMember(memberId, false)
        const today = clubToday()
        const [ledger] = await loadLedgers(club.id, today, memberId)
        const [membership, payments] = await Promise.all([
            prisma.clubMembership.findUnique({ where: { clubId_userId: { clubId: club.id, userId: memberId } } }),
            prisma.clubPayment.findMany({ where: { clubId: club.id, userId: memberId }, orderBy: [{ paidOn: 'desc' }, { createdAt: 'desc' }] }),
        ])
        const months = ledger?.months || []
        const owed = totalOwed(months)
        const thisMonth = totalOwed(months.filter(m => m.period === today.slice(0, 7)))
        const rows = payments.map(p => ({ id: p.id, userId: p.userId, name: member.name || 'Unnamed', amount: p.amount, category: p.category, period: p.period, paidOn: dayString(p.paidOn), note: p.note }))
        return {
            account: {
                member: { id: memberId, name: member.name || 'Unnamed', monthlyFee: membership?.monthlyFee ?? 0, billingDay: membership?.billingDay ?? null, status: membership?.status ?? 'ACTIVE' },
                totals: { owed, thisMonth, earlier: fromCents(toCents(owed) - toCents(thisMonth)) },
                months, payments: rows,
                lastPayment: rows[0] ? { paidOn: rows[0].paidOn, amount: rows[0].amount } : null,
            },
        }
    } catch (error) {
        return fail(error, 'Failed to load the account')
    }
}
