import { prisma } from '@/lib/prisma'
import TournamentsListView from '@/components/pwa/TournamentsListView'

interface RegisterTabContentProps {
    userId: string
}

export default async function RegisterTabContent({ userId }: RegisterTabContentProps) {
    // Artificial delay to demonstrate streaming (optional, remove in prod)
    // await new Promise(resolve => setTimeout(resolve, 2000))

    const [tournaments, registeredTournaments] = await Promise.all([
        prisma.tournament.findMany({
            where: {
                status: { not: 'DRAFT' },
                startDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
            },
            orderBy: { startDate: 'asc' },
            include: { _count: { select: { categories: true } } }
        }),
        prisma.player.findMany({
            where: { userId },
            select: { category: { select: { tournamentId: true } } }
        })
    ])

    const registeredTournamentIds = new Set(registeredTournaments.map(p => p.category.tournamentId))

    return (
        <TournamentsListView
            tournaments={tournaments}
            registeredTournamentIds={registeredTournamentIds}
        />
    )
}
