import { authenticateApi, apiError, apiResponse } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'
import { memberLedger, totalOwed, type DueOverride } from '@/lib/club-dues'
import { clubToday } from '@/lib/club-time'

// GET /api/v1/athlete/payments — per-club monthly dues ledger plus payment history
export async function GET() {
    try {
        const user = await authenticateApi()
        if (!user) return apiError('Unauthorized', 401)

        const today = clubToday()
        const [memberships, payments, overrides] = await Promise.all([
            prisma.clubMembership.findMany({
                where: { userId: user.id },
                select: { clubId: true, status: true, joinedOn: true, monthlyFee: true, billingDay: true, club: { select: { name: true } } },
            }),
            prisma.clubPayment.findMany({
                where: { userId: user.id },
                orderBy: { paidOn: 'desc' },
                select: { id: true, clubId: true, amount: true, category: true, period: true, paidOn: true, note: true },
            }),
            prisma.clubDueOverride.findMany({ where: { userId: user.id } }),
        ])

        const clubs = memberships.map(m => {
            const paidBy = new Map<string, number>()
            for (const p of payments) {
                if (p.clubId === m.clubId && p.period) paidBy.set(p.period, (paidBy.get(p.period) || 0) + p.amount)
            }
            const overrideMap = new Map<string, DueOverride>()
            for (const o of overrides) {
                if (o.clubId === m.clubId) overrideMap.set(o.period, { kind: o.kind as DueOverride['kind'], fee: o.fee })
            }
            const months = memberLedger(
                { monthlyFee: m.monthlyFee, billingDay: m.billingDay, joinedOn: m.joinedOn.toISOString().slice(0, 10) },
                paidBy, today, overrideMap,
            )
            return {
                clubId: m.clubId, clubName: m.club.name, status: m.status,
                monthlyFee: m.monthlyFee, billingDay: m.billingDay,
                totalOwed: totalOwed(months), months,
            }
        })

        return apiResponse({ clubs, payments })
    } catch (error) {
        console.error('Athlete payments error:', error)
        return apiError('Failed to fetch payments', 500)
    }
}
