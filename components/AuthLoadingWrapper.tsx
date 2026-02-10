'use client'

import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { usePathname, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'

/**
 * This component wraps page content and handles:
 * 1. Role-based redirects from home page
 * 2. Mandatory profile completion (Image, Weight, Height)
 */
export default function AuthLoadingWrapper({ children }: { children: React.ReactNode }) {
    const { user, isLoaded } = useUser()
    const pathname = usePathname()
    const router = useRouter()

    // Fetch DB user data to check for weight/height & role
    const { data: dbUser, isLoading: isDbLoading } = useQuery({
        queryKey: ['userProfile', user?.id],
        queryFn: async () => {
            const res = await fetch('/api/user/role')
            if (!res.ok) throw new Error('Failed to fetch user')
            return res.json()
        },
        enabled: !!user?.id
    })

    useEffect(() => {
        if (!isLoaded) return // Wait for Clerk
        if (!user) return // Let middleware handle auth redirects
        if (isDbLoading) return // Wait for DB Data checking

        // 1. Check Profile Completeness
        const hasImage = user.hasImage
        const isAthlete = dbUser?.role === 'ATHLETE'
        const hasMeasurements = dbUser?.weight && dbUser?.height

        // For athletes, require measurements. For others, only image.
        const isProfileComplete = hasImage && (isAthlete ? hasMeasurements : true)

        const isOnboarding = pathname?.startsWith('/onboarding')

        if (!isProfileComplete) {
            // Strict Redirect to Onboarding
            if (!isOnboarding) {
                router.replace('/onboarding/complete-profile')
            }
            return
        }

        // 2. Logic for when Profile IS Complete
        if (isOnboarding && isProfileComplete) {
            // If they happen to be on onboarding but are done, send them home/dashboard
            router.replace('/')
            return
        }

        // 3. Role-Based Redirect from Root
        if (pathname === '/') {
            let redirectTo = '/athlete'

            switch (dbUser?.role) {
                case 'ADMIN':
                    redirectTo = '/admin'
                    break
                case 'ORGANIZER':
                    redirectTo = '/organization'
                    break
                case 'MANAGER':
                    redirectTo = '/organization?tab=events'
                    break
                case 'CLUB_MASTER':
                case 'ASSISTANT_CLUB_MASTER':
                    redirectTo = '/club'
                    break
                case 'ATHLETE':
                default:
                    redirectTo = '/athlete'
                    break
            }
            router.replace(redirectTo)
        }

    }, [isLoaded, user, dbUser, isDbLoading, pathname, router])

    // Ideally, we might show a loader here while checking
    // but the original component rendered children immediately.
    // To prevent "flash" of dashboard content before redirect, we could return null if checking.
    // However, for better UX on slow connections, maybe we just redirect.
    // Let's stick to existing behavior (render children) to minimize regression, 
    // unless user sees a flash. Middleware protects the route mostly anyway.

    return <>{children}</>
}
