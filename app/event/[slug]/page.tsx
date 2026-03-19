import { notFound } from 'next/navigation'
import { getEventConfig } from '@/lib/event-config'
import { prisma } from '@/lib/prisma'

// ====================================================
// EVENT PAGE REGISTRY
// Import and register each custom event landing page here.
// Each event gets its own unique, custom-designed component.
// ====================================================
import WorldChampionship2026 from './events/WorldChampionship2026'

export interface TournamentPricing {
    regularPrice: number | null
    earlyBirdPrice: number | null
    earlyBirdDeadline: Date | null
    categoryPricing: Record<string, { regular: number | null; earlyBird: number | null }> | null
    currency: string
    showPricing: boolean
}

export interface CountryStat {
    country: string
    count: number
}

export interface TournamentStats {
    totalAthletes: number
    kyorugi: number
    poomsae: number
    teams: number       // unique clubs/teams
    countries: CountryStat[]
}

const EVENT_PAGES: Record<string, React.ComponentType<{
    tournamentId: string
    eventName: string
    pricing: TournamentPricing
    stats: TournamentStats
}>> = {
    'world-championship-2026': WorldChampionship2026,
}

// ====================================================

interface PageProps {
    params: Promise<{ slug: string }>
}

export default async function EventPage({ params }: PageProps) {
    const { slug } = await params

    // 1. Look up event config
    const config = getEventConfig(slug)
    if (!config) {
        notFound()
    }

    // 2. Look up custom landing page component
    const EventComponent = EVENT_PAGES[slug]
    if (!EventComponent) {
        // Fallback: show a generic "coming soon" page if no custom component is registered yet
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
                <div className="text-center text-white max-w-lg px-6">
                    <h1 className="text-5xl font-black mb-4">{config.name}</h1>
                    <p className="text-xl text-slate-300 mb-8">
                        Landing page coming soon.
                    </p>
                    <div className="flex gap-4 justify-center">
                        <a
                            href={`/event/${slug}/register`}
                            className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                        >
                            Register Now
                        </a>
                        <a
                            href={`/event/${slug}/status`}
                            className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all border border-white/20"
                        >
                            Check Status
                        </a>
                    </div>
                </div>
            </div>
        )
    }

    // 3. Fetch live pricing + stats in parallel
    const [tournament, registrations] = await Promise.all([
        prisma.tournament.findUnique({
            where: { id: config.tournamentId },
            select: {
                regularPrice: true,
                earlyBirdPrice: true,
                earlyBirdDeadline: true,
                categoryPricing: true,
                currency: true,
                showPricing: true,
            }
        }),
        prisma.guestRegistration.findMany({
            where: { tournamentId: config.tournamentId },
            select: {
                country: true,
                clubId: true,
                clubNameOther: true,
                isIndependent: true,
                player: {
                    select: {
                        category: { select: { type: true } }
                    }
                }
            }
        })
    ])

    const pricing: TournamentPricing = {
        regularPrice: tournament?.regularPrice ?? null,
        earlyBirdPrice: tournament?.earlyBirdPrice ?? null,
        earlyBirdDeadline: tournament?.earlyBirdDeadline ?? null,
        categoryPricing: (tournament?.categoryPricing as TournamentPricing['categoryPricing']) ?? null,
        currency: config.currency ?? tournament?.currency ?? 'PHP',
        showPricing: tournament?.showPricing ?? false,
    }

    // Build stats
    const countryMap = new Map<string, number>()
    let kyorugi = 0, poomsae = 0
    const teamSet = new Set<string>()

    for (const reg of registrations) {
        // Country counts
        const c = reg.country || 'Unknown'
        countryMap.set(c, (countryMap.get(c) ?? 0) + 1)
        // Category type
        const catType = reg.player?.category?.type
        if (catType === 'KYORUGI') kyorugi++
        else if (catType === 'POOMSAE') poomsae++
        // Team/club tracking
        if (reg.clubId) teamSet.add(reg.clubId)
        else if (reg.clubNameOther) teamSet.add(reg.clubNameOther)
    }

    const countries: CountryStat[] = Array.from(countryMap.entries())
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count)

    const stats: TournamentStats = {
        totalAthletes: registrations.length,
        kyorugi,
        poomsae,
        teams: teamSet.size,
        countries,
    }

    // 4. Render the custom event landing page
    return <EventComponent tournamentId={config.tournamentId} eventName={config.name} pricing={pricing} stats={stats} />
}
