'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/app/providers/AuthProvider'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

/**
 * This component wraps page content and handles:
 * 1. Redirecting to onboarding if profile is incomplete
 * 2. Role-based redirects from home page
 * 3. Backfilling organizationMemberId for existing users on org domains
 *
 * Uses Supabase auth + DB user data from AuthProvider.
 */
export default function AuthLoadingWrapper({ children }: { children: React.ReactNode }) {
    const { user, dbUser, isLoaded } = useAuth()
    const pathname = usePathname()
    const router = useRouter()
    const searchParams = useSearchParams()
    const backfillDone = useRef(false)

    // Preserve tenant query param across redirects
    const tenantParam = searchParams.get('tenant')
    const qs = tenantParam ? `?tenant=${tenantParam}` : ''

    useEffect(() => {
        if (!isLoaded) return // Wait until auth state is resolved
        if (!user) return // Let middleware handle unauthenticated users

        // IMPORTANT: If user is authenticated but dbUser hasn't loaded yet,
        // wait — don't redirect to complete-profile prematurely
        if (!dbUser) return

        const role = dbUser.role
        const isOnboarding = pathname?.startsWith('/onboarding')

        // Profile is "complete" if the user has a name set
        const profileComplete = !!dbUser.name

        // 1. If profile is not complete, redirect to onboarding
        if (!profileComplete) {
            if (!isOnboarding) {
                router.replace(`/onboarding/complete-profile${qs}`)
            }
            return
        }

        // 2. If profile IS complete but they're on onboarding, send to dashboard
        if (isOnboarding && profileComplete) {
            router.replace(`/${qs}`)
            return
        }

        // 3. Backfill organizationMemberId for users on org domains (one-time)
        if (!backfillDone.current && profileComplete) {
            if (tenantParam && tenantParam !== 'ktm') {
                backfillDone.current = true
                fetch(`/api/me?tenant=${tenantParam}`, { method: 'PATCH' }).catch(() => { })
            }
        }

        // 4. Role-Based Redirect from Root
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

            // Append tenant param (handle existing query string in redirectTo)
            if (qs) {
                redirectTo += redirectTo.includes('?') ? `&tenant=${tenantParam}` : qs
            }
            router.replace(redirectTo)
        }

    }, [isLoaded, user, dbUser, pathname, router, searchParams])

    return <>{children}</>
}
