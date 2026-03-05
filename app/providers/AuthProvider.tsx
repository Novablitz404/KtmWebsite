'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import type { User as SupabaseUser, Session } from '@supabase/supabase-js'

interface DbUser {
    id: string
    clerkId: string | null
    email: string
    role: string
    name: string | null
    imageUrl: string | null
    belt: string | null
    gender: string | null
    clubName: string | null
    organizationMemberId: string | null
}

interface AuthContextType {
    /** Supabase auth user (raw) */
    user: SupabaseUser | null
    /** DB user record */
    dbUser: DbUser | null
    /** True once auth state is resolved */
    isLoaded: boolean
    /** Sign out and redirect */
    signOut: () => Promise<void>
    /** Refresh the DB user from API */
    refreshDbUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    dbUser: null,
    isLoaded: false,
    signOut: async () => { },
    refreshDbUser: async () => { },
})

export function useAuth() {
    return useContext(AuthContext)
}

/**
 * Compatibility hook — drop-in for code that used Clerk's useUser().
 * Returns { user, isLoaded } where user has similar shape.
 */
export function useUser() {
    const { user, dbUser, isLoaded } = useAuth()

    if (!user || !dbUser) {
        return { user: null, isLoaded }
    }

    return {
        user: {
            id: user.id,
            fullName: dbUser.name,
            firstName: dbUser.name?.split(' ')[0] || null,
            lastName: dbUser.name?.split(' ').slice(1).join(' ') || null,
            emailAddresses: [{ emailAddress: dbUser.email }],
            imageUrl: dbUser.imageUrl,
            hasImage: !!dbUser.imageUrl,
            publicMetadata: {
                role: dbUser.role,
            },
            // Supabase-compatible reload (re-fetches DB user)
            reload: async () => { },
        },
        isLoaded,
    }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [supabase] = useState(() => createBrowserClient())
    const [user, setUser] = useState<SupabaseUser | null>(null)
    const [dbUser, setDbUser] = useState<DbUser | null>(null)
    const [isLoaded, setIsLoaded] = useState(false)

    const fetchDbUser = useCallback(async () => {
        try {
            const res = await fetch('/api/me')
            if (res.ok) {
                const json = await res.json()
                setDbUser(json.data ?? json)
            } else {
                setDbUser(null)
            }
        } catch {
            setDbUser(null)
        }
    }, [])

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null)
            if (session?.user) {
                fetchDbUser().then(() => setIsLoaded(true))
            } else {
                setIsLoaded(true)
            }
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                setUser(session?.user ?? null)
                if (session?.user) {
                    await fetchDbUser()
                } else {
                    setDbUser(null)
                }
                setIsLoaded(true)
            }
        )

        return () => subscription.unsubscribe()
    }, [supabase, fetchDbUser])

    const signOut = async () => {
        await supabase.auth.signOut()
        setUser(null)
        setDbUser(null)
        window.location.href = '/'
    }

    return (
        <AuthContext.Provider value={{ user, dbUser, isLoaded, signOut, refreshDbUser: fetchDbUser }}>
            {children}
        </AuthContext.Provider>
    )
}
