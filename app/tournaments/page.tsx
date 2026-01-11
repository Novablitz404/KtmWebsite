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
        <main className="min-h-screen bg-gray-50">
            {/* Mobile Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-4 sm:hidden sticky top-0 z-10">
                <h1 className="text-xl font-bold text-gray-900">Register</h1>
                <p className="text-sm text-gray-500 mt-0.5">Browse upcoming tournaments</p>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:pt-4 sm:pb-2">
                {/* Desktop Header */}
                <header className="mb-6 sm:mb-8 hidden sm:block">
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        Active Tournaments
                    </h1>
                    <p className="mt-2 text-lg text-gray-600">
                        Find and register for upcoming competitions
                    </p>
                </header>

                {tournaments.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 sm:p-12 text-center">
                        <p className="text-4xl mb-4">🏆</p>
                        <p className="text-gray-900 font-medium mb-1">No Upcoming Tournaments</p>
                        <p className="text-gray-500 text-sm">Check back soon for new events.</p>
                    </div>
                ) : (
                    <div className="space-y-3 sm:space-y-4">
                        {tournaments.map(tournament => {
                            const isCancelled = tournament.status === 'CANCELLED'
                            const isRegistered = registeredTournamentIds.has(tournament.id)

                            // Mobile-friendly date format
                            const mobileDate = tournament.startDate?.toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric'
                            })

                            const desktopDate = tournament.startDate?.toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })

                            return (
                                <div
                                    key={tournament.id}
                                    className={`bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden active:scale-[0.99] transition-transform ${isCancelled ? 'opacity-70' : ''}`}
                                >
                                    <div className="p-4 sm:p-6">
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start gap-2 flex-wrap">
                                                    <h2 className={`text-base sm:text-xl font-bold ${isCancelled ? 'text-gray-500 line-through decoration-gray-400' : 'text-gray-900'}`}>
                                                        {tournament.name}
                                                    </h2>
                                                    {isCancelled && (
                                                        <span className="px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-bold bg-red-100 text-red-700 uppercase">
                                                            Cancelled
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2 mt-1 flex-wrap text-xs sm:text-sm text-gray-500">
                                                    <span className="sm:hidden">📅 {mobileDate}</span>
                                                    <span className="hidden sm:inline">📅 {desktopDate}</span>
                                                    {tournament.venue && (
                                                        <>
                                                            <span className="text-gray-300">•</span>
                                                            <span className="truncate">{tournament.venue}</span>
                                                        </>
                                                    )}
                                                </div>

                                                <p className="mt-2 text-xs sm:text-sm text-gray-600">
                                                    {tournament._count.categories} categories available
                                                </p>
                                            </div>

                                            <div className="flex-shrink-0 self-stretch sm:self-center">
                                                {isCancelled ? (
                                                    <button
                                                        disabled
                                                        className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 sm:py-2 bg-gray-100 text-gray-400 rounded-xl text-sm font-medium cursor-not-allowed border border-gray-200"
                                                    >
                                                        Cancelled
                                                    </button>
                                                ) : isRegistered ? (
                                                    <span className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 sm:py-2 bg-green-50 text-green-700 rounded-xl text-sm font-semibold border border-green-200">
                                                        ✓ Registered
                                                    </span>
                                                ) : (
                                                    <Link
                                                        href={`/tournament/${tournament.id}/register`}
                                                        className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 sm:py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-95 transition-all shadow-sm"
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
