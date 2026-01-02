import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export default async function TournamentList() {
    const tournaments = await prisma.tournament.findMany({
        orderBy: { startDate: 'desc' }
    })

    if (tournaments.length === 0) {
        return (
            <div className="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <p className="text-gray-500">No tournaments found. Create one to get started!</p>
            </div>
        )
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((tournament: { id: string; name: string; startDate: Date }) => (
                <Link
                    key={tournament.id}
                    href={`/tournament/${tournament.id}`}
                    className="block group"
                >
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all hover:shadow-md hover:border-blue-500">
                        <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-600 truncate">
                            {tournament.name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-2">
                            {new Date(tournament.startDate).toLocaleDateString()}
                        </p>
                    </div>
                </Link>
            ))}
        </div>
    )
}
