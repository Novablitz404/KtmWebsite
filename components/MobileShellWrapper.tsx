'use client'

import { useEffect, useState } from 'react'
import MobileAppShell from './MobileAppShell'

interface MobileShellWrapperProps {
    children: React.ReactNode
}

export default function MobileShellWrapper({ children }: MobileShellWrapperProps) {
    const [isMobile, setIsMobile] = useState(false)
    const [role, setRole] = useState<string | null>(null)
    const [userId, setUserId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const mobile = window.innerWidth < 768
        setIsMobile(mobile)

        // Fetch role for ALL mobile users (not just PWA)
        if (mobile) {
            fetch('/api/user/role')
                .then(res => res.json())
                .then(data => {
                    setRole(data.role || null)
                    setUserId(data.id || null)
                })
                .catch(() => {
                    // Not logged in or error
                })
                .finally(() => setIsLoading(false))
        } else {
            setIsLoading(false)
        }
    }, [])

    // Don't apply mobile shell until we know the role (prevents flash)
    if (isLoading && isMobile) {
        return <>{children}</>
    }

    return (
        <MobileAppShell role={role} userId={userId} isMobile={isMobile}>
            {children}
        </MobileAppShell>
    )
}
