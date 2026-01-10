'use server'

import { prisma } from '@/lib/prisma'
import { currentUser } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'

// =============================================
// FACE ENROLLMENT
// =============================================

/**
 * Save face descriptor for a user (for face recognition check-in)
 */
export async function enrollFace(userId: string, faceDescriptor: number[]) {
    const user = await currentUser()
    if (!user) throw new Error('Unauthorized')

    // Verify user belongs to a club with master permission
    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
        select: { role: true, clubName: true }
    })

    if (!dbUser || (dbUser.role !== 'CLUB_MASTER' && dbUser.role !== 'ASSISTANT_CLUB_MASTER')) {
        throw new Error('Only Club Masters can enroll faces')
    }

    // Verify target user is in same club
    const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { clubName: true }
    })

    if (!targetUser || targetUser.clubName !== dbUser.clubName) {
        throw new Error('User not found or not in your club')
    }

    // Save face descriptor as JSON string
    await prisma.user.update({
        where: { id: userId },
        data: { faceDescriptor: JSON.stringify(faceDescriptor) }
    })

    revalidatePath('/club/attendance')
    revalidatePath('/members')
    return { success: true }
}

/**
 * Remove face descriptor for a user
 */
export async function removeFace(userId: string) {
    const user = await currentUser()
    if (!user) throw new Error('Unauthorized')

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
        select: { role: true, clubName: true }
    })

    if (!dbUser || (dbUser.role !== 'CLUB_MASTER' && dbUser.role !== 'ASSISTANT_CLUB_MASTER')) {
        throw new Error('Only Club Masters can remove faces')
    }

    const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { clubName: true }
    })

    if (!targetUser || targetUser.clubName !== dbUser.clubName) {
        throw new Error('User not found or not in your club')
    }

    await prisma.user.update({
        where: { id: userId },
        data: { faceDescriptor: null }
    })

    revalidatePath('/club/attendance')
    revalidatePath('/members')
    return { success: true }
}

// =============================================
// KIOSK ACCESS
// =============================================

/**
 * Generate a new kiosk token for a club
 */
export async function generateKioskToken(clubId: string) {
    const user = await currentUser()
    if (!user) throw new Error('Unauthorized')

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
        select: { role: true, club: { select: { id: true } } }
    })

    if (!dbUser || dbUser.role !== 'CLUB_MASTER' || dbUser.club?.id !== clubId) {
        throw new Error('Only the Club Master can generate kiosk tokens')
    }

    const token = crypto.randomBytes(32).toString('hex')

    await prisma.club.update({
        where: { id: clubId },
        data: { kioskToken: token }
    })

    revalidatePath('/club/attendance')
    return { token }
}

/**
 * Set or update kiosk PIN for a club
 */
export async function setKioskPin(clubId: string, pin: string) {
    const user = await currentUser()
    if (!user) throw new Error('Unauthorized')

    if (!/^\d{6}$/.test(pin)) {
        throw new Error('PIN must be exactly 6 digits')
    }

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
        select: { role: true, club: { select: { id: true } } }
    })

    if (!dbUser || dbUser.role !== 'CLUB_MASTER' || dbUser.club?.id !== clubId) {
        throw new Error('Only the Club Master can set kiosk PIN')
    }

    await prisma.club.update({
        where: { id: clubId },
        data: { kioskPin: pin }
    })

    revalidatePath('/club/attendance')
    return { success: true }
}

/**
 * Validate kiosk access (token + PIN)
 */
export async function validateKiosk(token: string, pin: string) {
    const club = await prisma.club.findUnique({
        where: { kioskToken: token },
        select: {
            id: true,
            name: true,
            kioskPin: true,
            logoUrl: true
        }
    })

    if (!club) {
        return { valid: false, error: 'Invalid kiosk token' }
    }

    if (club.kioskPin && club.kioskPin !== pin) {
        return { valid: false, error: 'Invalid PIN' }
    }

    return {
        valid: true,
        clubId: club.id,
        clubName: club.name,
        clubLogo: club.logoUrl
    }
}

// =============================================
// ATTENDANCE CHECK-IN
// =============================================

/**
 * Get all face descriptors for a club's members (for kiosk matching)
 */
export async function getClubFaceData(clubId: string) {
    const members = await prisma.user.findMany({
        where: {
            clubName: {
                equals: (await prisma.club.findUnique({
                    where: { id: clubId },
                    select: { name: true }
                }))?.name
            },
            role: 'ATHLETE',
            faceDescriptor: { not: null }
        },
        select: {
            id: true,
            name: true,
            faceDescriptor: true
        }
    })

    return members.map(m => ({
        id: m.id,
        name: m.name,
        descriptor: JSON.parse(m.faceDescriptor!)
    }))
}

/**
 * Record a check-in via face recognition
 */
export async function checkInByFace(clubId: string, userId: string, confidence: number) {
    // Get today's date (without time)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Check if already checked in today
    const existing = await prisma.attendanceRecord.findUnique({
        where: {
            clubId_userId_date: {
                clubId,
                userId,
                date: today
            }
        }
    })

    if (existing) {
        return { success: false, error: 'Already checked in today' }
    }

    // Record check-in
    await prisma.attendanceRecord.create({
        data: {
            clubId,
            userId,
            date: today,
            confidence
        }
    })

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true }
    })

    return { success: true, userName: user?.name }
}

/**
 * Get today's attendance for a club
 */
export async function getTodayAttendance(clubId: string) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const records = await prisma.attendanceRecord.findMany({
        where: {
            clubId,
            date: today
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    clerkId: true
                }
            }
        },
        orderBy: { checkInTime: 'desc' }
    })

    return records
}

/**
 * Get attendance report for a date range
 */
export async function getAttendanceReport(clubId: string, startDate: Date, endDate: Date) {
    const records = await prisma.attendanceRecord.findMany({
        where: {
            clubId,
            date: {
                gte: startDate,
                lte: endDate
            }
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true
                }
            }
        },
        orderBy: { date: 'desc' }
    })

    // Group by date
    const grouped = records.reduce((acc, record) => {
        const dateKey = record.date.toISOString().split('T')[0]
        if (!acc[dateKey]) acc[dateKey] = []
        acc[dateKey].push(record)
        return acc
    }, {} as Record<string, typeof records>)

    return grouped
}

/**
 * Get total member count and attendance count for a club
 */
export async function getClubAttendanceStats(clubId: string) {
    const club = await prisma.club.findUnique({
        where: { id: clubId },
        select: { name: true }
    })

    if (!club) return null

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [totalMembers, enrolledMembers, todayCount] = await Promise.all([
        prisma.user.count({
            where: { clubName: club.name, role: 'ATHLETE' }
        }),
        prisma.user.count({
            where: { clubName: club.name, role: 'ATHLETE', faceDescriptor: { not: null } }
        }),
        prisma.attendanceRecord.count({
            where: { clubId, date: today }
        })
    ])

    return { totalMembers, enrolledMembers, todayCount }
}

// =============================================
// MANUAL CHECK-IN & MANAGEMENT
// =============================================

/**
 * Search members by name for manual check-in or enrollment
 */
export async function searchMembers(clubId: string, query: string) {
    if (!query || query.length < 2) return []

    // Get club name first
    const club = await prisma.club.findUnique({
        where: { id: clubId },
        select: { name: true }
    })

    if (!club) throw new Error('Club not found')

    const members = await prisma.user.findMany({
        where: {
            clubName: club.name,
            role: 'ATHLETE',
            name: {
                contains: query,
                mode: 'insensitive' // Requires Prisma Postgres mode, or simple contains for others
            }
        },
        select: {
            id: true,
            name: true,
            faceDescriptor: true
        },
        take: 10
    })

    return members.map(m => ({
        id: m.id,
        name: m.name,
        hasFace: !!m.faceDescriptor
    }))
}

/**
 * Manually check in a user (Club Master override)
 */
export async function manualCheckIn(clubId: string, userId: string) {
    // Get today's date (without time)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Check if already checked in
    const existing = await prisma.attendanceRecord.findUnique({
        where: {
            clubId_userId_date: {
                clubId,
                userId,
                date: today
            }
        }
    })

    if (existing) {
        return { success: false, error: 'Already checked in today' }
    }

    // Record check-in with Special Confidence (e.g., -1 or null) or just null
    // Let's use 1.0 (100%) or leave it null to signify manual?
    // The previous implementation used Float? so null is perfect for manual.
    await prisma.attendanceRecord.create({
        data: {
            clubId,
            userId,
            date: today,
            confidence: null // Null implies manual check-in
        }
    })

    revalidatePath('/club/attendance')
    return { success: true }
}
