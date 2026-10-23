'use server'

// Club Manager: invoices. What goes on a member's invoice (club details, payment QR code, note) and the figures for it.
// The PDF itself is drawn in the browser (lib/generateMemberInvoicePDF.ts) from what getInvoiceData returns.
import { prisma } from '@/lib/prisma'
import { requireClubManagement, requireManagedMember } from '@/app/club/manager'
import { clubToday } from '@/lib/club-time'
import { memberLedger, totalOwed, isPeriod, toCents, fromCents, type DueOverride } from '@/lib/club-dues'
import { revalidatePath } from 'next/cache'

export type BillingSettings = {
    contactEmail: string
    taxId: string
    invoiceNote: string
    payQrImage: string   // data URL, '' when none
    payQrLabel: string
}

const LIMITS = { contactEmail: 120, taxId: 60, invoiceNote: 300, payQrLabel: 120 }
const MAX_QR = 900 * 1024
const IMAGE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/
const clean = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim()
const fail = (error: any, fallback: string) => ({ error: (error?.message as string) || fallback })

export async function getBillingSettings(): Promise<{ settings?: BillingSettings; club?: { name: string; address: string; phone: string }; error?: string }> {
    try {
        const { club } = await requireClubManagement(false)
        const [details, settings] = await Promise.all([
            prisma.club.findUnique({ where: { id: club.id }, select: { name: true, address: true, phone: true } }),
            prisma.clubInvoiceSettings.findUnique({ where: { clubId: club.id } }),
        ])
        return {
            club: { name: details?.name || club.name, address: details?.address || '', phone: details?.phone || '' },
            settings: {
                contactEmail: settings?.contactEmail || '', taxId: settings?.taxId || '', invoiceNote: settings?.invoiceNote || '',
                payQrImage: settings?.payQrImage || '', payQrLabel: settings?.payQrLabel || '',
            },
        }
    } catch (error) {
        return fail(error, 'Failed to load billing settings')
    }
}

export async function saveBillingSettings(input: Partial<BillingSettings>) {
    try {
        const { club } = await requireClubManagement(true)
        const next = {
            contactEmail: clean(input.contactEmail), taxId: clean(input.taxId),
            invoiceNote: clean(input.invoiceNote), payQrLabel: clean(input.payQrLabel),
        }
        for (const [key, max] of Object.entries(LIMITS)) {
            if (key in next && (next as Record<string, string>)[key].length > max) return { error: `${key} is too long (${max} characters at most).` }
        }
        if (next.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.contactEmail)) return { error: 'Enter a valid email address, or leave it empty.' }
        const qr = String(input.payQrImage ?? '')
        if (qr && (!IMAGE.test(qr) || qr.length > MAX_QR)) return { error: 'The payment QR code must be a PNG, JPG or WebP image under 650 KB.' }

        const data = { ...next, payQrImage: qr || null }
        await prisma.clubInvoiceSettings.upsert({ where: { clubId: club.id }, create: { clubId: club.id, ...data }, update: data })
        revalidatePath('/club')
        return { success: true }
    } catch (error) {
        return fail(error, 'Failed to save billing settings')
    }
}

export type InvoiceData = {
    number: string
    issued: string                 // YYYY-MM-DD
    club: { name: string; address: string; phone: string; email: string; taxId: string; logoUrl: string }
    note: string
    payQr: { image: string; label: string } | null
    member: { name: string }
    due: string | null             // earliest due date among the unpaid months
    months: { period: string; fee: number; paid: number; owed: number }[]   // oldest first
    payments: { paidOn: string; period: string | null; amount: number }[]
    totals: { fee: number; paid: number; owed: number }
}

// Everything an invoice for the given months needs. Months with nothing owed can be included (a paid-up statement).
export async function getInvoiceData(memberId: string, periods: string[]): Promise<{ invoice?: InvoiceData; error?: string }> {
    try {
        const { club, member } = await requireManagedMember(memberId, false)
        if (!Array.isArray(periods) || periods.length === 0 || periods.length > 36 || !periods.every(isPeriod)) return { error: 'Choose the months to invoice' }
        const today = clubToday()

        const [membership, overrides, payments, details, settings] = await Promise.all([
            prisma.clubMembership.findUnique({ where: { clubId_userId: { clubId: club.id, userId: memberId } } }),
            prisma.clubDueOverride.findMany({ where: { clubId: club.id, userId: memberId } }),
            prisma.clubPayment.findMany({ where: { clubId: club.id, userId: memberId, category: 'Monthly dues', period: { in: periods } }, orderBy: [{ paidOn: 'asc' }, { createdAt: 'asc' }] }),
            prisma.club.findUnique({ where: { id: club.id }, select: { name: true, address: true, phone: true, logoUrl: true } }),
            prisma.clubInvoiceSettings.findUnique({ where: { clubId: club.id } }),
        ])
        if (!membership) return { error: 'This member has no dues to invoice.' }

        const paidBy = new Map<string, number>()
        for (const p of payments) if (p.period) paidBy.set(p.period, (paidBy.get(p.period) || 0) + toCents(p.amount) / 100)
        const overrideMap = new Map<string, DueOverride>(overrides.map(o => [o.period, { kind: o.kind === 'REMOVED' ? 'REMOVED' : 'PAST', fee: o.fee }]))
        const ledger = memberLedger({ monthlyFee: membership.monthlyFee, billingDay: membership.billingDay, joinedOn: membership.joinedOn.toISOString().slice(0, 10) }, paidBy, today, overrideMap)

        const wanted = new Set(periods)
        const months = ledger.filter(m => wanted.has(m.period)).reverse() // oldest first
        if (months.length === 0) return { error: 'None of those months have dues.' }

        const feeCents = months.reduce((s, m) => s + toCents(m.fee), 0)
        const owedCents = toCents(totalOwed(months))
        const unpaidDue = months.filter(m => m.owed > 0 && m.dueDate).map(m => m.dueDate as string).sort()[0] || null
        const compact = today.replace(/-/g, '')

        return {
            invoice: {
                number: `INV-${compact}-${memberId.slice(-4)}`,
                issued: today,
                club: {
                    name: details?.name || club.name, address: details?.address || '', phone: details?.phone || '',
                    email: settings?.contactEmail || '', taxId: settings?.taxId || '', logoUrl: details?.logoUrl || '',
                },
                note: settings?.invoiceNote || '',
                payQr: settings?.payQrImage ? { image: settings.payQrImage, label: settings.payQrLabel || '' } : null,
                member: { name: member.name || 'Member' },
                due: unpaidDue,
                months: months.map(m => ({ period: m.period, fee: m.fee, paid: m.paid, owed: m.owed })),
                payments: payments.map(p => ({ paidOn: p.paidOn.toISOString().slice(0, 10), period: p.period, amount: p.amount })),
                totals: { fee: fromCents(feeCents), paid: fromCents(feeCents - owedCents), owed: fromCents(owedCents) },
            },
        }
    } catch (error) {
        return fail(error, 'Failed to prepare the invoice')
    }
}
