/**
 * Tenant branding configuration
 * 
 * This is the source of truth for all tenant branding.
 * KTM manages this config when setting up a new org's white-label site.
 * 
 * To add a new tenant:
 * 1. Add a new entry below with the org's slug as the key
 * 2. Set all branding fields (colors, logos, tagline, etc.)
 * 3. Create the org's landing page components in components/landing/<slug>/
 */

export interface TenantBranding {
    name: string
    slug: string
    logoUrl: string
    logoWhiteUrl: string
    primaryColor: string
    secondaryColor: string
    accentColor: string
    faviconUrl: string | null
    heroImageUrl: string | null
    ogImageUrl: string | null
    tagline: string
    description: string
    footerText: string | null
}

export const TENANT_BRANDING: Record<string, TenantBranding> = {
    ktm: {
        name: 'KTM Taekwondo Manager',
        slug: 'ktm',
        logoUrl: '/ktmnav.png',
        logoWhiteUrl: '/ktmnav_white.png',
        primaryColor: '#DC2626',
        secondaryColor: '#1E40AF',
        accentColor: '#F59E0B',
        faviconUrl: '/KTMLogo.png',
        heroImageUrl: null,
        ogImageUrl: null,
        tagline: 'Taekwondo Management Platform',
        description: 'KTM — the complete taekwondo club and tournament management platform.',
        footerText: null,
    },
    'wotf-global': {
        name: 'WOTF Global',
        slug: 'wotf-global',
        logoUrl: '/wotf-global/Wotf_logo_Final.png',
        logoWhiteUrl: '/wotf-global/wotf_global.png',
        primaryColor: '#0085C7',
        secondaryColor: '#DF0024',
        accentColor: '#F4C300',
        faviconUrl: '/wotf-global/Wotf_logo_Final.png',
        heroImageUrl: null,
        ogImageUrl: '/wotf-global/og-image.png',
        tagline: 'World Olympics Taekwondo Federation',
        description: 'WOTF Global — the official platform of the World Olympics Taekwondo Federation. Register for tournaments, track rankings, and connect with the global taekwondo community.',
        footerText: '© 2026 WOTF Global. All rights reserved.',
    },
}
