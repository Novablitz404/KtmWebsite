'use server'

import { createServerClient as createSupabaseServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

/**
 * Create a Supabase server client that reads session from cookies.
 * Used in server components, server actions, and API routes.
 */
export async function createServerClient() {
    const cookieStore = await cookies()

    return createSupabaseServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options })
                    } catch {
                        // set() fails in Server Components — safe to ignore
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options })
                    } catch {
                        // remove() fails in Server Components — safe to ignore
                    }
                },
            },
        }
    )
}

/**
 * Get the currently authenticated user from Supabase + DB.
 * Direct replacement for Clerk's `currentUser()`.
 * 
 * Returns the DB User record or null if not authenticated.
 */
export async function getAuthUser() {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    // Look up DB user by clerkId (which now stores the Supabase Auth UUID)
    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
    })

    return dbUser
}

/**
 * Fix A — Get both the Supabase session id AND the DB user in one call.
 *
 * `getAuthUser()` returns null both when there is no session AND when there is
 * a valid session but no DB row yet (incomplete onboarding). Callers that need
 * to tell those two cases apart — e.g. to redirect a half-onboarded user back
 * to the profile form instead of bouncing them to /sign-in — use this.
 *
 * `needsOnboarding` is true when a session exists but the profile isn't done:
 * either there's no DB row, or the row is still flagged `INCOMPLETE`.
 */
export async function getAuthState() {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { authUserId: null, dbUser: null, needsOnboarding: false }

    const dbUser = await prisma.user.findUnique({ where: { clerkId: user.id } })
    const needsOnboarding = !dbUser || dbUser.onboardingStatus === 'INCOMPLETE'

    return { authUserId: user.id, dbUser, needsOnboarding }
}

/**
 * Get just the Supabase auth session user ID (without DB lookup).
 * Useful for middleware and quick auth checks.
 */
export async function getAuthUserId(): Promise<string | null> {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id || null
}
