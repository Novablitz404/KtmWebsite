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
    tagline: string
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
        faviconUrl: null,
        heroImageUrl: null,
        tagline: 'Taekwondo Management Platform',
        footerText: null,
    },
    wotf: {
        name: 'WOTF Philippines',
        slug: 'wotf',
        logoUrl: '/wotf/logo_image.png',
        logoWhiteUrl: '/wotf/wotf_logo_word.png',
        primaryColor: '#0085C7',     // Congo Blue
        secondaryColor: '#DF0024',   // Spanish Red
        accentColor: '#F4C300',      // Dashing Yellow
        faviconUrl: '/wotf/logo_image.png',
        heroImageUrl: null,
        tagline: 'World Olympic Taekwondo Federation Philippines',
        footerText: null,
    },
}
