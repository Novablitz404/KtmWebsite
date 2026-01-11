import { prisma } from '@/lib/prisma'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const revalidate = 30

export default async function AthleteEventsPage() {
    const clerkUser = await currentUser()

    if (!clerkUser) {
        redirect('/sign-in')
    }

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: clerkUser.id },
        select: {
            id: true,
            role: true,
            players: {
                select: {
                    id: true,
                    name: true,
                    belt: true,
                    registrationStatus: true,
                    category: {
                        select: {
                            id: true,
                            name: true,
                            tournament: {
                                select: {
                                    id: true,
                                    name: true,
                                    startDate: true,
                                    venue: true,
                                    status: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    category: {
                        tournament: {
                            startDate: 'desc'
                        }
                    }
                }
            }
        }
    })

    if (!dbUser) {
        redirect('/onboarding')
    }

    // Group players by tournament
    const tournamentMap = new Map<string, {
        tournament: {
            id: string
            name: string
            startDate: Date
            venue: string | null
            status: string
        }
        registrations: {
            id: string
            category: string
            status: string
            belt: string | null
        }[]
    }>()

    dbUser.players.forEach(player => {
        const t = player.category.tournament
        if (!tournamentMap.has(t.id)) {
            tournamentMap.set(t.id, {
                tournament: t,
                registrations: []
            })
        }
        tournamentMap.get(t.id)!.registrations.push({
            id: player.id,
            category: player.category.name,
            status: player.registrationStatus,
            belt: player.belt
        })
    })

    const events = Array.from(tournamentMap.values())

    // Separate upcoming and past events
    const now = new Date()
    const upcomingEvents = events.filter(e => new Date(e.tournament.startDate) >= now)
    const pastEvents = events.filter(e => new Date(e.tournament.startDate) < now)

    return (
        <main className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
                <h1 className="text-xl font-bold text-gray-900">My Events</h1>
                <p className="text-sm text-gray-500 mt-0.5">Your tournament registrations</p>
            </div>

            <div className="px-4 py-4 space-y-6">
                {/* Upcoming Events */}
                {upcomingEvents.length > 0 && (
                    <section>
                        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                            Upcoming
                        </h2>
                        <div className="space-y-3">
                            {upcomingEvents.map(({ tournament, registrations }) => (
                                <EventCard
                                    key={tournament.id}
                                    tournament={tournament}
                                    registrations={registrations}
                                    isUpcoming
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* Past Events */}
                {pastEvents.length > 0 && (
                    <section>
                        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                            Past Events
                        </h2>
                        <div className="space-y-3">
                            {pastEvents.map(({ tournament, registrations }) => (
                                <EventCard
                                    key={tournament.id}
                                    tournament={tournament}
                                    registrations={registrations}
                                    isUpcoming={false}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* Empty State */}
                {events.length === 0 && (
                    <div className="text-center py-12">
                        <div className="text-5xl mb-4">📋</div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Events Yet</h3>
                        <p className="text-gray-500 mb-6">You haven't registered for any tournaments</p>
                        <Link
                            href="/tournaments"
                            className="inline-flex items-center px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
                        >
                            Browse Tournaments
                        </Link>
                    </div>
                )}
            </div>
        </main>
    )
}

function EventCard({
    tournament,
    registrations,
    isUpcoming
}: {
    tournament: {
        id: string
        name: string
        startDate: Date
        venue: string | null
        status: string
    }
    registrations: {
        id: string
        category: string
        status: string
        belt: string | null
    }[]
    isUpcoming: boolean
}) {
    const dateStr = new Date(tournament.startDate).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    })

    const isCancelled = tournament.status === 'CANCELLED'

    // Check registration statuses
    const hasPending = registrations.some(r => r.status === 'PENDING')
    const allApproved = registrations.every(r => r.status === 'APPROVED')

    return (
        <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mobile-card-press ${isCancelled ? 'opacity-60' : ''}`}>
            {/* Tournament Header */}
            <div className="p-4 border-b border-gray-50">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <h3 className={`font-semibold text-gray-900 ${isCancelled ? 'line-through' : ''}`}>
                            {tournament.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-500">📅 {dateStr}</span>
                            {tournament.venue && (
                                <span className="text-sm text-gray-400">• {tournament.venue}</span>
                            )}
                        </div>
                    </div>
                    {isCancelled ? (
                        <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-600">
                            Cancelled
                        </span>
                    ) : isUpcoming ? (
                        hasPending ? (
                            <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-yellow-50 text-yellow-700 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                                Pending
                            </span>
                        ) : allApproved ? (
                            <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-green-50 text-green-700">
                                ✓ Approved
                            </span>
                        ) : null
                    ) : (
                        <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600">
                            Completed
                        </span>
                    )}
                </div>
            </div>

            {/* Registrations */}
            <div className="px-4 py-3 bg-gray-50/50">
                <div className="flex flex-wrap gap-2">
                    {registrations.map(reg => (
                        <span
                            key={reg.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white border border-gray-200"
                        >
                            {reg.category}
                            {reg.status === 'PENDING' && (
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                            )}
                            {reg.status === 'APPROVED' && (
                                <span className="text-green-500">✓</span>
                            )}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    )
}
