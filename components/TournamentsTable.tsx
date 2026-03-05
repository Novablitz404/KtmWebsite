import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/supabase/server'
import TournamentsList from './TournamentsList'



export default async function TournamentsTable() {
    const user = await getAuthUser()
    const dbUser = user ? await prisma.user.findUnique({
        where: { clerkId: user.id },
        select: { id: true }
    }) : null

    // If no user or not an organizer, show nothing
    if (!dbUser) {
        return (
            <div className="text-center py-10 bg-gray-50 rounded-xl border-dashed border-2 border-gray-200">
                <p className="text-gray-500">Sign in to view tournaments.</p>
            </div>
        )
    }

    // Optimized: Use _count instead of fetching all players
    const tournaments = await prisma.tournament.findMany({
        orderBy: { startDate: 'desc' },
        where: {
            OR: [
                { organizerId: dbUser.id },
                { managers: { some: { id: dbUser.id } } }
            ]
        },
        select: {
            id: true,
            name: true,
            startDate: true,
            venue: true,
            status: true,
            headerImageUrl: true,
            _count: {
                select: {
                    categories: true
                }
            },
            categories: {
                select: {
                    _count: {
                        select: { players: true }
                    }
                }
            }
        }
    })

    return <TournamentsList tournaments={tournaments} />
}
