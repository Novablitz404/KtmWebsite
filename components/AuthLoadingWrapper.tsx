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
                    let redirectTo = '/profile' // Default

                    switch (data.role) {
                        case 'ADMIN':
                            redirectTo = '/admin'
                            break
                        case 'ORGANIZER':
                        case 'MANAGER':
                            redirectTo = '/manage'
                            break
                        case 'CLUB_MASTER':
                        case 'ASSISTANT_CLUB_MASTER':
                            redirectTo = '/club'
                            break
                        case 'ATHLETE':
                        default:
                            redirectTo = '/profile'
                            break
                    }

                    // Use replace to avoid back-button issues
                    router.replace(redirectTo)
                })
                .catch(() => {
                    // On error, just go to profile
                    router.replace('/profile')
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

    // Show loading overlay when redirecting after sign-in
    if (isRedirecting && pathname === '/') {
        return (
            <div className="fixed inset-0 bg-white z-[100] flex items-center justify-center">
                <div className="text-center">
                    {/* Animated KTM Logo */}
                    <div className="relative mx-auto w-20 h-20 mb-4">
                        <img
                            src="/KTMLogo.png"
                            alt="KTM"
                            className="w-20 h-20 object-contain animate-pulse"
                        />
                    </div>
                    <p className="text-gray-600 font-medium">Signing you in...</p>
                    {/* Subtle loading bar */}
                    <div className="mt-4 w-48 h-1 bg-gray-200 rounded-full overflow-hidden mx-auto">
                        <div className="h-full bg-red-600 rounded-full animate-pulse" style={{ width: '60%' }} />
                    </div>
                </div>
            </div>
        )
    }

    return <>{children}</>
}
