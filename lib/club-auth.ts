import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/supabase/server'

/**
 * Verifies the currently authenticated user is allowed to register the given
 * athlete for an event: either an ADMIN, or the CLUB_MASTER/ASSISTANT_CLUB_MASTER
 * of the club that athlete belongs to. Athletes can no longer register themselves.
 */
export async function verifyCanRegisterAthlete(athleteId: string) {
    const caller = await getAuthUser()
    if (!caller) {
        return { error: 'Unauthorized' as const }
    }

    const athlete = await prisma.user.findUnique({
        where: { id: athleteId },
        select: { id: true, role: true, clubName: true },
    })

    if (!athlete) {
        return { error: 'Athlete not found' as const }
    }
    if (athlete.role !== 'ATHLETE') {
        return { error: 'Selected member is not an athlete' as const }
    }

    if (caller.role === 'ADMIN') {
        return { athlete }
    }

    if (caller.role !== 'CLUB_MASTER' && caller.role !== 'ASSISTANT_CLUB_MASTER') {
        return { error: 'Only a club master can register athletes' as const }
    }

    const club = caller.role === 'CLUB_MASTER'
        ? await prisma.club.findUnique({ where: { masterId: caller.id }, select: { name: true } })
        : caller.clubName
            ? await prisma.club.findFirst({ where: { name: caller.clubName }, select: { name: true } })
            : null

    if (!club) {
        return { error: 'No club found for this account' as const }
    }

    if (!athlete.clubName || athlete.clubName.toLowerCase() !== club.name.toLowerCase()) {
        return { error: 'This athlete is not a member of your club' as const }
    }

    return { athlete }
}
