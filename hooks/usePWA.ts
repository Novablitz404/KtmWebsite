'use client'

import { useState, useEffect } from 'react'

export function useIsPWA() {
    const [isPWA, setIsPWA] = useState(false)

    useEffect(() => {
        // Check if running as installed PWA (standalone mode)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        const isIOSStandalone = (window.navigator as any).standalone === true

        setIsPWA(isStandalone || isIOSStandalone)

        // Listen for display mode changes
        const mediaQuery = window.matchMedia('(display-mode: standalone)')
        const handleChange = (e: MediaQueryListEvent) => {
            setIsPWA(e.matches)
        }

        mediaQuery.addEventListener('change', handleChange)
        return () => mediaQuery.removeEventListener('change', handleChange)
    }, [])

    return isPWA
}

export function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768)
        }

        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    return isMobile
}

// Combined hook for mobile PWA detection
export function useMobilePWA() {
    const isPWA = useIsPWA()
    const isMobile = useIsMobile()

    return isPWA && isMobile
}
