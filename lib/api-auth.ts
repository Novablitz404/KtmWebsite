import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/supabase/server'

/**
 * Same access rule as the other Central Server routes: an active API key (or a signed-in session) of the tournament's
 * organizer, one of its managers, or an admin.
 */
export async function canManageTournament(request: NextRequest, tournamentId: string): Promise<boolean> {
    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId }, include: { managers: true } })
    if (!tournament) return false

    const apiKey = request.headers.get('x-api-key')
    if (apiKey) {
        const validKey = await prisma.apiKey.findUnique({ where: { key: apiKey, isActive: true }, include: { owner: true } })
        if (validKey) {
            return tournament.organizerId === validKey.ownerId
                || tournament.managers.some(m => m.id === validKey.ownerId)
                || validKey.owner.role === 'ADMIN'
        }
    }

    const user = await getAuthUser()
    if (user) {
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
        if (dbUser) {
            return tournament.organizerId === dbUser.id
                || tournament.managers.some(m => m.id === dbUser.id)
                || dbUser.role === 'ADMIN'
        }
    }
    return false
}
