import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client using the IMPLICIT auth flow.
 * Used ONLY for password reset so that recovery links work cross-device
 * (e.g. forgot password on laptop, open link on mobile).
 * 
 * Do NOT use this client for normal sign-in/sign-up — those use the
 * PKCE flow via @supabase/ssr for better security.
 */
export function createImplicitClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            auth: {
                flowType: 'implicit',
                autoRefreshToken: true,
                detectSessionInUrl: true,
            },
        }
    )
}
