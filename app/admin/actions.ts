'use server'

import { prisma } from '@/lib/prisma'
import { currentUser } from '@clerk/nextjs/server'
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

export async function inviteOrganizer(formData: FormData) {
    const user = await currentUser()
    if (!user) throw new Error('Not authenticated')

    const dbUser = await prisma.user.findUnique({ where: { clerkId: user.id } })
    if (dbUser?.role !== 'ADMIN') throw new Error('Unauthorized')

    const email = formData.get('email') as string
    const name = formData.get('name') as string | null

    if (!email) throw new Error('Email required')

    // Check if email already exists in system
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) throw new Error('User with this email already exists')

    // Check if invite already exists
    const existingInvite = await prisma.organizerInvite.findUnique({ where: { email } })
    if (existingInvite) throw new Error('Invite already sent to this email')

    await prisma.organizerInvite.create({
        data: {
            email,
            name: name || null,
            invitedBy: dbUser.id
        }
    })

    revalidatePath('/admin/users')
}

export async function deleteInvite(formData: FormData) {
    const user = await currentUser()
    if (!user) throw new Error('Not authenticated')

    const dbUser = await prisma.user.findUnique({ where: { clerkId: user.id } })
    if (dbUser?.role !== 'ADMIN') throw new Error('Unauthorized')

    const inviteId = formData.get('inviteId') as string
    if (!inviteId) throw new Error('Invite ID required')

    await prisma.organizerInvite.delete({ where: { id: inviteId } })

    revalidatePath('/admin/users')
}

// ============= Club Master Actions =============

export async function inviteClubMaster(formData: FormData) {
    const user = await currentUser()
    if (!user) throw new Error('Not authenticated')

    const dbUser = await prisma.user.findUnique({ where: { clerkId: user.id } })
    if (dbUser?.role !== 'ADMIN') throw new Error('Unauthorized')

    const email = formData.get('email') as string
    const name = formData.get('name') as string | null
    const clubName = formData.get('clubName') as string

    if (!email) throw new Error('Email required')
    if (!clubName) throw new Error('Club name required')

    // Check if email already exists in system
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) throw new Error('User with this email already exists')

    // Check if invite already exists
    const existingInvite = await prisma.clubMasterInvite.findUnique({ where: { email } })
    if (existingInvite) throw new Error('Invite already sent to this email')

    await prisma.clubMasterInvite.create({
        data: {
            email,
            name: name || null,
            clubName,
            invitedBy: dbUser.id
        }
    })

    revalidatePath('/admin/users')
}

export async function deleteClubMasterInvite(formData: FormData) {
    const user = await currentUser()
    if (!user) throw new Error('Not authenticated')

    const dbUser = await prisma.user.findUnique({ where: { clerkId: user.id } })
    if (dbUser?.role !== 'ADMIN') throw new Error('Unauthorized')

    const inviteId = formData.get('inviteId') as string
    if (!inviteId) throw new Error('Invite ID required')

    await prisma.clubMasterInvite.delete({ where: { id: inviteId } })

    revalidatePath('/admin/users')
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
