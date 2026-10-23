'use server'

// Club Manager: attendance. Members check in and out of their club; the club master reviews and corrects it here.
// Days are the club's local days (see lib/club-time.ts). Face and fingerprint check-ins arrive later through the kiosk helper.
import { prisma } from '@/lib/prisma'
import { requireClubManagement, requireManagedMember } from '@/app/club/manager'
import { clubDay, clubDayRange, clubTime, clubToday, isClubDay } from '@/lib/club-time'
import { revalidatePath } from 'next/cache'

export type AttendanceRecord = {
    id: string
    userId: string
    name: string
    day: string              // YYYY-MM-DD, club time
    inTime: string           // HH:mm
    outTime: string | null   // HH:mm, null while still checked in
    method: string
}

const toRecord = (row: { id: string; userId: string; checkIn: Date; checkOut: Date | null; method: string }, name: string): AttendanceRecord => ({
    id: row.id,
    userId: row.userId,
    name,
    day: clubDay(row.checkIn),
    inTime: clubTime(row.checkIn),
    outTime: row.checkOut ? clubTime(row.checkOut) : null,
    method: row.method,
})

export async function listAttendance(day: string): Promise<{ records?: AttendanceRecord[]; error?: string }> {
    try {
        const { club } = await requireClubManagement(false)
        if (!isClubDay(day)) return { error: 'Select a valid date' }
        const { start, end } = clubDayRange(day)
        const rows = await prisma.clubAttendance.findMany({
            where: { clubId: club.id, checkIn: { gte: start, lt: end } },
            orderBy: [{ checkIn: 'desc' }, { id: 'desc' }],
            include: { user: { select: { name: true } } },
        })
        return { records: rows.map(row => toRecord(row, row.user.name || 'Unnamed')) }
    } catch (error: any) {
        return { error: error.message || 'Failed to load attendance' }
    }
}

// Members who can be checked in: everyone in the club except members marked inactive.
export async function attendanceRoster(): Promise<{ members?: { id: string; name: string }[]; error?: string }> {
    try {
        const { club } = await requireClubManagement(false)
        const [users, inactive] = await Promise.all([
            prisma.user.findMany({
                where: { clubName: club.name, role: { in: ['ATHLETE', 'ASSISTANT_CLUB_MASTER'] } },
                select: { id: true, name: true },
            }),
            prisma.clubMembership.findMany({ where: { clubId: club.id, status: 'INACTIVE' }, select: { userId: true } }),
        ])
        const skip = new Set(inactive.map(row => row.userId))
        return {
            members: users.filter(u => !skip.has(u.id)).map(u => ({ id: u.id, name: u.name || 'Unnamed' }))
                .sort((a, b) => a.name.localeCompare(b.name)),
        }
    } catch (error: any) {
        return { error: error.message || 'Failed to load members' }
    }
}

// Manual check-in or check-out for one member, for today. 'check-in' fails if they are already in; 'check-out' fails if they are not.
export async function recordManualAttendance(memberId: string, only: 'check-in' | 'check-out') {
    try {
        if (only !== 'check-in' && only !== 'check-out') return { error: 'Choose check in or check out' }
        const { club, member } = await requireManagedMember(memberId, true)
        const name = member.name || 'This member'

        const membership = await prisma.clubMembership.findUnique({ where: { clubId_userId: { clubId: club.id, userId: memberId } }, select: { status: true } })
        if (membership?.status === 'INACTIVE') return { error: `${name} is not an active member` }

        const { start, end } = clubDayRange(clubToday())
        const open = await prisma.clubAttendance.findFirst({
            where: { clubId: club.id, userId: memberId, checkOut: null, checkIn: { gte: start, lt: end } },
            orderBy: { checkIn: 'desc' },
        })
        if (only === 'check-in' && open) return { error: `${name} is already checked in` }
        if (only === 'check-out' && !open) return { error: `${name} is not checked in today` }

        const now = new Date()
        if (open) await prisma.clubAttendance.update({ where: { id: open.id }, data: { checkOut: now } })
        else await prisma.clubAttendance.create({ data: { clubId: club.id, userId: memberId, checkIn: now, method: 'manual' } })

        revalidatePath('/club')
        return { success: true, action: open ? 'check-out' : 'check-in', name, time: clubTime(now) }
    } catch (error: any) {
        console.error('Manual attendance error:', error)
        return { error: error.message || 'Failed to record attendance' }
    }
}

// Every visit of one member (newest first), for the Attendance tab in their profile. The tab works out days and months.
export async function getMemberAttendance(memberId: string): Promise<{ records?: AttendanceRecord[]; error?: string }> {
    try {
        const { club, member } = await requireManagedMember(memberId, false)
        const rows = await prisma.clubAttendance.findMany({
            where: { clubId: club.id, userId: memberId },
            orderBy: [{ checkIn: 'desc' }, { id: 'desc' }],
            take: 5000,
        })
        return { records: rows.map(row => toRecord(row, member.name || 'Unnamed')) }
    } catch (error: any) {
        return { error: error.message || 'Failed to load attendance' }
    }
}
