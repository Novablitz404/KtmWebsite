'use client'

import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { usePathname, useRouter } from 'next/navigation'

/**
 * This component wraps page content and handles:
 * 1. Redirecting to onboarding if profile is incomplete (via Clerk metadata)
 * 2. Role-based redirects from home page (via Clerk metadata)
 * 
 * NO API calls are made — everything reads from Clerk's session.
 */
export default function AuthLoadingWrapper({ children }: { children: React.ReactNode }) {
    const { user, isLoaded } = useUser()
    const pathname = usePathname()
    const router = useRouter()

    useEffect(() => {
        if (!isLoaded) return // Wait for Clerk
        if (!user) return // Let middleware handle auth redirects

        const metadata = user.publicMetadata as any
        const role = metadata?.role as string | undefined
        const profileComplete = metadata?.profileComplete as boolean | undefined

        const isOnboarding = pathname?.startsWith('/onboarding')

        // 1. If profile is not complete, redirect to onboarding
        if (!profileComplete) {
            if (!isOnboarding) {
                router.replace('/onboarding/complete-profile')
            }
            return
        }

        // 2. If profile IS complete but they're on onboarding, send to dashboard
        if (isOnboarding && profileComplete) {
            router.replace('/')
            return
        }

        // 3. Role-Based Redirect from Root
        if (pathname === '/') {
            let redirectTo = '/athlete'

            switch (role) {
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

    }, [isLoaded, user, pathname, router])

    return <>{children}</>
}
