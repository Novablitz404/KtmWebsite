'use client'

import { useEffect } from 'react'

/**
 * Detects Supabase implicit-flow recovery tokens in the URL hash
 * and redirects to the reset password page.
 * 
 * This handles the case where a password reset is triggered from
 * the Supabase dashboard (where redirectTo defaults to the Site URL).
 * The tokens arrive at the home page hash — this component detects
 * them and redirects to /sign-in/reset-password with the hash intact.
 */
export default function RecoveryRedirect() {
    useEffect(() => {
        const hash = window.location.hash
        if (hash && hash.includes('type=recovery')) {
            // Already on the reset password page — don't redirect
            if (window.location.pathname === '/sign-in/reset-password') return

            // Redirect to reset password page, preserving the hash tokens
            window.location.replace(`/sign-in/reset-password${hash}`)
        }
    }, [])

    return null
}
