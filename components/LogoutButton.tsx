'use client'

import { useClerk } from '@clerk/nextjs'
import { useState } from 'react'

export default function LogoutButton() {
    const { signOut } = useClerk()
    const [isLoggingOut, setIsLoggingOut] = useState(false)

    const handleLogout = async () => {
        setIsLoggingOut(true)
        try {
            await signOut()
            // Force a hard refresh/navigation to the sign-in page to clear any PWA state
            window.location.href = '/sign-in'
        } catch (error) {
            console.error('Logout error:', error)
            // Even if it fails, try to redirect
            window.location.href = '/sign-in'
        }
    }

    return (
        <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-red-50 text-red-600 font-medium text-sm hover:bg-red-100 active:scale-[0.98] transition-all border border-red-100 ${isLoggingOut ? 'opacity-50 cursor-not-allowed' : ''
                }`}
        >
            {isLoggingOut ? (
                <span className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
            ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
            )}
            {isLoggingOut ? 'Signing out...' : 'Sign Out'}
        </button>
    )
}
