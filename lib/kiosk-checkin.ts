// What the kiosk helper may do for its club: read the roster and settings, and record face check-ins.
// The rules match a manual check-in (club-local days, one open visit per day, inactive members refused) plus two kiosk
// rules: a scan within 2 minutes of the member's last scan is ignored, and every scan carries an event id so a retry is
// recorded once.
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { clubDay, clubDayRange, clubTime } from '@/lib/club-time'
import { getSubscription, GRACE_DAYS } from '@/lib/club-subscription'

export const RECENT_MS = 2 * 60 * 1000
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000   // a kiosk can be offline this long and still deliver its scans (matches the app's offline allowance)
const MAX_AHEAD_MS = 5 * 60 * 1000            // allowance for the kiosk PC's clock running a little fast

export const EVENT_PATTERN = /^[A-Za-z0-9_-]{8,64}$/

export type LicenseState = 'active' | 'none' | 'suspended' | 'expired'

// What the kiosk is told about the club's Club management subscription (see lib/club-subscription.ts). Check-in works while it is
// active or in its 7-day grace period; a suspended or ended one, or none at all, pauses it.
export async function licenseInfo(clubId: string): Promise<{ state: LicenseState; expiresOn: string | null }> {
    const sub = await getSubscription(clubId)
    if (sub.state === 'none') return { state: 'none', expiresOn: null }
    if (sub.state === 'lapsed') return { state: sub.suspended ? 'suspended' : 'expired', expiresOn: sub.expiresOn }
    return { state: 'active', expiresOn: sub.expiresOn }
}

export async function kioskRoster(club: { id: string; name: string }) {
    const [users, inactive, settings, license, clears] = await Promise.all([
        prisma.user.findMany({ where: { clubName: club.name, role: { in: ['ATHLETE', 'ASSISTANT_CLUB_MASTER'] } }, select: { id: true, name: true, belt: true } }),
        prisma.clubMembership.findMany({ where: { clubId: club.id, status: 'INACTIVE' }, select: { userId: true } }),
        prisma.clubKioskSettings.findUnique({ where: { clubId: club.id } }),
        licenseInfo(club.id),
        prisma.kioskFaceClear.findMany({ where: { clubId: club.id, createdAt: { gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }, select: { userId: true, createdAt: true } }),
    ])
    const skip = new Set(inactive.map(r => r.userId))
    return {
        club: club.name,
        serverTime: new Date().toISOString(),
        license: license.state,
        licenseExpiresOn: license.expiresOn,
        graceDays: GRACE_DAYS,
        // Faces the club master asked to clear. A kiosk deletes one only if it was enrolled before the request.
        clearFaces: clears.map(c => ({ userId: c.userId, at: c.createdAt.toISOString() })),
        settings: { faceEnabled: settings?.faceEnabled ?? true, antispoofMin: settings?.antispoofMin ?? 0.5 },
        members: users.filter(u => !skip.has(u.id)).map(u => ({ id: u.id, name: u.name || 'Unnamed', belt: u.belt }))
            .sort((a, b) => a.name.localeCompare(b.name)),
    }
}

export type CheckinResult =
    | { ok: true; result: 'checked-in' | 'checked-out' | 'recent' | 'duplicate'; name: string; time: string }
    | { ok: false; status: number; error: string }

// One scan from a kiosk. `at` is when the face was seen (it may be old if the kiosk was offline).
export async function recordKioskScan(device: { id: string; clubId: string }, input: { eventId: string; memberId: string; at: Date; method: string }): Promise<CheckinResult> {
    const { eventId, memberId, at } = input
    const method = input.method === 'fingerprint' ? 'fingerprint' : 'face'
    const age = Date.now() - at.getTime()
    if (age > MAX_AGE_MS) return { ok: false, status: 422, error: 'This scan is too old to record' }
    if (age < -MAX_AHEAD_MS) return { ok: false, status: 422, error: 'This scan is dated in the future. Check the PC clock.' }

    const club = await prisma.club.findUnique({ where: { id: device.clubId }, select: { id: true, name: true } })
    if (!club) return { ok: false, status: 404, error: 'Club not found' }
    const license = (await licenseInfo(club.id)).state
    if (license !== 'active') return { ok: false, status: 403, error: license === 'none' ? 'This club has no active subscription' : license === 'suspended' ? 'This club’s subscription is suspended' : 'This club’s subscription has ended' }

    const member = await prisma.user.findUnique({ where: { id: memberId }, select: { name: true, clubName: true } })
    if (!member || member.clubName !== club.name) return { ok: false, status: 404, error: 'Member not found in this club' }
    const name = member.name || 'Member'

    // A retry of a scan already recorded.
    const seen = await prisma.clubAttendance.findFirst({ where: { clubId: club.id, OR: [{ eventId }, { outEventId: eventId }] }, select: { checkIn: true, checkOut: true, eventId: true } })
    if (seen) return { ok: true, result: 'duplicate', name, time: clubTime(seen.eventId === eventId ? seen.checkIn : seen.checkOut || seen.checkIn) }

    const membership = await prisma.clubMembership.findUnique({ where: { clubId_userId: { clubId: club.id, userId: memberId } }, select: { status: true } })
    if (membership?.status === 'INACTIVE') return { ok: false, status: 403, error: `${name} is not an active member` }

    const { start, end } = clubDayRange(clubDay(at))
    const last = await prisma.clubAttendance.findFirst({ where: { clubId: club.id, userId: memberId }, orderBy: { checkIn: 'desc' } })
    const lastScan = last ? Math.max(last.checkIn.getTime(), last.checkOut?.getTime() ?? 0) : 0
    if (lastScan && Math.abs(at.getTime() - lastScan) < RECENT_MS) return { ok: true, result: 'recent', name, time: clubTime(new Date(lastScan)) }

    const open = await prisma.clubAttendance.findFirst({
        where: { clubId: club.id, userId: memberId, checkOut: null, checkIn: { gte: start, lt: end } },
        orderBy: { checkIn: 'desc' },
    })
    try {
        if (open && at.getTime() > open.checkIn.getTime()) {
            await prisma.clubAttendance.updateMany({ where: { id: open.id, checkOut: null }, data: { checkOut: at, outEventId: eventId, deviceId: device.id } })
            return { ok: true, result: 'checked-out', name, time: clubTime(at) }
        }
        await prisma.clubAttendance.create({ data: { clubId: club.id, userId: memberId, checkIn: at, method, eventId, deviceId: device.id } })
        return { ok: true, result: 'checked-in', name, time: clubTime(at) }
    } catch (error) {
        // The same event arrived twice at once: the other request won.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return { ok: true, result: 'duplicate', name, time: clubTime(at) }
        throw error
    }
}

// The kiosk says which members have a face enrolled on it (ids only). That replaces what the website knew about this kiosk.
export async function reportEnrolled(device: { id: string; clubId: string }, memberIds: string[]) {
    const club = await prisma.club.findUnique({ where: { id: device.clubId }, select: { name: true } })
    if (!club) return 0
    const members = await prisma.user.findMany({ where: { id: { in: memberIds }, clubName: club.name }, select: { id: true } })
    const ids = members.map(m => m.id)
    await prisma.$transaction([
        prisma.kioskFaceEnrollment.deleteMany({ where: { deviceId: device.id, userId: { notIn: ids } } }),
        ...ids.map(userId => prisma.kioskFaceEnrollment.upsert({
            where: { deviceId_userId: { deviceId: device.id, userId } },
            create: { clubId: device.clubId, userId, deviceId: device.id },
            update: {},
        })),
    ])
    return ids.length
}
