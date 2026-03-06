import { notFound } from 'next/navigation'
import { getEventConfig } from '@/lib/event-config'

// ====================================================
// EVENT PAGE REGISTRY
// Import and register each custom event landing page here.
// Each event gets its own unique, custom-designed component.
// ====================================================
import WorldChampionship2026 from './events/WorldChampionship2026'

const EVENT_PAGES: Record<string, React.ComponentType<{ tournamentId: string; eventName: string }>> = {
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

    // 3. Render the custom event landing page
    return <EventComponent tournamentId={config.tournamentId} eventName={config.name} />
}
