'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import BottomTabBar from './BottomTabBar'
import { useMobilePWA } from '@/hooks/usePWA'

interface MobileAppShellProps {
    children: React.ReactNode
    role: string | null
}

// Pages that should NOT show the bottom tab bar
const EXCLUDED_PATHS = [
    '/sign-in',
    '/sign-up',
    '/onboarding',
    '/admin',
    '/attendance/kiosk',
]

export default function MobileAppShell({ children, role }: MobileAppShellProps) {
    const isMobilePWA = useMobilePWA()
    const pathname = usePathname()

    // Check if current path should exclude the tab bar
    const shouldShowTabBar = !EXCLUDED_PATHS.some(path => pathname?.startsWith(path))

    // Only render mobile shell for PWA on mobile devices
    if (!isMobilePWA) {
        return <>{children}</>
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Main content with bottom padding for tab bar */}
            <main className={shouldShowTabBar ? 'pb-[calc(3.5rem+env(safe-area-inset-bottom))]' : ''}>
                {children}
            </main>

            {/* Bottom Tab Bar */}
            {shouldShowTabBar && role && (
                <BottomTabBar role={role} />
            )}
        </div>
    )
}
