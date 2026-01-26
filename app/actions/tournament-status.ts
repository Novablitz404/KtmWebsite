'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { currentUser } from '@clerk/nextjs/server'

export async function updateTournamentStatus(tournamentId: string, status: string) {
    try {
        const user = await currentUser()
        if (!user) return { error: 'Unauthorized' }

        const dbUser = await prisma.user.findUnique({
            where: { clerkId: user.id }
        })

        if (!dbUser) return { error: 'User not found' }

        // Fetch tournament to check permission
        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
            include: { managers: true }
        })

        if (!tournament) return { error: 'Tournament not found' }

        const isOrganizer = tournament.organizerId === dbUser.id
        const isManager = tournament.managers.some(m => m.id === dbUser.id)
        const isAdmin = dbUser.role === 'ADMIN'

        if (!isOrganizer && !isManager && !isAdmin) {
            return { error: 'Forbidden' }
        }

        // Validate Status
        const validStatuses = ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED', 'RESCHEDULED']
        if (!validStatuses.includes(status)) {
            return { error: 'Invalid Status' }
        }

        await prisma.tournament.update({
            where: { id: tournamentId },
            data: { status }
        })

        revalidatePath('/admin/tournaments')
        revalidatePath('/organization')
        revalidatePath(`/tournament/${tournamentId}`)

        return { success: true }
    } catch (error) {
        console.error('Update Status Error:', error)
        return { error: 'Failed to update status' }
    }
}
