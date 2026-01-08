'use client'

import { useEffect, useRef, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { usePathname, useRouter } from 'next/navigation'

/**
 * This component wraps page content and shows a loading overlay
 * immediately when a user signs in, preventing the homepage from
 * flashing before the server-side redirect kicks in.
 */
export default function AuthLoadingWrapper({ children }: { children: React.ReactNode }) {
    const { user, isLoaded } = useUser()
    const pathname = usePathname()
    const router = useRouter()
    const wasSignedOut = useRef(true)
    const [isSigningIn, setIsSigningIn] = useState(false)

    // Detect sign-in transition and show loading immediately
    useEffect(() => {
        if (isLoaded) {
            if (user && wasSignedOut.current) {
                // User just signed in - show loading immediately
                wasSignedOut.current = false
                setIsSigningIn(true)
                // Trigger server-side refresh to process redirects
                router.refresh()
            } else if (!user) {
                wasSignedOut.current = true
                setIsSigningIn(false)
            }
        }
    }, [isLoaded, user, router])

    // Clear loading state once we've navigated away from homepage
    useEffect(() => {
        if (pathname && pathname !== '/') {
            setIsSigningIn(false)
        }
    }, [pathname])

    // Show loading overlay when signing in on homepage
    if (isSigningIn && pathname === '/') {
        return (
            <div className="fixed inset-0 bg-white z-[100] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 font-medium">Signing you in...</p>
                </div>
            </div>
        )
    }

    return <>{children}</>
}
