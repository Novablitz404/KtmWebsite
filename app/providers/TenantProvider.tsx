'use client'

import { createContext, useContext, ReactNode, useEffect } from 'react'

export interface TenantInfo {
    id: string | null
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
    customDomain: string | null
    isKtmAdmin: boolean
}

const TenantContext = createContext<TenantInfo | null>(null)

export function TenantProvider({
    tenant,
    children,
}: {
    tenant: TenantInfo
    children: ReactNode
}) {
    // Apply tenant CSS variables to the document
    useEffect(() => {
        if (tenant) {
            document.documentElement.style.setProperty('--tenant-primary', tenant.primaryColor)
            document.documentElement.style.setProperty('--tenant-secondary', tenant.secondaryColor)
            document.documentElement.style.setProperty('--tenant-accent', tenant.accentColor)
        }
    }, [tenant])

    return (
        <TenantContext.Provider value={tenant}>
            {children}
        </TenantContext.Provider>
    )
}

export function useTenant(): TenantInfo {
    const context = useContext(TenantContext)
    if (!context) {
        // Return KTM defaults if used outside provider (shouldn't happen in normal flow)
        return {
            id: null,
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
            customDomain: null,
            isKtmAdmin: true,
        }
    }
    return context
}
