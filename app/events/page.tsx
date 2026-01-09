import { prisma } from '@/lib/prisma'
import Image from 'next/image'
import Link from 'next/link'

// Revalidate every 60 seconds for faster page loads
export const revalidate = 60

export default async function EventsPage() {
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    // Fetch all tournaments grouped by status
    const [upcoming, past] = await Promise.all([
        prisma.tournament.findMany({
            where: {
                startDate: { gte: now },
                status: { not: 'CANCELLED' }
            },
            orderBy: { startDate: 'asc' }
        }),
        prisma.tournament.findMany({
            where: {
                OR: [
                    { startDate: { lt: now } },
                    { status: 'CANCELLED' }
                ]
            },
            orderBy: { startDate: 'desc' }
        })
    ])

    // Separate cancelled from past
    const cancelled = past.filter(t => t.status === 'CANCELLED')
    const finished = past.filter(t => t.status !== 'CANCELLED')

    return (
        <main className="min-h-screen bg-gray-50">
            {/* Hero Section */}
            <div className="relative bg-gradient-to-br from-red-600 via-red-700 to-red-800 py-16">
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                    backgroundSize: '40px 40px'
                }} />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl sm:text-5xl font-black text-white">Events</h1>
                    <p className="mt-4 text-lg text-red-100">
                        Browse all upcoming, past, and cancelled tournaments
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Upcoming Tournaments */}
                <section className="mb-16">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <h2 className="text-2xl font-bold text-gray-900">Upcoming ({upcoming.length})</h2>
                    </div>

                    {upcoming.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                            <p className="text-gray-500">No upcoming tournaments scheduled.</p>
                        </div>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {upcoming.map((tournament, index) => (
                                <TournamentCard key={tournament.id} tournament={tournament} priority={index < 3} />
                            ))}
                        </div>
                    )}
                </section>

                {/* Finished Tournaments */}
                <section className="mb-16">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                        <h2 className="text-2xl font-bold text-gray-900">Finished ({finished.length})</h2>
                    </div>

                    {finished.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                            <p className="text-gray-500">No past tournaments yet.</p>
                        </div>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {finished.map((tournament) => (
                                <TournamentCard key={tournament.id} tournament={tournament} finished />
                            ))}
                        </div>
                    )}
                </section>

                {/* Cancelled Tournaments */}
                {cancelled.length > 0 && (
                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <h2 className="text-2xl font-bold text-gray-900">Cancelled ({cancelled.length})</h2>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {cancelled.map((tournament) => (
                                <TournamentCard key={tournament.id} tournament={tournament} cancelled />
                            ))}
                        </div>
                    </section>
                )}
            </div>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 py-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <p className="text-gray-400 text-sm">
                        © {new Date().getFullYear()} KTM Tournament Manager. Built for the Taekwondo community.
                    </p>
                </div>
            </footer>
        </main>
    )
}

interface TournamentCardProps {
    tournament: {
        id: string
        name: string
        startDate: Date
        venue: string | null
        headerImageUrl: string | null
        status: string
    }
    priority?: boolean
    finished?: boolean
    cancelled?: boolean
}

function TournamentCard({ tournament, priority, finished, cancelled }: TournamentCardProps) {
    const isCancelled = cancelled || tournament.status === 'CANCELLED'

    const CardContent = (
        <>
            <div className={`h-36 bg-gradient-to-br from-gray-100 to-gray-200 relative ${isCancelled || finished ? 'grayscale opacity-70' : ''}`}>
                {tournament.headerImageUrl ? (
                    <Image
                        src={tournament.headerImageUrl}
                        alt={tournament.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                        priority={priority}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-50">
                        <span className="text-4xl">🥋</span>
                    </div>
                )}

                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                    {isCancelled && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-100 text-red-700 border border-red-200">
                            Cancelled
                        </span>
                    )}
                    {finished && !isCancelled && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-gray-100 text-gray-600 border border-gray-200">
                            Finished
                        </span>
                    )}
                </div>
            </div>

            <div className="p-4">
                <h3 className={`font-bold text-base truncate ${isCancelled ? 'text-gray-400' : finished ? 'text-gray-600' : 'text-gray-900 group-hover:text-red-600 transition-colors'}`}>
                    {tournament.name}
                </h3>

                <div className="mt-3 space-y-1.5">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {new Date(tournament.startDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        })}
                    </div>
                    {tournament.venue && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="truncate">{tournament.venue}</span>
                        </div>
                    )}
                </div>
            </div>
        </>
    )

    if (isCancelled) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden cursor-not-allowed shadow-sm">
                {CardContent}
            </div>
        )
    }

    return (
        <Link
            href={`/tournament/${tournament.id}`}
            className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-red-300 hover:shadow-md transition-all"
        >
            {CardContent}
        </Link>
    )
}
