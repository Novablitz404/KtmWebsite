'use client'

import React, { useState, useEffect } from 'react'
import LandingPage from '@/components/LandingPage'
import MobileSplashScreen from '@/components/MobileSplashScreen'

interface HomeClientProps {
    upcomingTournaments: any[]
    user: any
}

export default function HomeClient({ upcomingTournaments, user }: HomeClientProps) {
    const [isMobile, setIsMobile] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768) // Standard md breakpoint
        }

        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    if (!mounted) {
        // Server-side render match (defaults to desktop/landing view to be safe/SEO friendly)
        return <LandingPage upcomingTournaments={upcomingTournaments} user={user} />
    }

    // If Mobile AND user is NOT logged in, show Splash Screen flow
    if (isMobile && !user) {
        return <MobileSplashScreen />
    }

    // Otherwise (Desktop OR Mobile Logged In User), show Landing Page
    return <LandingPage upcomingTournaments={upcomingTournaments} user={user} />
}
