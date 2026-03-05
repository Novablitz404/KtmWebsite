import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr'

/**
 * Create a Supabase browser client for client components.
 * This is a singleton — safe to call multiple times.
 */
export function createBrowserClient() {
    return createSupabaseBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
}
