import { prisma } from '@/lib/prisma'
import { getSubscription } from '@/lib/club-subscription'

// Only active memberships with a currently usable subscription expose athlete club tools.
export async function getAthleteClubAccess(userId: string) {
    const memberships = await prisma.clubMembership.findMany({
        where: { userId, status: 'ACTIVE' },
        select: { clubId: true, club: { select: { name: true } } },
    })
    const clubs = await Promise.all(memberships.map(async m => ({
        id: m.clubId, name: m.club.name, subscription: await getSubscription(m.clubId),
    })))
    const eligible = clubs.filter(c => c.subscription.state === 'active' || c.subscription.state === 'grace')
    return { enabled: eligible.length > 0, clubs: eligible.map(c => ({ id: c.id, name: c.name, state: c.subscription.state })) }
}
