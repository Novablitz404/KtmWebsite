'use client'

import React, { useState, useEffect } from 'react'
import LandingPage from '@/components/LandingPage'
import CustomSignInForm from '@/components/auth/CustomSignInForm'
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
        setMounted(true)

        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    if (!mounted) {
        // Prevent FOUC (Flash of Unstyled Content/Desktop Site) on mobile by returning null
        // until we confirm the device type and display mode.
        return null
    }

    // If Mobile AND NOT Standalone (Browser) -> Should typically show Install Guide
    // User requested to disable this wall to allow mobile browser access.
    // if (isMobile && !isStandalone) {
    //    return <InstallGuide />
    // }

    // If Mobile AND Standalone AND user is NOT logged in -> Direct Sign In (No Extra Splash)
    if (isMobile && !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <CustomSignInForm />
            </div>
        )
    }

    // Otherwise (Desktop OR Mobile Logged In User), show Landing Page
    return <LandingPage upcomingTournaments={upcomingTournaments} user={user} />
}
