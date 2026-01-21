'use client'

import { useEffect, useRef, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { usePathname, useRouter } from 'next/navigation'

/**
 * This component wraps page content and shows a loading overlay
 * immediately when a user signs in, then redirects to the appropriate dashboard.
 */
export default function AuthLoadingWrapper({ children }: { children: React.ReactNode }) {
    const { user, isLoaded } = useUser()
    const pathname = usePathname()
    const router = useRouter()
    const [isRedirecting, setIsRedirecting] = useState(false)
    const hasRedirected = useRef(false)
    const previousUserId = useRef<string | null>(null)

    // Detect sign-in and redirect
    useEffect(() => {
        if (!isLoaded) return

        const currentUserId = user?.id || null

        // User just signed in (went from null to having an ID)
        if (currentUserId && !previousUserId.current && pathname === '/' && !hasRedirected.current) {
            hasRedirected.current = true
            setIsRedirecting(true)

            // Fetch user role and redirect
            fetch('/api/user/role')
                .then(res => res.json())
                .then(data => {
                    let redirectTo = '/athlete' // Default now points to Athlete Dashboard

                    switch (data.role) {
                        case 'ADMIN':
                            redirectTo = '/admin'
                            break
                        case 'ORGANIZER':
                            redirectTo = '/organization'
                            break
                        case 'MANAGER':
                            redirectTo = '/organizer-tournaments'
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

                    // Use replace to avoid back-button issues
                    router.replace(redirectTo)
                })
                .catch(() => {
                    // On error, default to athlete home
                    router.replace('/athlete')
                })
        }

        // User signed out
        if (!currentUserId && previousUserId.current) {
            hasRedirected.current = false
            setIsRedirecting(false)
        }

        previousUserId.current = currentUserId
    }, [isLoaded, user, pathname, router])

    // Clear redirecting state once we've navigated
    useEffect(() => {
        if (pathname && pathname !== '/') {
            setIsRedirecting(false)
        }
    }, [pathname])



    return <>{children}</>
}
