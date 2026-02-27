'use server'

import { prisma } from '@/lib/prisma'

/**
 * Send notification to a specific user (saved to database only)
 */
export async function notifyUser(userId: string, payload: { title: string; body: string; url?: string; tag?: string }) {
    await prisma.notification.create({
        data: {
            userId,
            title: payload.title,
            body: payload.body,
            url: payload.url,
            read: false
        }
    })
}

/**
 * Send notification to all members of a club (saved to database only)
 */
export async function notifyClub(clubId: string, payload: { title: string; body: string; url?: string }) {
    const club = await prisma.club.findUnique({
        where: { id: clubId },
        select: { masterId: true }
    })

    if (!club) return

    const players = await prisma.player.findMany({
        where: { clubId, userId: { not: null } },
        select: { userId: true }
    })

    const userIds = [...new Set([
        club.masterId,
        ...players.map(p => p.userId).filter(Boolean) as string[]
    ])]

    if (userIds.length === 0) return

    await prisma.notification.createMany({
        data: userIds.map(userId => ({
            userId,
            title: payload.title,
            body: payload.body,
            url: payload.url,
            read: false
        }))
    })
}

/**
 * Send notification to all participants of a tournament (saved to database only)
 */
export async function notifyTournamentParticipants(tournamentId: string, payload: { title: string; body: string; url?: string }) {
    const players = await prisma.player.findMany({
        where: {
            category: { tournamentId },
            userId: { not: null }
        },
        select: { userId: true }
    })

    const userIds = [...new Set(players.map(p => p.userId).filter(Boolean) as string[])]

    if (userIds.length === 0) return

    await prisma.notification.createMany({
        data: userIds.map(userId => ({
            userId,
            title: payload.title,
            body: payload.body,
            url: payload.url,
            read: false
        }))
    })
}

/**
 * Notify athlete when their registration is approved
 */
export async function notifyRegistrationApproved(playerId: string, tournamentName: string) {
    const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: {
            category: { select: { name: true } }
        }
    })

    if (!player?.userId) return

    await notifyUser(player.userId, {
        title: 'Registration Approved! ✅',
        body: `Your registration for ${tournamentName}${player.category ? ` (${player.category.name})` : ''} has been approved.`,
        url: '/athlete/events',
        tag: `registration-${playerId}`
    })
}

// ============================================
// NOTIFICATION MANAGEMENT
// ============================================

export async function getNotifications(userId: string) {
    return await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50
    })
}

export async function getUnreadCount(userId: string) {
    return await prisma.notification.count({
        where: {
            userId,
            read: false
        }
    })
}

export async function markAsRead(notificationId: string) {
    await prisma.notification.update({
        where: { id: notificationId },
        data: { read: true }
    })
}

export async function markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
        where: {
            userId,
            read: false
        },
        data: { read: true }
    })
}
