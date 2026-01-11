import { prisma } from '@/lib/prisma'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const revalidate = 30

export default async function AthleteHomePage() {
    const clerkUser = await currentUser()

    if (!clerkUser) {
        redirect('/sign-in')
    }

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: clerkUser.id },
        select: {
            id: true,
            name: true,
            belt: true,
            clubName: true,
            role: true,
            players: {
                select: {
                    id: true,
                    category: {
                        select: {
                            tournament: {
                                select: { id: true }
                            }
                        }
                    }
                }
            }
        }
    })

    if (!dbUser) {
        redirect('/onboarding')
    }

    // If not an athlete, redirect to appropriate page
    if (dbUser.role !== 'ATHLETE') {
        if (dbUser.role === 'CLUB_MASTER' || dbUser.role === 'ASSISTANT_CLUB_MASTER') {
            redirect('/club')
        } else if (dbUser.role === 'ORGANIZER' || dbUser.role === 'MANAGER' || dbUser.role === 'ADMIN') {
            redirect('/manage')
        }
    }

    // Calculate stats
    const tournamentsJoined = new Set(dbUser.players.map(p => p.category.tournament.id)).size

    return (
        <main className="min-h-screen bg-gray-50">
            {/* Hero Section with Avatar */}
            <div className="bg-gradient-to-br from-red-600 via-red-500 to-orange-500 pt-8 pb-16 px-4">
                <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center mb-3 shadow-lg">
                        {clerkUser.imageUrl ? (
                            <img
                                src={clerkUser.imageUrl}
                                alt={dbUser.name || 'Athlete'}
                                className="w-full h-full rounded-full object-cover"
                            />
                        ) : (
                            <span className="text-3xl">🥋</span>
                        )}
                    </div>
                    <h1 className="text-xl font-bold text-white">
                        {dbUser.name || 'Athlete'}
                    </h1>
                    <p className="text-white/80 text-sm mt-0.5">
                        {dbUser.clubName || 'Independent'}
                    </p>
                    {dbUser.belt && (
                        <span className={`mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm ${dbUser.belt === 'Black' ? 'bg-black text-white' :
                                dbUser.belt === 'Red' ? 'bg-red-100 text-red-800' :
                                    dbUser.belt === 'Blue' ? 'bg-blue-100 text-blue-800' :
                                        dbUser.belt === 'Yellow' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-white/90 text-gray-800'
                            }`}>
                            {dbUser.belt} Belt
                        </span>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="px-4 -mt-8">
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
                        <div className="text-2xl font-bold text-gray-900">{tournamentsJoined}</div>
                        <div className="text-xs text-gray-500 mt-0.5">Events</div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
                        <div className="text-2xl font-bold text-amber-500">0</div>
                        <div className="text-xs text-gray-500 mt-0.5">Medals</div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
                        <div className="text-2xl font-bold text-gray-400">-</div>
                        <div className="text-xs text-gray-500 mt-0.5">Rank</div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="px-4 mt-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Actions</h2>
                <div className="space-y-3">
                    <Link
                        href="/tournaments"
                        className="flex items-center gap-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mobile-card-press"
                    >
                        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-2xl">
                            🏆
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">Register for Tournament</h3>
                            <p className="text-sm text-gray-500">Browse upcoming events</p>
                        </div>
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>

                    <Link
                        href="/athlete/events"
                        className="flex items-center gap-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mobile-card-press"
                    >
                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl">
                            📋
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">My Events</h3>
                            <p className="text-sm text-gray-500">View your registered tournaments</p>
                        </div>
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>

                    <Link
                        href="/profile"
                        className="flex items-center gap-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mobile-card-press"
                    >
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">
                            👤
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">Edit Profile</h3>
                            <p className="text-sm text-gray-500">Update your details</p>
                        </div>
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>
            </div>

            {/* Placeholder for ranking section */}
            <div className="px-4 mt-6 pb-8">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Ranking</h2>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
                    <div className="text-4xl mb-2">📊</div>
                    <p className="text-gray-500 text-sm">Ranking system coming soon</p>
                </div>
            </div>
        </main>
    )
}
