import { prisma } from '@/lib/prisma'
import Image from 'next/image'
import Link from 'next/link'
import { getTenant } from '@/lib/tenant'
import WOTFEventsPage from '@/components/landing/wotf/pages/EventsPage'
import GlobalEventsPage from '@/components/landing/wotf-global/pages/EventsPage'

// Force dynamic rendering to ensure real-time data and avoid build-time DB connections
export const dynamic = 'force-dynamic'

export default async function EventsPage(props: { searchParams: Promise<{ type?: string }> }) {
    const tenant = await getTenant()
    const searchParams = await props.searchParams
    const eventType = searchParams.type

    // WOTF Global tenant: show unified events page
    if (tenant.slug === 'wotf-global') {
        const now = new Date()
        now.setHours(0, 0, 0, 0)

        const orgId = tenant.id
        if (!orgId) return <GlobalEventsPage />

        const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { ownerId: true } })

        const [tournaments, seminars] = await Promise.all([
            org?.ownerId ? prisma.tournament.findMany({
                where: { organizerId: org.ownerId, status: { not: 'CANCELLED' } },
                select: { id: true, name: true, startDate: true, venue: true, headerImageUrl: true, status: true },
                orderBy: { startDate: 'desc' },
            }) : Promise.resolve([]),
            prisma.seminar.findMany({
                where: { organizationId: orgId, status: { not: 'CANCELLED' } },
                select: { id: true, name: true, startDate: true, venue: true, bannerUrl: true, status: true },
                orderBy: { startDate: 'desc' },
            }),
        ])

        // Server-side split: use date as primary factor
        const isUpcoming = (date: Date, status: string) => {
            if (status === 'COMPLETED') return false
            if (status === 'ONGOING') return true
            return date >= now
        }

        const serialize = (t: any, imageField: 'headerImageUrl' | 'bannerUrl') => ({
            id: t.id, name: t.name, date: t.startDate.toISOString(), venue: t.venue,
            imageUrl: t[imageField], status: t.status
        })

        const upcomingTournaments = tournaments.filter(t => isUpcoming(t.startDate, t.status)).map(t => serialize(t, 'headerImageUrl'))
        const pastTournaments = tournaments.filter(t => !isUpcoming(t.startDate, t.status)).map(t => serialize(t, 'headerImageUrl'))
        const upcomingSeminars = seminars.filter(s => isUpcoming(s.startDate, s.status)).map(s => serialize(s, 'bannerUrl'))
        const pastSeminars = seminars.filter(s => !isUpcoming(s.startDate, s.status)).map(s => serialize(s, 'bannerUrl'))

        return <GlobalEventsPage
            tournaments={upcomingTournaments}
            seminars={upcomingSeminars}
            pastTournaments={pastTournaments}
            pastSeminars={pastSeminars}
        />
    }

    // Non-KTM tenant: show org-specific events page with real data
    if (tenant.slug !== 'ktm') {
        const now = new Date()
        now.setHours(0, 0, 0, 0)

        // Build org filter for seminars (they have organizationId)
        let seminarOrgFilter: any = {}
        if (tenant.id) {
            const ktmOrg = await prisma.organization.findFirst({
                where: { slug: 'ktm' },
                select: { id: true }
            })
            const allowedOrgIds = [tenant.id]
            if (ktmOrg && ktmOrg.id !== tenant.id) {
                allowedOrgIds.push(ktmOrg.id)
            }
            seminarOrgFilter = { organizationId: { in: allowedOrgIds } }
        }

        const [tournaments, seminars] = await Promise.all([
            prisma.tournament.findMany({
                where: {
                    startDate: { gte: now },
                    status: { not: 'CANCELLED' },
                },
                orderBy: { startDate: 'asc' },
                select: {
                    id: true,
                    name: true,
                    startDate: true,
                    venue: true,
                    headerImageUrl: true,
                    status: true,
                    tier: true,
                    dateTBA: true,
                    categories: {
                        select: { type: true }
                    }
                }
            }),
            prisma.seminar.findMany({
                where: {
                    startDate: { gte: now },
                    status: { not: 'CANCELLED' },
                    ...seminarOrgFilter,
                },
                orderBy: { startDate: 'asc' },
                select: {
                    id: true,
                    name: true,
                    startDate: true,
                    endDate: true,
                    venue: true,
                    bannerUrl: true,
                    status: true,
                }
            })
        ])

        // Normalize to a common shape for the events page
        const events = [
            ...tournaments.map(t => ({
                id: t.id,
                title: t.name,
                type: 'competition' as const,
                start: t.startDate,
                end: t.startDate, // Tournaments don't have endDate
                location: t.venue || 'TBA',
                image: t.headerImageUrl || 'bg-gradient-to-br from-spanish-red to-orange-600',
                status: t.status === 'UPCOMING' ? 'upcoming' as const : 'open' as const,
                tags: [...new Set(t.categories.map(c => c.type))],
                tier: t.tier || 'J-2',
                dateTBA: t.dateTBA || false,
                link: `/tournament/${t.id}`,
            })),
            ...seminars.map(s => ({
                id: s.id,
                title: s.name,
                type: 'camp' as const,
                start: s.startDate,
                end: s.endDate || s.startDate,
                location: s.venue || 'TBA',
                image: s.bannerUrl || 'bg-gradient-to-br from-african-turquoise to-teal-600',
                status: s.status === 'UPCOMING' ? 'upcoming' as const : 'open' as const,
                tags: ['Seminar'],
                link: `/seminars/${s.id}`,
            })),
        ].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

        return <WOTFEventsPage events={events} />
    }

    const now = new Date()
    now.setHours(0, 0, 0, 0)

    // Fetch all tournaments and seminars
    const [tournamentsUpcoming, tournamentsPast, seminarsUpcoming, seminarsPast] = await Promise.all([
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
        }),
        prisma.seminar.findMany({
            where: {
                startDate: { gte: now },
                status: { not: 'CANCELLED' }
            },
            orderBy: { startDate: 'asc' }
        }),
        prisma.seminar.findMany({
            where: {
                OR: [
                    { startDate: { lt: now } },
                    { status: 'CANCELLED' }
                ]
            },
            orderBy: { startDate: 'desc' }
        })
    ])

    // Normalize and Merge
    const normalizeTournament = (t: any) => ({
        id: t.id,
        type: 'TOURNAMENT' as const,
        name: t.name,
        startDate: t.startDate,
        venue: t.venue,
        headerImageUrl: t.headerImageUrl, // keep usage consistent or map to generic 'imageUrl'
        status: t.status,
        link: `/tournament/${t.id}`
    })

    const normalizeSeminar = (s: any) => ({
        id: s.id,
        type: 'SEMINAR' as const,
        name: s.name,
        startDate: s.startDate,
        venue: s.venue,
        headerImageUrl: s.bannerUrl, // Map bannerUrl to headerImageUrl for component compatibility
        status: s.status,
        visibility: s.visibility,
        link: `/seminars/${s.id}`
    })

    const upcoming = [
        ...tournamentsUpcoming.map(normalizeTournament),
        ...seminarsUpcoming.map(normalizeSeminar)
    ].sort((a, b) => a.startDate.getTime() - b.startDate.getTime())

    const allPast = [
        ...tournamentsPast.map(normalizeTournament),
        ...seminarsPast.map(normalizeSeminar)
    ].sort((a, b) => b.startDate.getTime() - a.startDate.getTime())

    // Separate cancelled from past
    // Separate cancelled from past
    const cancelled = allPast.filter(t => t.status === 'CANCELLED')
    const finished = allPast.filter(t => t.status !== 'CANCELLED')

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
                            {upcoming.map((event, index) => (
                                <TournamentCard key={`${event.type}-${event.id}`} tournament={event} priority={index < 3} />
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
                            {finished.map((event) => (
                                <TournamentCard key={`${event.type}-${event.id}`} tournament={event} finished />
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
                            {cancelled.map((event) => (
                                <TournamentCard key={`${event.type}-${event.id}`} tournament={event} cancelled />
                            ))}
                        </div>
                    </section>
                )}
            </div>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 py-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <p className="text-gray-400 text-sm">
                        © {new Date().getFullYear()} KTM Taekwondo Manager. Built for the Taekwondo community.
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
        type?: 'TOURNAMENT' | 'SEMINAR'
        link?: string
        visibility?: string
    }
    priority?: boolean
    finished?: boolean
    cancelled?: boolean
}

function TournamentCard({ tournament, priority, finished, cancelled }: TournamentCardProps) {
    const isCancelled = cancelled || tournament.status === 'CANCELLED'
    const isSeminar = tournament.type === 'SEMINAR'
    const isPrivate = tournament.visibility === 'PRIVATE'

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
                        <span className="text-4xl">{isSeminar ? '🎓' : '🥋'}</span>
                    </div>
                )}

                {/* Status Badge */}
                <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                    {isPrivate && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-gray-600 text-white border border-gray-700 shadow-sm flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                            Private
                        </span>
                    )}
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
            href={tournament.link || `/tournament/${tournament.id}`}
            className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-red-300 hover:shadow-md transition-all"
        >
            {CardContent}
        </Link>
    )
}
