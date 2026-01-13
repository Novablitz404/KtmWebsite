'use client'

import React, { useState, useEffect } from 'react'
import LandingPage from '@/components/LandingPage'
import CustomSignInForm from '@/components/auth/CustomSignInForm'

interface HomeClientProps {
    upcomingTournaments: any[]
    user: any
}

export default function HomeClient({ upcomingTournaments, user }: HomeClientProps) {
    const [isMobile, setIsMobile] = useState(false)
    const [mounted, setMounted] = useState(false)

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
    // (Logged-in mobile users are redirected to /athlete/home by page.tsx)
    return <LandingPage upcomingTournaments={upcomingTournaments} user={user} />
}
