'use client'

import { usePathname } from 'next/navigation'
import BottomTabBar from './BottomTabBar'

interface MobileAppShellProps {
    children: React.ReactNode
    role: string | null
    userId: string | null
    isMobile: boolean
}

// Pages that should NOT show the bottom tab bar or shell styling
const EXCLUDED_PATHS = [
    '/',
    '/sign-in',
    '/sign-up',
    '/onboarding',
    '/admin',
]

export default function MobileAppShell({ children, role, userId, isMobile }: MobileAppShellProps) {
    const pathname = usePathname()

    // Check if current path should exclude the tab bar
    const shouldShowTabBar = !EXCLUDED_PATHS.some(path => pathname?.startsWith(path))

    // Don't render mobile shell for desktop users
    if (!isMobile) {
        return <>{children}</>
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Main content with bottom padding for tab bar (4rem + extra for floating circle) */}
            <main className={shouldShowTabBar ? 'pb-24' : ''}>
                {children}
            </main>

            {/* Bottom Tab Bar - show for all logged-in mobile users */}
            {shouldShowTabBar && (
                <BottomTabBar role={role} userId={userId} />
            )}
        </div>
    )
}
