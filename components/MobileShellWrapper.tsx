'use client'

import { useEffect, useState } from 'react'
import MobileAppShell from './MobileAppShell'
import { useMobilePWA } from '@/hooks/usePWA'

interface MobileShellWrapperProps {
    children: React.ReactNode
}

export default function MobileShellWrapper({ children }: MobileShellWrapperProps) {
    const [role, setRole] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const isMobilePWA = useMobilePWA()

    useEffect(() => {
        // Only fetch role if we're in mobile PWA mode
        if (isMobilePWA) {
            fetch('/api/user/role')
                .then(res => res.json())
                .then(data => {
                    setRole(data.role || null)
                    setIsLoading(false)
                })
                .catch(() => {
                    setIsLoading(false)
                })
        } else {
            setIsLoading(false)
        }
    }, [isMobilePWA])

    // Don't apply mobile shell until we know the role (prevents flash)
    if (isLoading && isMobilePWA) {
        return <>{children}</>
    }

    return (
        <MobileAppShell role={role}>
            {children}
        </MobileAppShell>
    )
}
