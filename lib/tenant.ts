import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { TENANT_BRANDING } from '@/lib/tenant-config'

// Default KTM branding (used when no tenant is detected)
const KTM_DEFAULT = {
    id: null as string | null,
    ...TENANT_BRANDING.ktm,
    customDomain: null as string | null,
    isKtmAdmin: true,
    isMappedDomain: true,
}

export type TenantConfig = typeof KTM_DEFAULT

// Simple in-memory cache for org ID lookups
const orgIdCache = new Map<string, { id: string; timestamp: number }>()
const CACHE_TTL = 60 * 1000 // 1 minute

/**
 * Resolves the real Organization row backing the 'ktm' tenant. KTM used to be
 * a special id:null case with no backing org row — it now has a real
 * Organization (slug: 'ktm') so that "which org hosted this tournament"
 * resolves the same way for every tournament, KTM's own included, instead of
 * needing a special case throughout the GSS/ranking pipeline.
 */
export async function resolveKtmOrgId(): Promise<string | null> {
    const cached = orgIdCache.get('ktm')
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.id
    }
    const org = await prisma.organization.findFirst({ where: { slug: 'ktm' }, select: { id: true } })
    if (org) {
        orgIdCache.set('ktm', { id: org.id, timestamp: Date.now() })
        return org.id
    }
    return null
}

export async function getTenant(): Promise<TenantConfig> {
    const headersList = await headers()
    const orgSlug = headersList.get('x-org-slug')
    const isMappedDomain = headersList.get('x-tenant-mapped-domain') === '1'

    if (!orgSlug || orgSlug === 'ktm') {
        const ktmOrgId = await resolveKtmOrgId()
        return { ...KTM_DEFAULT, id: ktmOrgId }
    }

    // Get branding from repo config
    const branding = TENANT_BRANDING[orgSlug]
    if (!branding) {
        // Unknown tenant slug — fall back to KTM
        return KTM_DEFAULT
    }

    // Get org ID from DB (needed for data relationships)
    let orgId: string | null = null
    const cached = orgIdCache.get(orgSlug)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        orgId = cached.id
    } else {
        const org = await prisma.organization.findFirst({
            where: {
                OR: [
                    { slug: orgSlug },
                    { customDomain: orgSlug },
                ]
            },
            select: { id: true, customDomain: true }
        })
        if (org) {
            orgId = org.id
            orgIdCache.set(orgSlug, { id: org.id, timestamp: Date.now() })
        }
    }

    return {
        id: orgId,
        ...branding,
        customDomain: null,
        isKtmAdmin: false,
        isMappedDomain,
    }
}
