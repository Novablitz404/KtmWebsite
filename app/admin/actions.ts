'use server'

import { prisma } from '@/lib/prisma'
import { currentUser, clerkClient } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'

export async function promoteToOrganizer(formData: FormData) {
    const user = await currentUser()

    // Verify Admin
    if (!user) {
        throw new Error('Not authenticated')
    }

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id }
    })

    if (dbUser?.role !== 'ADMIN') {
        throw new Error('Unauthorized')
    }

    const targetUserId = formData.get('userId') as string
    if (!targetUserId) throw new Error('User ID required')

    await prisma.user.update({
        where: { id: targetUserId },
        data: { role: 'ORGANIZER' }
    })

    revalidatePath('/admin')
}

export async function updateAdminProfile(fullName: string) {
    const user = await currentUser();
    if (!user) throw new Error('Not authenticated');

    const dbUser = await prisma.user.findUnique({ where: { clerkId: user.id } });
    if (dbUser?.role !== 'ADMIN') throw new Error('Unauthorized');

    await prisma.user.update({
        where: { id: dbUser.id },
        data: { name: fullName }
    });

    revalidatePath('/admin/profile');
    revalidatePath('/admin'); // Update sidebar name too
}

// ============================================
// ORGANIZATION APPROVAL (Admin approves pending organizations)
// ============================================

export async function getPendingOrganizations() {
    const user = await currentUser()
    if (!user) throw new Error('Not authenticated')

    const dbUser = await prisma.user.findUnique({ where: { clerkId: user.id } })
    if (dbUser?.role !== 'ADMIN') throw new Error('Unauthorized')

    const pendingOrgs = await prisma.organization.findMany({
        where: { status: 'PENDING' },
        include: {
            owner: {
                select: { name: true, email: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    })

    return pendingOrgs
}

export async function approveOrganization(orgId: string) {
    const user = await currentUser()
    if (!user) throw new Error('Not authenticated')

    const dbUser = await prisma.user.findUnique({ where: { clerkId: user.id } })
    if (dbUser?.role !== 'ADMIN') throw new Error('Unauthorized')

    await prisma.organization.update({
        where: { id: orgId },
        data: { status: 'APPROVED' }
    })

    revalidatePath('/')
    revalidatePath('/admin')
}

export async function rejectOrganization(orgId: string) {
    const user = await currentUser()
    if (!user) throw new Error('Not authenticated')

    const dbUser = await prisma.user.findUnique({ where: { clerkId: user.id } })
    if (dbUser?.role !== 'ADMIN') throw new Error('Unauthorized')

    await prisma.organization.update({
        where: { id: orgId },
        data: { status: 'REJECTED' }
    })

    revalidatePath('/')
    revalidatePath('/admin')
}



export async function promoteToClubMaster(formData: FormData) {
    const user = await currentUser()
    if (!user) throw new Error('Not authenticated')

    const dbUser = await prisma.user.findUnique({ where: { clerkId: user.id } })
    if (dbUser?.role !== 'ADMIN') throw new Error('Unauthorized')

    const targetUserId = formData.get('userId') as string
    const clubName = formData.get('clubName') as string

    if (!targetUserId) throw new Error('User ID required')
    if (!clubName) throw new Error('Club name required')

    await prisma.user.update({
        where: { id: targetUserId },
        data: {
            role: 'CLUB_MASTER',
            clubName
        }
    })

    revalidatePath('/admin/users')
}

// ============= Delete User Action =============

export async function deleteUser(formData: FormData) {
    const user = await currentUser()
    if (!user) throw new Error('Not authenticated')

    const dbUser = await prisma.user.findUnique({ where: { clerkId: user.id } })
    if (dbUser?.role !== 'ADMIN') throw new Error('Unauthorized')

    const targetUserId = formData.get('userId') as string
    if (!targetUserId) throw new Error('User ID required')

    // Find the target user to get their clerkId
    const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, clerkId: true, role: true }
    })

    if (!targetUser) throw new Error('User not found')

    // Prevent deleting admins
    if (targetUser.role === 'ADMIN') {
        throw new Error('Cannot delete admin users')
    }

    // Prevent self-deletion
    if (targetUser.id === dbUser.id) {
        throw new Error('Cannot delete yourself')
    }

    // 1. Delete from Clerk first
    try {
        const clerk = await clerkClient()
        await clerk.users.deleteUser(targetUser.clerkId)
    } catch (error) {
        console.error('Failed to delete user from Clerk:', error)
        // Continue anyway - user might have been manually deleted from Clerk
    }

    // 2. Delete related records that don't have CASCADE
    // Delete API keys (has cascade in schema, but let's be explicit)
    await prisma.apiKey.deleteMany({ where: { ownerId: targetUserId } })

    // Update players to remove user association (orphan them instead of delete)
    await prisma.player.updateMany({
        where: { userId: targetUserId },
        data: { userId: null }
    })

    // If user is a club master, delete their club
    await prisma.club.deleteMany({ where: { masterId: targetUserId } })

    // If user is an organizer, delete their organization
    await prisma.organization.deleteMany({ where: { ownerId: targetUserId } })

    // 3. Delete the user from database
    await prisma.user.delete({ where: { id: targetUserId } })

    revalidatePath('/admin/users')
}

export async function getSidebarStats() {
    const [userCount, tournamentCount, apiKeyCount] = await Promise.all([
        prisma.user.count(),
        prisma.tournament.count(),
        prisma.apiKey.count()
    ])

    return {
        users: userCount,
        tournaments: tournamentCount,
        apiKeys: apiKeyCount
    }
}
