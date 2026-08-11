'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { useAuth } from '@/app/providers/AuthProvider'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

// Domain → tenant mapping (mirrors proxy.ts)
const DOMAIN_TENANT: Record<string, string> = {
    'tap-elite.com': 'tap-elite',
    'www.tap-elite.com': 'tap-elite',
    'wo-tf.com': 'wotf-global',
    'www.wo-tf.com': 'wotf-global',
}

/**
 * This component wraps page content and handles:
 * 1. Redirecting to onboarding if profile is incomplete
 * 2. Role-based redirects from home page
 * 3. Backfilling organizationMemberId for existing users on org domains
 * 4. Force password change prompt after admin-initiated resets (tenant-aware UI)
 *
 * Uses Supabase auth + DB user data from AuthProvider.
 */
export default function AuthLoadingWrapper({ children }: { children: React.ReactNode }) {
    const { user, dbUser, isLoaded, refreshDbUser } = useAuth()
    const pathname = usePathname()
    const router = useRouter()
    const searchParams = useSearchParams()
    const backfillDone = useRef(false)

    // Force change password modal state
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')

    // Preserve tenant query param across redirects
    // Also detect from hostname for domain-based access (e.g. wo-tf.com)
    const tenantParam = searchParams.get('tenant')
    const detectedTenant = useMemo(() => {
        if (tenantParam) return tenantParam
        if (typeof window !== 'undefined') {
            return DOMAIN_TENANT[window.location.hostname] || null
        }
        return null
    }, [tenantParam])
    const qs = detectedTenant ? `?tenant=${detectedTenant}` : ''

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

        // 3. Check mustChangePassword flag — show modal
        if (dbUser.mustChangePassword && !showPasswordModal) {
            setShowPasswordModal(true)
        }

        // 4. Backfill organizationMemberId for users on org domains (one-time)
        if (!backfillDone.current && profileComplete) {
            if (detectedTenant && detectedTenant !== 'ktm') {
                backfillDone.current = true
                fetch(`/api/me?tenant=${detectedTenant}`, { method: 'PATCH' }).catch(() => { })
            }
        }

        // 5. Role-Based Redirect from Root
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
                redirectTo += redirectTo.includes('?') ? `&tenant=${detectedTenant}` : qs
            }
            router.replace(redirectTo)
        }

    }, [isLoaded, user, dbUser, pathname, router, searchParams])

    // ─── Password modal handlers ────────────────────────────────────
    const handleKeepPassword = async () => {
        setIsSubmitting(true)
        setError('')
        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'keep' }),
            })
            if (!res.ok) throw new Error('Failed')
            await refreshDbUser()
            setShowPasswordModal(false)
        } catch {
            setError('Something went wrong. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleChangePassword = async (newPassword: string) => {
        setError('')
        setIsSubmitting(true)
        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'change', newPassword }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed')
            await refreshDbUser()
            setShowPasswordModal(false)
        } catch (err: any) {
            setError(err.message || 'Something went wrong.')
        } finally {
            setIsSubmitting(false)
        }
    }

    // ─── Render tenant-appropriate modal ─────────────────────────────
    const renderPasswordModal = () => {
        if (!showPasswordModal) return null

        const modalProps = {
            onKeep: handleKeepPassword,
            onChange: handleChangePassword,
            error,
            setError,
            isSubmitting,
        }

        // WOTF Global — dark themed modal
        if (detectedTenant === 'wotf-global') {
            const WOTFGlobalModal = require('@/components/modals/WOTFGlobalChangePasswordModal').default
            return <WOTFGlobalModal {...modalProps} />
        }

        // KTM default — white/gray modal
        const KTMModal = require('@/components/modals/KTMChangePasswordModal').default
        return <KTMModal {...modalProps} />
    }

    return (
        <>
            {children}
            {renderPasswordModal()}
        </>
    )
}
