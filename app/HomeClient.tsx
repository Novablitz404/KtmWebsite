'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchLandingPageEvents } from '@/app/actions'
import LandingPage from '@/components/LandingPage'
import CustomSignInForm from '@/components/auth/CustomSignInForm'

interface HomeClientProps {
    upcomingTournaments: any[]
    user: any
}

export default function HomeClient({ upcomingTournaments: initialEvents, user }: HomeClientProps) {
    const [isMobile, setIsMobile] = useState(false)
    const [mounted, setMounted] = useState(false)

    // TanStack Query for events
    const { data: events } = useQuery({
        queryKey: ['landing-events'],
        queryFn: fetchLandingPageEvents,
        initialData: initialEvents,
        staleTime: 1000 * 60 * 5 // 5 minutes
    })

    useEffect(() => {
        setIsMobile(window.innerWidth < 768)
        setMounted(true)
    }, [])

    if (!mounted) return null

    // Mobile users who are NOT logged in -> Show Sign In
    if (isMobile && !user) {
        return (
            <div className="h-screen flex items-center justify-center bg-white overflow-hidden">
                <CustomSignInForm />
            </div>
        )
    }

    // All other cases -> Landing Page
    // (Logged-in mobile users are redirected to /athlete by page.tsx)
    return <LandingPage upcomingTournaments={events} user={user} />
}

