'use client'

import { useState, useEffect } from 'react'
import AthleteDashboardView from '@/components/athlete/AthleteDashboardView'
import PwaDashboard from '@/components/pwa/PwaDashboard'
import InstallGuide from '@/components/InstallGuide'
import { Skeleton } from '@/components/ui/Skeleton'

interface UnifiedAthleteViewProps {
    // Desktop view props
    clerkId: string
    imageUrl?: string | null
    // Mobile view props
    dbUser: any
    clerkUser: any
    unreadCount: number
    initialTab?: string
    homeContent: React.ReactNode
    eventsContent: React.ReactNode
    registerContent: React.ReactNode
}

export default function UnifiedAthleteView(props: UnifiedAthleteViewProps) {
    const [isMobile, setIsMobile] = useState<boolean | null>(null)
    const [isPWA, setIsPWA] = useState<boolean | null>(null)

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768)
        }

        // Check if running as PWA (standalone mode)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        const isIOSStandalone = (window.navigator as any).standalone === true
        setIsPWA(isStandalone || isIOSStandalone)

        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // Show a simple loading state while detecting screen size and PWA status
    if (isMobile === null || isPWA === null) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-pulse">
                    <Skeleton className="w-12 h-12 rounded-full" />
                </div>
            </div>
        )
    }

    // Mobile browser (NOT PWA) → Show install guide to force PWA installation
    if (isMobile && !isPWA) {
        return <InstallGuide />
    }

    // Mobile PWA → render PwaDashboard
    if (isMobile && isPWA) {
        return (
            <PwaDashboard
                dbUser={props.dbUser}
                clerkUser={props.clerkUser}
                tournamentsJoined={0}
                initialTab={props.initialTab}
                unreadCount={props.unreadCount}
                homeContent={props.homeContent}
                eventsContent={props.eventsContent}
                registerContent={props.registerContent}
            />
        )
    }

    // Desktop: render AthleteDashboardView
    return (
        <AthleteDashboardView
            clerkId={props.clerkId}
            imageUrl={props.imageUrl}
        />
    )
}
