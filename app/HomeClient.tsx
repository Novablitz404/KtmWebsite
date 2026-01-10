'use client'

import React, { useState, useEffect } from 'react'
import LandingPage from '@/components/LandingPage'
import MobileSplashScreen from '@/components/MobileSplashScreen'
import InstallGuide from '@/components/InstallGuide'

interface HomeClientProps {
    upcomingTournaments: any[]
    user: any
}

export default function HomeClient({ upcomingTournaments, user }: HomeClientProps) {
    const [isMobile, setIsMobile] = useState(false)
    const [isStandalone, setIsStandalone] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768) // Standard md breakpoint
        }

        // Check if running in standalone mode (PWA)
        const checkStandalone = () => {
            const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                (window.navigator as any).standalone === true
            setIsStandalone(isStandaloneMode)
        }

        checkMobile()
        checkStandalone()

        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    if (!mounted) {
        // Server-side render match (defaults to desktop/landing view to be safe/SEO friendly)
        return <LandingPage upcomingTournaments={upcomingTournaments} user={user} />
    }

    // If Mobile AND NOT Standalone (Browser) -> Force Install Guide
    if (isMobile && !isStandalone) {
        return <InstallGuide />
    }

    // If Mobile AND Standalone AND user is NOT logged in -> Splash Screen Flow
    if (isMobile && !user) {
        return <MobileSplashScreen />
    }

    // Otherwise (Desktop OR Mobile Logged In User), show Landing Page
    return <LandingPage upcomingTournaments={upcomingTournaments} user={user} />
}
