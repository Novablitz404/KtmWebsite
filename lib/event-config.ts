/**
 * Event Landing Page Configuration
 * 
 * Maps event slugs to tournament IDs. This is used by:
 * - proxy.ts: to detect custom event domains and set the event slug header
 * - Event pages: to resolve which tournament to load data for
 * 
 * For v1, this is manually configured per event.
 * Future migration (Option A): read from database via admin panel.
 */

export interface EventConfig {
    tournamentId: string
    name: string
    slug: string

    // Metadata (for <head> tag — favicon, title, description)
    title?: string        // Browser tab title. Falls back to `name`
    description?: string  // Meta description for SEO
    faviconUrl?: string   // Path to favicon, e.g. '/events/world-championship-2026/favicon.ico'
    ogImageUrl?: string   // Open Graph image for social sharing

    // Assets (for the landing page component)
    logoUrl?: string      // Event logo, e.g. '/events/world-championship-2026/logo.png'

    // Currency (e.g. "PHP", "USD") — overrides what the tournament DB record says
    // Leave unset to use the currency stored on the tournament record itself.
    currency?: string
}

// Add new events here. The slug must match the route: /event/[slug]
// Assets go in /public/events/[slug]/
export const EVENT_CONFIG: Record<string, EventConfig> = {
    'world-championship-2026': {
        tournamentId: 'cmmxbkkad0001gmhr2gjc844e',
        name: 'World Olympics Taekwondo Championship 2026',
        slug: 'world-championship-2026',
        title: 'KTM World Championship 2026',
        description: 'Register for the biggest Taekwondo event of the year. Open to all athletes worldwide.',
        faviconUrl: '/events/world-championship-2026/favicon.ico',
        ogImageUrl: '/events/world-championship-2026/og-image.jpg',
        logoUrl: '/events/world-championship-2026/logo.png',
    },
}

// Maps custom domains to event slugs (used by proxy.ts)
export const EVENT_DOMAIN_MAP: Record<string, string> = {
    // Example — add custom domain mappings:
    // 'ktm-worlds2026.com': 'world-championship-2026',
    // 'www.ktm-worlds2026.com': 'world-championship-2026',
}

/**
 * Look up an event config by slug.
 * Returns null if no event is configured for the given slug.
 */
export function getEventConfig(slug: string): EventConfig | null {
    return EVENT_CONFIG[slug] || null
}

/**
 * Look up an event slug by custom domain hostname.
 * Returns null if no event is mapped to the given domain.
 */
export function getEventSlugFromDomain(hostname: string): string | null {
    return EVENT_DOMAIN_MAP[hostname] || null
}
