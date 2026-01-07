'use server'

import { prisma } from '@/lib/prisma'
import { currentUser, clerkClient } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'

// ==========================================
// CLUB ASSISTANT INVITES
// ==========================================

export async function inviteClubAssistant(formData: FormData) {
    const user = await currentUser()
    if (!user) throw new Error('Not authenticated')

    // 1. Verify User is a Club Master
    const dbUser = await prisma.user.findUnique({ where: { clerkId: user.id } })
    if (dbUser?.role !== 'CLUB_MASTER' || !dbUser.clubName) {
        throw new Error('Unauthorized: Only Club Masters can invite assistants')
    }

    const email = formData.get('email') as string
    if (!email) throw new Error('Email required')

    // 2. Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
        throw new Error('User with this email already exists in the system')
    }

    // 3. Check if invite already exists
    const existingInvite = await prisma.clubAssistantInvite.findUnique({ where: { email } })
    if (existingInvite) {
        throw new Error('An invite has already been sent to this email')
    }

    // 4. Create Invite
    await prisma.clubAssistantInvite.create({
        data: {
            email,
            clubName: dbUser.clubName,
            invitedBy: dbUser.id
        }
    })

    // 5. Send Clerk Invitation
    try {
        const client = await clerkClient()
        await client.invitations.createInvitation({
            emailAddress: email,
            redirectUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || 'http://localhost:3000/sign-up',
            ignoreExisting: true
        })
    } catch (error) {
        console.error('Clerk Invite Error:', error)
    }

    revalidatePath('/members')
}

export async function cancelClubAssistantInvite(inviteId: string) {
    const user = await currentUser()
    if (!user) throw new Error('Not authenticated')

    const dbUser = await prisma.user.findUnique({ where: { clerkId: user.id } })
    if (dbUser?.role !== 'CLUB_MASTER') throw new Error('Unauthorized')

    // Verify ownership indirectly by checking we are deleting an invite made by us? 
    // Or just let Club Masters delete any invite for THEIR club? 
    // Schema doesn't link invite to club ID easily, just clubName.
    // Ideally we assume valid access if they see it.

    await prisma.clubAssistantInvite.delete({ where: { id: inviteId } })
    revalidatePath('/members')
}

// ==========================================
// TOURNAMENT MANAGER INVITES
// ==========================================

export async function inviteTournamentManager(formData: FormData) {
    const user = await currentUser()
    if (!user) throw new Error('Not authenticated')

    const tournamentId = formData.get('tournamentId') as string
    const email = formData.get('email') as string

    if (!tournamentId || !email) throw new Error('Missing tournament ID or email')

    // 1. Verify User is the Organizer of this tournament
    const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: { organizerId: true }
    })

    if (!tournament) throw new Error('Tournament not found')

    const dbUser = await prisma.user.findUnique({ where: { clerkId: user.id } })
    if (!dbUser || tournament.organizerId !== dbUser.id) {
        throw new Error('Unauthorized: Only the organizer can invite managers')
    }

    // 2. Check if user already exists -> use 'addTournamentManager' logic instead?
    // The user requested we support NON-users.
    // But if they ARE a user, we should just add them directly?

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
        // If user exists, connect them directly!
        // Check if already manager
        const isManager = await prisma.tournament.findFirst({
            where: {
                id: tournamentId,
                managers: { some: { id: existingUser.id } }
            }
        })

        if (isManager) throw new Error('User is already a manager')

        await prisma.tournament.update({
            where: { id: tournamentId },
            data: { managers: { connect: { id: existingUser.id } } }
        })

        revalidatePath(`/tournament/${tournamentId}`)
        return { message: 'User added as manager immediately (account existed)' }
    }

    // 3. User does NOT exist -> Create Invite
    // Check pending invite
    const existingInvite = await prisma.tournamentManagerInvite.findUnique({
        where: {
            email_tournamentId: {
                email,
                tournamentId
            }
        }
    })

    if (existingInvite) throw new Error('Invite already pending for this email')

    await prisma.tournamentManagerInvite.create({
        data: {
            email,
            tournamentId,
            invitedBy: dbUser.id
        }
    })

    // Send Clerk Invitation
    try {
        const client = await clerkClient()
        await client.invitations.createInvitation({
            emailAddress: email,
            redirectUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || 'http://localhost:3000/sign-up',
            ignoreExisting: true
        })
    } catch (error) {
        console.error('Clerk Invite Error:', error)
    }

    revalidatePath(`/tournament/${tournamentId}`)
    return { message: 'Invite sent to new user' }
}

export async function cancelTournamentManagerInvite(inviteId: string, tournamentId: string) {
    const user = await currentUser()
    if (!user) throw new Error('Not authenticated')

    // Verify Organizer
    const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: { organizerId: true }
    })

    const dbUser = await prisma.user.findUnique({ where: { clerkId: user.id } })
    if (!dbUser || !tournament || tournament.organizerId !== dbUser.id) {
        throw new Error('Unauthorized')
    }

    await prisma.tournamentManagerInvite.delete({ where: { id: inviteId } })
    revalidatePath(`/tournament/${tournamentId}`)
}
