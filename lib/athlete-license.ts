/**
 * Athlete License — validity rules shared by the whole app.
 *
 * A license is valid while User.isVerified is true AND User.licenseExpiresAt is
 * either empty (legacy license, no end date) or still in the future. The daily
 * Supabase job (license_expiry_cron.sql) flips isVerified off once the date
 * passes, but every place that matters (points, rankings) also checks the date
 * itself, so a late or failed job can't let an expired license through.
 *
 * Free 2026 promo: every athlete is licensed free until the end of Dec 31, 2026
 * (Manila time). After that the free path switches itself off — no code change
 * needed — and licenses are paid + approved by a KTM admin as before.
 */

import { prisma } from '@/lib/prisma'
import { countryToCode } from '@/lib/countries'

/** End of Dec 31, 2026 in Manila (UTC+8) = 15:59:59.999 UTC. */
export const FREE_LICENSE_PROMO_END = new Date('2026-12-31T15:59:59.999Z')

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000

export function isFreeLicensePromoActive(now: Date = new Date()): boolean {
    return now.getTime() <= FREE_LICENSE_PROMO_END.getTime()
}

/**
 * Expiry date for a license issued/renewed at `now`: the end of Dec 31 of the
 * current year (Manila time). A license issued in December runs to the end of
 * next year, otherwise it would be worth only a few days.
 */
export function licenseExpiryFor(now: Date = new Date()): Date {
    const manila = new Date(now.getTime() + MANILA_OFFSET_MS)
    let year = manila.getUTCFullYear()
    if (manila.getUTCMonth() === 11) year += 1
    return new Date(Date.UTC(year, 11, 31, 15, 59, 59, 999))
}

export function isLicenseActive(
    user: { isVerified: boolean; licenseExpiresAt?: Date | null },
    now: Date = new Date()
): boolean {
    return user.isVerified && (!user.licenseExpiresAt || user.licenseExpiresAt.getTime() > now.getTime())
}

/** Of the given user ids, the ones whose license is valid right now. */
export async function getActiveLicenseUserIds(userIds: string[]): Promise<Set<string>> {
    if (userIds.length === 0) return new Set()
    const now = new Date()
    const rows = await prisma.user.findMany({
        where: {
            id: { in: userIds },
            isVerified: true,
            OR: [{ licenseExpiresAt: null }, { licenseExpiresAt: { gt: now } }],
        },
        select: { id: true },
    })
    return new Set(rows.map(r => r.id))
}

/** Random 7-digit athlete number like "PH-2026-0123456" (unique, retried on collision). */
export async function generateAthleteNumber(country: string | null | undefined): Promise<string> {
    const code = countryToCode(country)
    const year = new Date().getFullYear()
    const prefix = `${code}-${year}-`

    for (let attempt = 0; attempt < 20; attempt++) {
        const suffix = Math.floor(Math.random() * 10_000_000).toString().padStart(7, '0')
        const candidate = `${prefix}${suffix}`
        const existing = await prisma.user.findFirst({
            where: { athleteNumber: candidate },
            select: { id: true },
        })
        if (!existing) return candidate
    }

    throw new Error('Failed to generate a unique athlete number after 20 attempts')
}

/**
 * Grants the free promo license to one athlete: active until the end of 2026.
 * Never deletes or overwrites anything but the license fields — an existing
 * athlete number is kept, and a missing one is generated.
 *
 * By default only athletes who have never had a license date are granted, so an
 * admin who deliberately deactivated someone (which stamps a date) is not
 * silently re-activated. `force` is for the one-time activation script.
 */
export async function grantFreeLicense(userId: string, opts: { force?: boolean } = {}): Promise<boolean> {
    if (!isFreeLicensePromoActive()) return false

    const u = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, isVerified: true, licenseExpiresAt: true, athleteNumber: true, country: true, createdAt: true },
    })
    if (!u || u.role !== 'ATHLETE') return false
    if (isLicenseActive(u) && u.licenseExpiresAt) return false
    if (!opts.force && (u.isVerified || u.licenseExpiresAt)) return false

    const athleteNumber = u.athleteNumber ?? await generateAthleteNumber(u.country)
    await prisma.user.update({
        where: { id: userId },
        data: {
            isVerified: true,
            licenseExpiresAt: FREE_LICENSE_PROMO_END,
            athleteNumber,
            createdAt: u.createdAt ?? new Date(),
        },
    })
    return true
}

/** Safety net for the daily cron: free-license any athlete who slipped through signup. */
export async function grantFreeLicensesToNewAthletes(): Promise<number> {
    if (!isFreeLicensePromoActive()) return 0
    const rows = await prisma.user.findMany({
        where: { role: 'ATHLETE', isVerified: false, licenseExpiresAt: null },
        select: { id: true },
        take: 500,
    })
    let granted = 0
    for (const r of rows) {
        try {
            if (await grantFreeLicense(r.id)) granted++
        } catch (err) {
            console.error('[License] free grant failed for', r.id, err)
        }
    }
    return granted
}
