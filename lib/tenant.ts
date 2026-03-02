import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { TENANT_BRANDING } from '@/lib/tenant-config'

// Default KTM branding (used when no tenant is detected)
const KTM_DEFAULT = {
    id: null as string | null,
    ...TENANT_BRANDING.ktm,
    customDomain: null as string | null,
    isKtmAdmin: true,
}

export type TenantConfig = typeof KTM_DEFAULT

// Simple in-memory cache for org ID lookups
const orgIdCache = new Map<string, { id: string; timestamp: number }>()
const CACHE_TTL = 60 * 1000 // 1 minute

export async function getTenant(): Promise<TenantConfig> {
    const headersList = await headers()
    const orgSlug = headersList.get('x-org-slug')

    if (!orgSlug || orgSlug === 'ktm') {
        return KTM_DEFAULT
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
    }
}
