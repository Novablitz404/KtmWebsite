'use client'

import { useState, useEffect } from 'react'

// Simple mobile detection (screen width < 768px)
export function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    return isMobile
}

// Check if installed as PWA (for push notification feature gating)
export function useIsPWA() {
    const [isPWA, setIsPWA] = useState(false)

    useEffect(() => {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        const isIOSStandalone = (window.navigator as any).standalone === true
        setIsPWA(isStandalone || isIOSStandalone)
    }, [])

    return isPWA
}

// Legacy export for backwards compatibility
export function useMobilePWA() {
    return useIsMobile()
}
