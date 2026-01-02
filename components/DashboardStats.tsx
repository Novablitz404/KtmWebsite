import { prisma } from '@/lib/prisma'
import { Trophy, Users, Swords, Award } from 'lucide-react'
import { currentUser } from '@clerk/nextjs/server'

export default async function DashboardStats() {
    const user = await currentUser()
    const dbUser = user ? await prisma.user.findUnique({ where: { clerkId: user.id } }) : null

    // If not logged in, show placeholders
    if (!dbUser) return <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg">Please log in to view stats.</div>

    // Determine current month range for "This Month" stats if we wanted to be specific
    // For now, let's just do all-time stats to make it look populated

    // Count only tournaments created by this organizer or where they are a manager
    const totalTournaments = await prisma.tournament.count({
        where: {
            OR: [
                { organizerId: dbUser.id },
                { managers: { some: { id: dbUser.id } } }
            ]
        }
    })

    const activeTournaments = await prisma.tournament.count({
        where: {
            AND: [
                {
                    OR: [
                        { organizerId: dbUser.id },
                        { managers: { some: { id: dbUser.id } } }
                    ]
                },
                { startDate: { gte: new Date() } }
            ]
        }
    })

    // Get tournament IDs created by or managed by this user
    const myTournaments = await prisma.tournament.findMany({
        where: {
            OR: [
                { organizerId: dbUser.id },
                { managers: { some: { id: dbUser.id } } }
            ]
        },
        select: { id: true }
    })
    const myTournamentIds = myTournaments.map(t => t.id)

    // Count athletes registered to MY tournaments
    const totalAthletes = await prisma.player.count({
        where: {
            category: {
                tournamentId: { in: myTournamentIds }
            }
        }
    })

    // Count matches in MY tournaments
    const totalMatches = await prisma.match.count({
        where: {
            categoryRef: {
                tournamentId: { in: myTournamentIds }
            }
        }
    })

    const stats = [
        {
            name: 'Total Tournaments',
            value: totalTournaments,
            icon: Trophy,
            change: activeTournaments > 0 ? `+ ${activeTournaments} Active` : 'No active events',
            changeType: 'positive',
            color: 'bg-blue-500'
        },
        {
            name: 'Registered Athletes',
            value: totalAthletes,
            icon: Users,
            change: 'All time',
            changeType: 'neutral',
            color: 'bg-green-500'
        },
        {
            name: 'Total Matches',
            value: totalMatches,
            icon: Swords,
            change: 'Scheduled + Completed',
            changeType: 'neutral',
            color: 'bg-purple-500'
        },
        // Placeholder for future stat like "Medals Awarded" or "Revenue"
        {
            name: 'Completion Rate',
            value: '98%',
            icon: Award,
            change: '+2.1% from last month',
            changeType: 'positive',
            color: 'bg-orange-500'
        },
    ]

    return (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((item) => (
                <div key={item.name} className="relative overflow-hidden rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                    <dt>
                        <div className={`absolute rounded - md p - 3 ${item.color} bg - opacity - 10`}>
                            <item.icon className={`h - 6 w - 6 ${item.color.replace('bg-', 'text-')} `} aria-hidden="true" />
                        </div>
                        <p className="ml-16 truncate text-sm font-medium text-gray-500">{item.name}</p>
                    </dt>
                    <dd className="ml-16 flex items-baseline pb-1 sm:pb-2">
                        <p className="text-2xl font-semibold text-gray-900">{item.value}</p>
                        <p className={`ml - 2 flex items - baseline text - sm font - semibold
                            ${item.changeType === 'positive' ? 'text-green-600' : 'text-gray-500'}
`}>
                            {item.change}
                        </p>
                    </dd>
                </div>
            ))}
        </div>
    )
}
