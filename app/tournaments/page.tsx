import { prisma } from '@/lib/prisma'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

// Revalidate every 30 seconds for faster page loads
export const revalidate = 30

export default async function TournamentsPage() {
    const clerkUser = await currentUser()

    if (!clerkUser) {
        redirect('/sign-in')
    }

    // Get user (only need id for registration check)
    const dbUser = await prisma.user.findUnique({
        where: { clerkId: clerkUser.id },
        select: { id: true }
    })

    if (!dbUser) {
        redirect('/onboarding')
    }

    // Get all upcoming/active tournaments (use select for minimal data)
    const tournaments = await prisma.tournament.findMany({
        where: {
            startDate: {
                gte: new Date(new Date().setHours(0, 0, 0, 0)) // Today or future
            }
        },
        select: {
            id: true,
            name: true,
            startDate: true,
            venue: true,
            status: true,
            _count: {
                select: {
                    categories: true
                }
            }
        },
        orderBy: {
            startDate: 'asc'
        }
    })

    // Get user's existing registrations
    const userRegistrations = await prisma.player.findMany({
        where: { userId: dbUser.id },
        select: {
            category: {
                select: {
                    tournamentId: true
                }
            }
        }
    })

    const registeredTournamentIds = new Set(
        userRegistrations.map(r => r.category.tournamentId)
    )

    return (
        <main className="min-h-[calc(100vh-4rem)] bg-gray-50 pb-2">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
                <header className="mb-8">
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        Active Tournaments
                    </h1>
                    <p className="mt-2 text-lg text-gray-600">
                        Find and register for upcoming competitions
                    </p>
                </header>

                {tournaments.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                        <p className="text-4xl mb-4">🏆</p>
                        <p className="text-gray-500">No upcoming tournaments at the moment.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {tournaments.map(tournament => {
                            const isCancelled = tournament.status === 'CANCELLED'
                            const isRegistered = registeredTournamentIds.has(tournament.id)
                            const dateStr = tournament.startDate?.toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })

                            return (
                                <div
                                    key={tournament.id}
                                    className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow ${isCancelled ? 'opacity-80 bg-gray-50' : ''}`}
                                >
                                    <div className="p-6">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3">
                                                    <h2 className={`text-xl font-bold ${isCancelled ? 'text-gray-500 line-through decoration-gray-400' : 'text-gray-900'}`}>
                                                        {tournament.name}
                                                    </h2>
                                                    {isCancelled && (
                                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 uppercase tracking-wide">
                                                            Cancelled
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-1 text-gray-500 text-sm">
                                                    📅 {dateStr}
                                                </p>
                                                <p className="mt-2 text-sm text-gray-600">
                                                    {tournament._count.categories} categories available
                                                </p>
                                            </div>

                                            <div className="ml-4">
                                                {isCancelled ? (
                                                    <button
                                                        disabled
                                                        className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed border border-gray-200"
                                                    >
                                                        Cancelled
                                                    </button>
                                                ) : isRegistered ? (
                                                    <span className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                                                        ✓ Registered
                                                    </span>
                                                ) : (
                                                    <Link
                                                        href={`/tournament/${tournament.id}/register`}
                                                        className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                                                    >
                                                        Register
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </main>
    )
}
