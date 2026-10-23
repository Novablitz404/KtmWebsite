'use server'

// Admin-only actions for the Club management subscriptions (Admin dashboard > Subscriptions): which clubs may use
// Attendance, Finance, Schedule and the check-in kiosks. One subscription per club.
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/supabase/server'
import { dateOnly, generateLicenseKey } from '@/lib/license'

export type LicenseRow = {
    id: string
    clubId: string | null
    clubName: string
    contact: string | null
    status: 'ACTIVE' | 'SUSPENDED'
    expiresOn: string | null
    notes: string | null
    createdAt: string
    paymentCount: number
}

export type LicensePaymentRow = { id: string; amount: number; months: number | null; paidOn: string; note: string | null }

async function requireAdmin() {
    const user = await getAuthUser()
    if (!user || user.role !== 'ADMIN') throw new Error('Unauthorized')
}

const toRow = (license: any): LicenseRow => ({
    id: license.id,
    clubId: license.clubId,
    clubName: license.club?.name || license.clubName,
    contact: license.contact,
    status: license.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE',
    expiresOn: dateOnly(license.expiresAt),
    notes: license.notes,
    createdAt: license.createdAt.toISOString(),
    paymentCount: license._count?.payments ?? 0,
})

// Same day next month, or the last day of a shorter month (31 Jan + 1 month = 28/29 Feb).
function addMonths(date: Date, months: number) {
    const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1))
    const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate()
    result.setUTCDate(Math.min(date.getUTCDate(), lastDay))
    return result
}
const today = () => new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z')
const parseDate = (value: string | null | undefined) => (value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + 'T00:00:00Z') : null)

export async function listLicenses(): Promise<{ licenses?: LicenseRow[]; error?: string }> {
    try {
        await requireAdmin()
        const licenses = await prisma.appLicense.findMany({ orderBy: { createdAt: 'desc' }, include: { club: { select: { name: true } }, _count: { select: { payments: true } } } })
        return { licenses: licenses.map(toRow) }
    } catch (error: any) {
        return { error: error.message || 'Failed to load licenses' }
    }
}

// Clubs that can still be given a subscription (approved, and without one).
export async function listClubsWithoutSubscription(): Promise<{ clubs?: { id: string; name: string }[]; error?: string }> {
    try {
        await requireAdmin()
        const clubs = await prisma.club.findMany({ where: { status: 'APPROVED', appLicense: null }, select: { id: true, name: true }, orderBy: { name: 'asc' } })
        return { clubs }
    } catch (error: any) {
        return { error: error.message || 'Failed to load clubs' }
    }
}

export async function createLicense(input: { clubId: string; contact?: string; months: number }) {
    try {
        await requireAdmin()
        const club = await prisma.club.findUnique({ where: { id: String(input.clubId || '') }, select: { id: true, name: true, appLicense: { select: { id: true } } } })
        if (!club) return { error: 'Choose a club' }
        if (club.appLicense) return { error: `${club.name} already has a subscription` }
        const months = Math.floor(Number(input.months))
        if (!Number.isFinite(months) || months < 0 || months > 120) return { error: 'Months must be between 0 and 120 (0 = never expires)' }
        const license = await prisma.appLicense.create({
            data: { key: generateLicenseKey(), clubId: club.id, clubName: club.name, contact: input.contact?.trim().slice(0, 160) || null, expiresAt: months > 0 ? addMonths(today(), months) : null },
        })
        return { success: true, id: license.id }
    } catch (error: any) {
        console.error('Create subscription error:', error)
        return { error: error.message === 'Unauthorized' ? 'Unauthorized' : 'Failed to create the subscription' }
    }
}

export async function updateLicense(id: string, input: { contact?: string | null; status: string; expiresOn?: string | null; notes?: string | null }) {
    try {
        await requireAdmin()
        if (!['ACTIVE', 'SUSPENDED'].includes(input.status)) return { error: 'Invalid status' }
        const expiresAt = input.expiresOn ? parseDate(input.expiresOn) : null
        if (input.expiresOn && !expiresAt) return { error: 'Enter a valid end date' }
        await prisma.appLicense.update({
            where: { id },
            data: { contact: input.contact?.trim().slice(0, 160) || null, status: input.status, expiresAt, notes: input.notes?.trim().slice(0, 1000) || null },
        })
        return { success: true }
    } catch (error: any) {
        console.error('Update subscription error:', error)
        return { error: error.message === 'Unauthorized' ? 'Unauthorized' : 'Failed to update the subscription' }
    }
}

// Records what the club paid and moves the end date forward: from the current end date, or from today if it already ended.
export async function recordLicensePayment(id: string, input: { amount: number; months: number; note?: string }) {
    try {
        await requireAdmin()
        const amount = Number(input.amount), months = Math.floor(Number(input.months))
        if (!Number.isFinite(amount) || amount < 0) return { error: 'Enter the amount paid' }
        if (!Number.isFinite(months) || months < 1 || months > 120) return { error: 'Months paid must be between 1 and 120' }
        const license = await prisma.appLicense.findUnique({ where: { id }, select: { expiresAt: true } })
        if (!license) return { error: 'License not found' }
        const base = license.expiresAt && license.expiresAt > today() ? license.expiresAt : today()
        const expiresAt = addMonths(base, months)
        await prisma.$transaction([
            prisma.appLicensePayment.create({ data: { licenseId: id, amount, months, note: input.note?.trim().slice(0, 200) || null } }),
            prisma.appLicense.update({ where: { id }, data: { expiresAt, status: 'ACTIVE' } }),
        ])
        return { success: true, expiresOn: dateOnly(expiresAt) }
    } catch (error: any) {
        console.error('License payment error:', error)
        return { error: error.message === 'Unauthorized' ? 'Unauthorized' : 'Failed to record the payment' }
    }
}

export async function getLicensePayments(id: string): Promise<{ payments?: LicensePaymentRow[]; error?: string }> {
    try {
        await requireAdmin()
        const payments = await prisma.appLicensePayment.findMany({ where: { licenseId: id }, orderBy: [{ paidOn: 'desc' }, { createdAt: 'desc' }] })
        return { payments: payments.map(p => ({ id: p.id, amount: p.amount, months: p.months, paidOn: dateOnly(p.paidOn)!, note: p.note })) }
    } catch (error: any) {
        return { error: error.message || 'Failed to load payments' }
    }
}

export async function deleteLicense(id: string) {
    try {
        await requireAdmin()
        await prisma.appLicense.delete({ where: { id } })
        return { success: true }
    } catch (error: any) {
        return { error: error.message === 'Unauthorized' ? 'Unauthorized' : 'Failed to delete the subscription' }
    }
}
