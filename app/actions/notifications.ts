'use server'

import { prisma } from '@/lib/prisma'
import { sendBulkNotifications, PushPayload, PushSubscriptionData } from '@/lib/web-push'
import { PushSubscription } from '@prisma/client'

/**
 * Convert Prisma subscription to web-push format
 */
function toPushSubscriptionData(sub: PushSubscription): PushSubscriptionData {
    return {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth }
    }
}

/**
 * Send notification to a specific user and save to database
 */
export async function notifyUser(userId: string, payload: PushPayload) {
    // 1. Save notification to database
    await prisma.notification.create({
        data: {
            userId,
            title: payload.title,
            body: payload.body,
            url: payload.url,
            read: false
        }
    })

    // 2. Send push notification
    const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId }
    })

    if (subscriptions.length === 0) return

    const subs = subscriptions.map(toPushSubscriptionData)
    const failedEndpoints = await sendBulkNotifications(subs, payload)

    // Clean up expired subscriptions
    if (failedEndpoints.length > 0) {
        await prisma.pushSubscription.deleteMany({
            where: {
                userId,
                endpoint: { in: failedEndpoints }
            }
        })
    }
}

/**
 * Send notification to all members of a club and save to database
 */
export async function notifyClub(clubId: string, payload: PushPayload) {
    // Get all users in this club (master + students with linked users)
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

    // 1. Bulk create notifications in database
    await prisma.notification.createMany({
        data: userIds.map(userId => ({
            userId,
            title: payload.title,
            body: payload.body,
            url: payload.url,
            read: false
        }))
    })

    // 2. Send push notifications
    const allSubs = await prisma.pushSubscription.findMany({
        where: { userId: { in: userIds } }
    })

    if (allSubs.length === 0) return

    const subs = allSubs.map(toPushSubscriptionData)
    const failedEndpoints = await sendBulkNotifications(subs, payload)

    // Clean up expired subscriptions
    if (failedEndpoints.length > 0) {
        await prisma.pushSubscription.deleteMany({
            where: { endpoint: { in: failedEndpoints } }
        })
    }
}

/**
 * Send notification to all participants of a tournament and save to database
 */
export async function notifyTournamentParticipants(tournamentId: string, payload: PushPayload) {
    const players = await prisma.player.findMany({
        where: {
            category: { tournamentId },
            userId: { not: null }
        },
        select: { userId: true }
    })

    const userIds = [...new Set(players.map(p => p.userId).filter(Boolean) as string[])]

    if (userIds.length === 0) return

    // 1. Bulk create notifications in database
    await prisma.notification.createMany({
        data: userIds.map(userId => ({
            userId,
            title: payload.title,
            body: payload.body,
            url: payload.url,
            read: false
        }))
    })

    // 2. Send push notifications
    const allSubs = await prisma.pushSubscription.findMany({
        where: { userId: { in: userIds } }
    })

    if (allSubs.length === 0) return

    const subs = allSubs.map(toPushSubscriptionData)
    const failedEndpoints = await sendBulkNotifications(subs, payload)

    // Clean up expired subscriptions
    if (failedEndpoints.length > 0) {
        await prisma.pushSubscription.deleteMany({
            where: { endpoint: { in: failedEndpoints } }
        })
    }
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
