import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Calendar, Users, MapPin, ChevronRight, Trophy } from 'lucide-react'
import { currentUser } from '@clerk/nextjs/server'
import { Category, Player } from '@prisma/client'

export default async function TournamentsTable() {
    const user = await currentUser()
    const dbUser = user ? await prisma.user.findUnique({ where: { clerkId: user.id } }) : null

    // If no user or not an organizer, show nothing
    if (!dbUser) {
        return (
            <div className="text-center py-10 bg-gray-50 rounded-xl border-dashed border-2 border-gray-200">
                <p className="text-gray-500">Sign in to view tournaments.</p>
            </div>
        )
    }

    const tournaments = await prisma.tournament.findMany({
        orderBy: { startDate: 'desc' },
        where: {
            OR: [
                { organizerId: dbUser.id },
                { managers: { some: { id: dbUser.id } } }
            ]
        },
        include: {
            categories: {
                include: {
                    players: true
                }
            }
        }
    })

    if (tournaments.length === 0) {
        return (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trophy className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No tournaments yet</h3>
                <p className="text-gray-500 mt-1">Create your first tournament to get started.</p>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                            <th className="px-6 py-4">Tournament Name</th>
                            <th className="px-6 py-4">Date & Venue</th>
                            <th className="px-6 py-4">Participants</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {tournaments.map((tournament) => {
                            const playerCount = tournament.categories.reduce((acc: number, cat: Category & { players: Player[] }) => acc + cat.players.length, 0)
                            const isPast = new Date(tournament.startDate) < new Date()

                            return (
                                <tr key={tournament.id} className="group hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            {tournament.headerImageUrl ? (
                                                <img
                                                    src={tournament.headerImageUrl}
                                                    alt={tournament.name}
                                                    className="w-12 h-12 rounded-lg object-cover shadow-sm border border-gray-100"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 font-bold text-lg border border-indigo-100">
                                                    {tournament.name.charAt(0)}
                                                </div>
                                            )}
                                            <div>
                                                <span className="block font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                                                    {tournament.name}
                                                </span>
                                                <span className="text-xs text-gray-400 font-mono">ID: {tournament.id.slice(-4)}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                {new Date(tournament.startDate).toLocaleDateString()}
                                            </div>
                                            {tournament.venue && (
                                                <div className="flex items-center gap-2 text-gray-500">
                                                    <MapPin className="w-4 h-4 text-gray-400" />
                                                    {tournament.venue}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Users className="w-4 h-4 text-gray-400" />
                                            <span className="font-medium text-gray-900">{playerCount}</span>
                                            <span className="text-gray-400">Athletes</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {!isPast ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 ring-1 ring-green-100">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                                Active
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 ring-1 ring-gray-200">
                                                Completed
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            href={`/tournament/${tournament.id}`}
                                            className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                                        >
                                            Manage
                                            <ChevronRight className="w-4 h-4 ml-0.5" />
                                        </Link>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
