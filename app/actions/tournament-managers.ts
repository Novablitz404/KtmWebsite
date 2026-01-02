'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { currentUser } from '@clerk/nextjs/server'

export async function addTournamentManager(tournamentId: string, email: string) {
    try {
        const user = await currentUser()
        if (!user) throw new Error('Unauthorized')

        // Verify current user is the organizer of the tournament
        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
            select: { organizerId: true }
        })

        if (!tournament) throw new Error('Tournament not found')

        const dbUser = await prisma.user.findUnique({
            where: { clerkId: user.id }
        })

        if (!dbUser || tournament.organizerId !== dbUser.id) {
            throw new Error('Only the organizer can add managers')
        }

        // Find the user to invite by email
        const targetUser = await prisma.user.findUnique({
            where: { email }
        })

        if (!targetUser) {
            return { error: 'User not found. They must sign up first.' }
        }

        // Add them as a manager
        await prisma.tournament.update({
            where: { id: tournamentId },
            data: {
                managers: {
                    connect: { id: targetUser.id }
                }
            }
        })

        revalidatePath(`/tournament/${tournamentId}`)
        return { success: true }
    } catch (error) {
        console.error('Failed to add manager:', error)
        return { error: 'Failed to add manager' }
    }
}

export async function removeTournamentManager(tournamentId: string, userId: string) {
    try {
        const user = await currentUser()
        if (!user) throw new Error('Unauthorized')

        // Verify current user is the organizer
        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
            select: { organizerId: true }
        })

        if (!tournament) throw new Error('Tournament not found')

        const dbUser = await prisma.user.findUnique({
            where: { clerkId: user.id }
        })

        if (!dbUser || tournament.organizerId !== dbUser.id) {
            throw new Error('Only the organizer can remove managers')
        }

        // Remove the manager
        await prisma.tournament.update({
            where: { id: tournamentId },
            data: {
                managers: {
                    disconnect: { id: userId }
                }
            }
        })

        revalidatePath(`/tournament/${tournamentId}`)
        return { success: true }
    } catch (error) {
        console.error('Failed to remove manager:', error)
        return { error: 'Failed to remove manager' }
    }
}
